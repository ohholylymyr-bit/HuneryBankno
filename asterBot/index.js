require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const chokidar = require('chokidar');
const { WebSocketServer } = require('ws');

const AsterDexAdapter = require('./exchange/asterdex');
const { loadMultiTimeframeHistory } = require('./data/history');
const { buildTradeFeatures } = require('./core/strategy');
const { scoreTrade } = require('./core/scorer');
const { optimizeSettings } = require('./ai/optimizer');
const { suggestPositionAction } = require('./ai/prediction');
const RiskManager = require('./core/riskManager');
const PaperEngine = require('./paper/paperEngine');
const PortfolioManager = require('./portfolio/portfolioManager');
const TradeExecutor = require('./core/tradeExecutor');
const { runBacktest } = require('./backtest/backtester');
const Notifier = require('./alerts/notifier');
const { logger, summarizeActions } = require('./logs/logger');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'ui')));

const configPath = path.join(__dirname, 'config.json');
let config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const exchange = new AsterDexAdapter(config.exchange);
const paper = new PaperEngine(config);
const riskManager = new RiskManager(config);
const portfolio = new PortfolioManager(config.riskAllocation);
const notifier = new Notifier(config.alerts);
const executor = new TradeExecutor({
  mode: config.mode,
  exchange,
  paperEngine: paper,
  notifier,
  portfolioManager: portfolio,
  hedgingEnabled: config.optionalHedging
});

const state = {
  running: false,
  mode: config.mode,
  uiOverrideRisk: config.baseRiskPct,
  uiOverrideScore: config.defaultScoreThreshold,
  trailing: true,
  lastScore: 0,
  lastDecision: null,
  lastIndicators: null,
  ai: { marketMode: 'SIDEWAYS', profile: 'SAFE' }
};

let timer;
let broadcast = () => {};
let pushState = () => {};

function hotReloadConfig() {
  chokidar.watch(configPath, { ignoreInitial: true }).on('change', () => {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      logger.info('config reloaded');
    } catch (e) {
      logger.error({ err: e.message }, 'failed to reload config');
    }
  });
}

async function evaluatePair(symbol) {
  const dataset = await loadMultiTimeframeHistory(exchange, symbol, config.timeframes, 450);
  const decision = buildTradeFeatures(dataset);

  const lastPrice = dataset['5m'].at(-1).close;
  const optimized = optimizeSettings({
    indicators: { ...decision.indicators, lastPrice },
    performance: riskManager.state,
    semiAggressive: config.semiAggressive
  }, config);

  const threshold = state.uiOverrideScore ?? optimized.threshold;
  const riskPct = state.uiOverrideRisk ?? optimized.riskPct;
  const scored = scoreTrade(decision.features, config.weights, threshold);

  state.lastScore = scored.score;
  state.lastDecision = decision;
  state.lastIndicators = decision.indicators;
  state.ai = { marketMode: optimized.marketMode, profile: optimized.profile };

  const can = riskManager.canTrade(paper.getBalance());
  if (!can.ok) return { action: 'SKIPPED', reason: can.reason };

  if (decision.signal === 'NONE' || !scored.passed) {
    return { action: 'SKIPPED', reason: `signal=${decision.signal}, score=${scored.score}` };
  }

  const stops = riskManager.buildStops(lastPrice, decision.signal, decision.indicators.atr, optimized.atrMultipliers);
  const allocation = portfolio.allocationFor(symbol);
  const qty = riskManager.positionSize(paper.getBalance() * allocation, riskPct, lastPrice, stops.stopLoss);
  if (!qty || qty <= 0) return { action: 'SKIPPED', reason: 'qty below min sizing' };

  const open = executor.getOpenPosition(symbol);
  if (open) {
    if (state.trailing) {
      if (open.side === 'LONG') open.stopLoss = Math.max(open.stopLoss, lastPrice - stops.trailingGap);
      else open.stopLoss = Math.min(open.stopLoss, lastPrice + stops.trailingGap);
    }

    const aiSuggestion = suggestPositionAction(open, optimized.marketMode, lastPrice, decision.indicators.atr);
    const hitSL = open.side === 'LONG' ? lastPrice <= open.stopLoss : lastPrice >= open.stopLoss;
    const hitTP2 = open.side === 'LONG' ? lastPrice >= open.takeProfit2 : lastPrice <= open.takeProfit2;

    if (hitSL || hitTP2 || aiSuggestion.action === 'CUT_EARLY') {
      const closed = await executor.executeExit(symbol, lastPrice, hitSL ? 'SL' : hitTP2 ? 'TP2' : 'AI_CUT');
      riskManager.updateAfterTrade(closed?.pnl || 0);
      return { action: 'EXIT', reason: hitSL ? 'Stop hit' : hitTP2 ? 'TP2 hit' : aiSuggestion.reason, pnl: closed?.pnl || 0 };
    }

    return { action: 'HOLD', reason: aiSuggestion.reason };
  }

  await executor.executeEntry({
    symbol,
    side: decision.signal,
    qty,
    entryPrice: lastPrice,
    stops,
    leverage: optimized.leverage
  });

  return { action: 'ENTRY', reason: `${decision.signal} score=${scored.score}` };
}

async function engineLoop() {
  if (!state.running) return;

  for (const pair of config.pairs) {
    try {
      const result = await evaluatePair(pair);
      logger.info({ pair, result }, 'tick_result');
      broadcast({ type: 'log', payload: `${pair} ${result.action}: ${result.reason}` });
      if (result.action === 'ENTRY' || result.action === 'EXIT') {
        broadcast({ type: 'alert', payload: `${pair} ${result.action} ${result.reason}` });
      }
    } catch (e) {
      logger.error({ pair, err: e.message }, 'tick_error');
      broadcast({ type: 'log', payload: `${pair} ERROR: ${e.message}` });
    }
  }

  pushState();
}

async function runBacktestMode() {
  const data = await loadMultiTimeframeHistory(exchange, config.basePair, config.timeframes, 1200);
  const optimized = optimizeSettings({
    indicators: { ...buildTradeFeatures(data).indicators, lastPrice: data['5m'].at(-1).close },
    performance: { lossStreak: 0 },
    semiAggressive: config.semiAggressive
  }, config);
  const report = runBacktest(data, config, optimized);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report.summary, null, 2));
}

app.post('/control', (req, res) => {
  const { action, mode, risk, score, trailing, maxTrades } = req.body;
  if (mode) {
    state.mode = mode;
    executor.setMode(mode);
  }
  if (risk) state.uiOverrideRisk = risk;
  if (score) state.uiOverrideScore = score;
  if (typeof trailing === 'boolean') state.trailing = trailing;
  if (maxTrades) config.maxTradesPerDay = maxTrades;

  if (action === 'start') {
    state.running = true;
    if (!timer) timer = setInterval(engineLoop, 15_000);
  }
  if (action === 'stop') {
    state.running = false;
    clearInterval(timer);
    timer = null;
  }

  res.json({ ok: true, state });
});

app.get('/summary', (req, res) => {
  res.json({
    daily: summarizeActions('daily'),
    weekly: summarizeActions('weekly'),
    monthly: summarizeActions('monthly'),
    portfolio: portfolio.getStats()
  });
});

async function startServer() {
  const server = app.listen(Number(process.env.PORT || 3000), () => {
    logger.info(`AsterBot running on port ${process.env.PORT || 3000}`);
  });

  const wss = new WebSocketServer({ server });
  broadcast = function broadcastToClients(data) {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(JSON.stringify(data));
    });
  };

  pushState = function emitState() {
    const positions = paper.getPositions();
    const stats = portfolio.getStats();
    const statValues = Object.values(stats);
    const winRate = statValues.length
      ? statValues.reduce((a, b) => a + b.winRate, 0) / statValues.length
      : 0;

    broadcast({
      type: 'state',
      payload: {
        mode: state.mode,
        balance: paper.getBalance().toFixed(2),
        openPositions: positions.length,
        winRate,
        score: state.lastScore,
        aiProfile: state.ai.profile,
        marketMode: state.ai.marketMode,
        indicators: {
          ema20: state.lastIndicators?.ema20 || 0,
          ema50: state.lastIndicators?.ema50 || 0,
          ema200: state.lastIndicators?.ema200 || 0,
          atr: state.lastIndicators?.atr || 0,
          rsi: state.lastIndicators?.rsi || 0,
          pattern: Object.entries(state.lastIndicators?.pattern || {})
            .filter(([, v]) => typeof v === 'boolean' && v)
            .map(([k]) => k)
            .join(', ') || 'none'
        }
      }
    });
  };

  wss.on('connection', () => pushState());
  hotReloadConfig();
}

if (process.argv.includes('--backtest')) {
  runBacktestMode().then(() => process.exit(0)).catch((err) => {
    logger.error({ err: err.message }, 'backtest_failed');
    process.exit(1);
  });
} else {
  startServer();
}

const { buildTradeFeatures } = require('../core/strategy');
const { scoreTrade } = require('../core/scorer');
const RiskManager = require('../core/riskManager');

function computeMetrics(trades, equityCurve) {
  const wins = trades.filter((t) => t.pnl > 0).length;
  const losses = trades.filter((t) => t.pnl <= 0);
  const grossProfit = trades.filter((t) => t.pnl > 0).reduce((a, b) => a + b.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b.pnl, 0));

  let peak = equityCurve[0] || 0;
  let maxDrawdown = 0;
  let lossStreak = 0;
  let maxLossStreak = 0;

  equityCurve.forEach((v) => {
    peak = Math.max(peak, v);
    const dd = peak - v;
    maxDrawdown = Math.max(maxDrawdown, dd);
  });

  trades.forEach((t) => {
    lossStreak = t.pnl <= 0 ? lossStreak + 1 : 0;
    maxLossStreak = Math.max(maxLossStreak, lossStreak);
  });

  return {
    trades: trades.length,
    winRate: trades.length ? (wins / trades.length) * 100 : 0,
    drawdown: maxDrawdown,
    profitFactor: grossLoss ? grossProfit / grossLoss : 0,
    maxConsecutiveLosses: maxLossStreak
  };
}

function runBacktest(dataset, config, optimized) {
  const riskManager = new RiskManager(config);
  const trades = [];
  const equity = [config.startingBalance];
  let balance = config.startingBalance;

  const primary = dataset['5m'];
  for (let i = 220; i < primary.length; i += 1) {
    const sample = {};
    Object.keys(dataset).forEach((tf) => {
      const tfLen = Math.min(i, dataset[tf].length);
      sample[tf] = dataset[tf].slice(0, tfLen);
    });

    const decision = buildTradeFeatures(sample);
    const scored = scoreTrade(decision.features, config.weights, optimized.threshold);
    if (!scored.passed || decision.signal === 'NONE') continue;

    const entry = sample['5m'].at(-1).close;
    const stops = riskManager.buildStops(entry, decision.signal, decision.indicators.atr, optimized.atrMultipliers);
    const qty = riskManager.positionSize(balance, optimized.riskPct, entry, stops.stopLoss);
    const dir = decision.signal === 'LONG' ? 1 : -1;
    const future = primary.slice(i, i + 12);
    let pnl = 0;

    for (const c of future) {
      if (dir === 1 && c.low <= stops.stopLoss) { pnl = (stops.stopLoss - entry) * qty; break; }
      if (dir === -1 && c.high >= stops.stopLoss) { pnl = (entry - stops.stopLoss) * qty; break; }
      if (dir === 1 && c.high >= stops.takeProfit2) { pnl = (stops.takeProfit2 - entry) * qty; break; }
      if (dir === -1 && c.low <= stops.takeProfit2) { pnl = (entry - stops.takeProfit2) * qty; break; }
    }

    if (pnl === 0) {
      const close = future.at(-1)?.close || entry;
      pnl = dir === 1 ? (close - entry) * qty : (entry - close) * qty;
    }

    balance += pnl;
    equity.push(balance);
    trades.push({ ts: sample['5m'].at(-1).time, pnl });
    riskManager.updateAfterTrade(pnl);
  }

  return {
    summary: computeMetrics(trades, equity),
    trades,
    equity
  };
}

module.exports = { runBacktest };

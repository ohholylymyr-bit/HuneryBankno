const marketProfiles = {
  "BTC/USDT": { price: 64200, volatility: 0.012, trend: 0.58 },
  "ETH/USDT": { price: 3400, volatility: 0.018, trend: 0.54 },
  "SOL/USDT": { price: 145, volatility: 0.032, trend: 0.62 },
  "BNB/USDT": { price: 585, volatility: 0.017, trend: 0.51 },
  "XRP/USDT": { price: 0.52, volatility: 0.026, trend: 0.48 },
  "DOGE/USDT": { price: 0.12, volatility: 0.041, trend: 0.46 },
};

const state = {
  running: false,
  cash: 10000,
  positions: [],
  timer: null,
  lastSignal: null,
};

const $ = (id) => document.getElementById(id);

class MicroInvestmentAI {
  score(candle, settings) {
    const momentum = candle.changePct > 0 ? Math.min(candle.changePct / 2, 1) : candle.changePct / 3;
    const trend = candle.trend * 2 - 1;
    const volumePulse = Math.min((candle.volumeRatio - 1) / 1.8, 1);
    const riskPenalty = Math.max(0, candle.volatility - 0.025) * 9;
    const score = Math.max(-1, Math.min(1, momentum * 0.38 + trend * 0.34 + volumePulse * 0.2 - riskPenalty));
    const confidence = Math.round(Math.abs(score) * 100);
    return {
      symbol: candle.symbol,
      action: score > 0.22 ? "BUY" : score < -0.35 ? "SELL" : "HOLD",
      score,
      confidence,
      reasons: [
        `Momentum ${candle.changePct.toFixed(2)} %`,
        `Trendivoima ${(candle.trend * 100).toFixed(0)} / 100`,
        `Volyymipulssi ${candle.volumeRatio.toFixed(2)}x`,
        `Riskikerroin ${(riskPenalty * 100).toFixed(0)} pistettä`,
      ],
      settings,
    };
  }
}

class AsterDexAdapter {
  constructor(mode, credentials) {
    this.mode = mode;
    this.credentials = credentials;
    this.plugin = new AsterProApiPlugin({
      baseUrl: credentials.apiBase || AsterProApiPlugin.defaults.DEFAULT_PRO_FUTURES_BASE_URL,
      user: credentials.apiUser,
      signer: credentials.apiSigner,
      includeUser: true,
      privateKey: credentials.apiPrivateKey,
    });
  }

  async latestPrice(symbol, fallbackPrice) {
    if (this.mode !== "live") return fallbackPrice;
    const candle = await this.plugin.candle(symbol);
    return Number.isFinite(candle.price) ? candle.price : fallbackPrice;
  }

  async placeOrder(order) {
    if (this.mode === "live") {
      if (!this.credentials.apiBase || !this.credentials.apiUser || !this.credentials.apiSigner) {
        throw new Error("Live-tila vaatii Aster Pro API Base URL-, user wallet- ja signer wallet -osoitteet.");
      }
      const response = await this.plugin.placeMarketOrder({
        symbol: order.symbol,
        side: order.side,
        quantity: order.size,
      });
      return { ...order, id: response.orderId || crypto.randomUUID(), status: response.status || "LIVE_SENT", raw: response };
    }
    return { ...order, id: crypto.randomUUID(), status: "PAPER_FILLED" };
  }
}

const ai = new MicroInvestmentAI();

function readSettings() {
  const symbols = Array.from($("symbol").selectedOptions).map((option) => option.value);
  return {
    mode: $("mode").value,
    symbols: symbols.length ? symbols : ["BTC/USDT"],
    risk: Number($("risk").value),
    maxPositions: Number($("maxPositions").value),
    stopLoss: Number($("stopLoss").value),
    takeProfit: Number($("takeProfit").value),
    apiBase: $("apiBase").value.trim(),
    apiUser: $("apiUser").value.trim(),
    apiSigner: $("apiSigner").value.trim(),
    apiPrivateKey: $("apiPrivateKey").value.trim(),
  };
}

function syntheticCandle(symbol) {
  const profile = marketProfiles[symbol];
  const randomShock = (Math.random() - 0.48) * profile.volatility * profile.price;
  profile.price = Math.max(profile.price + randomShock, profile.price * 0.92);
  return {
    symbol,
    price: profile.price,
    volatility: profile.volatility,
    trend: Math.max(0, Math.min(1, profile.trend + (Math.random() - 0.5) * 0.1)),
    changePct: (randomShock / profile.price) * 100,
    volumeRatio: 0.7 + Math.random() * 1.9,
  };
}

function selectBestSignal(settings) {
  return settings.symbols
    .map((symbol) => ai.score(syntheticCandle(symbol), settings))
    .sort((a, b) => b.score - a.score)[0];
}

async function openPosition(signal, settings) {
  if (state.positions.length >= settings.maxPositions || state.positions.some((position) => position.symbol === signal.symbol)) return;
  const candle = syntheticCandle(signal.symbol);
  const adapter = new AsterDexAdapter(settings.mode, settings);
  candle.price = await adapter.latestPrice(signal.symbol, candle.price);
  const stake = state.cash * (settings.risk / 100);
  const size = stake / candle.price;
  const order = await adapter.placeOrder({ symbol: signal.symbol, side: "BUY", size, price: candle.price });
  state.cash -= stake;
  state.positions.push({ ...order, entry: candle.price, size, openedAt: new Date() });
  addLog(`Avattiin ${settings.mode}-positio: ${signal.symbol} @ ${candle.price.toFixed(4)}`);
}

function managePositions(settings) {
  state.positions = state.positions.filter((position) => {
    const price = syntheticCandle(position.symbol).price;
    const pnlPct = ((price - position.entry) / position.entry) * 100;
    position.lastPrice = price;
    position.pnlPct = pnlPct;
    if (pnlPct <= -settings.stopLoss || pnlPct >= settings.takeProfit || state.lastSignal?.action === "SELL") {
      state.cash += position.size * price;
      addLog(`Suljettiin ${position.symbol}: PnL ${pnlPct.toFixed(2)} %`);
      return false;
    }
    return true;
  });
}

async function tick() {
  const settings = readSettings();
  try {
    const signal = selectBestSignal(settings);
    state.lastSignal = signal;
    renderSignal(signal);
    managePositions(settings);
    if (signal.action === "BUY") await openPosition(signal, settings);
    renderPositions();
    renderPortfolio();
  } catch (error) {
    addLog(error.message);
    stopBot();
  }
}

function renderSignal(signal) {
  $("aiNeedle").style.left = `${(signal.score + 1) * 50}%`;
  $("aiVerdict").textContent = `${signal.symbol}: ${signal.action} (${signal.confidence}% varmuus)`;
  $("aiFactors").innerHTML = signal.reasons.map((reason) => `<li>${reason}</li>`).join("");
}

function renderPositions() {
  if (!state.positions.length) {
    $("positionsBody").innerHTML = '<tr><td colspan="6">Ei avoimia positioita.</td></tr>';
    return;
  }
  $("positionsBody").innerHTML = state.positions.map((position) => `
    <tr>
      <td>${position.symbol}</td><td>${position.side}</td><td>${position.size.toFixed(6)}</td>
      <td>${position.entry.toFixed(4)}</td>
      <td class="${position.pnlPct >= 0 ? "pnl-good" : "pnl-bad"}">${(position.pnlPct || 0).toFixed(2)} %</td>
      <td><button type="button" data-close="${position.id}" class="secondary">Sulje</button></td>
    </tr>`).join("");
}

function renderPortfolio() {
  const positionsValue = state.positions.reduce((sum, position) => sum + position.size * (position.lastPrice || position.entry), 0);
  $("portfolioValue").textContent = `${(state.cash + positionsValue).toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
}

function addLog(message) {
  const item = document.createElement("li");
  item.textContent = `${new Date().toLocaleTimeString("fi-FI")} — ${message}`;
  $("log").prepend(item);
}

function startBot(event) {
  event?.preventDefault();
  const settings = readSettings();
  if (settings.mode === "live" && !confirm("Vahvista live-tila. Aster Pro API -plugin allekirjoittaa EIP-712 toimeksiantoja ja olet vastuussa oikeista toimeksiannoista.")) return;
  state.running = true;
  $("botState").textContent = "Käynnissä";
  $("botState").className = "pill running";
  addLog("Botti käynnistettiin.");
  clearInterval(state.timer);
  tick();
  state.timer = setInterval(tick, 3500);
}

function stopBot() {
  state.running = false;
  clearInterval(state.timer);
  $("botState").textContent = "Pysäytetty";
  $("botState").className = "pill idle";
  addLog("Botti pysäytettiin.");
}

$("botForm").addEventListener("submit", startBot);
$("stopBtn").addEventListener("click", stopBot);
$("positionsBody").addEventListener("click", (event) => {
  const id = event.target.dataset.close;
  if (!id) return;
  const position = state.positions.find((item) => item.id === id);
  if (position) state.cash += position.size * (position.lastPrice || position.entry);
  state.positions = state.positions.filter((item) => item.id !== id);
  addLog(`Käyttäjä sulki position ${position?.symbol}.`);
  renderPositions();
  renderPortfolio();
});

renderPortfolio();

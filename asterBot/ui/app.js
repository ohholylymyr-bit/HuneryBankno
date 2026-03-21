const ws = new WebSocket(`ws://${location.host}`);

const metricsEl = document.getElementById('metrics');
const logsEl = document.getElementById('logs');
const alertsEl = document.getElementById('alerts');
const indicatorsEl = document.getElementById('indicators');

function pushLine(el, text) {
  const p = document.createElement('div');
  p.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  el.prepend(p);
}

ws.onmessage = (evt) => {
  const msg = JSON.parse(evt.data);

  if (msg.type === 'state') {
    const s = msg.payload;
    metricsEl.innerHTML = `
      <div class="kpi"><span>Mode</span><strong>${s.mode}</strong></div>
      <div class="kpi"><span>Balance (paper/live)</span><strong>${s.balance}</strong></div>
      <div class="kpi"><span>Open positions</span><strong>${s.openPositions}</strong></div>
      <div class="kpi"><span>Win rate</span><strong>${s.winRate.toFixed(2)}%</strong></div>
      <div class="kpi"><span>Score</span><strong>${s.score}</strong></div>
      <div class="kpi"><span>AI profile</span><strong>${s.aiProfile}</strong></div>
      <div class="kpi"><span>Market mode</span><strong>${s.marketMode}</strong></div>
    `;

    indicatorsEl.innerHTML = `
      <div class="kpi"><span>EMA20/50/200</span><strong>${s.indicators.ema20.toFixed(5)} / ${s.indicators.ema50.toFixed(5)} / ${s.indicators.ema200.toFixed(5)}</strong></div>
      <div class="kpi"><span>ATR</span><strong>${s.indicators.atr.toFixed(6)}</strong></div>
      <div class="kpi"><span>RSI</span><strong>${s.indicators.rsi.toFixed(2)}</strong></div>
      <div class="kpi"><span>Candle</span><span class="pill">${s.indicators.pattern}</span></div>
    `;
  }

  if (msg.type === 'log') pushLine(logsEl, msg.payload);
  if (msg.type === 'alert') pushLine(alertsEl, msg.payload);
};

function controlPayload() {
  return {
    mode: document.getElementById('modeSelect').value,
    risk: Number(document.getElementById('riskSlider').value),
    score: Number(document.getElementById('scoreSlider').value),
    trailing: document.getElementById('trailingSelect').value === 'true',
    maxTrades: Number(document.getElementById('maxTrades').value)
  };
}

function postControl(action) {
  fetch('/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...controlPayload() })
  });
}

document.getElementById('startBtn').onclick = () => postControl('start');
document.getElementById('stopBtn').onclick = () => postControl('stop');

['modeSelect', 'riskSlider', 'scoreSlider', 'trailingSelect', 'maxTrades'].forEach((id) => {
  document.getElementById(id).addEventListener('change', () => postControl('update'));
});

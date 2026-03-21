function detectMarketMode(indicators) {
  const atrPct = indicators.atr / indicators.lastPrice;
  const emaSpreadPct = Math.abs(indicators.ema20 - indicators.ema50) / indicators.lastPrice;

  if (atrPct > 0.01) return 'VOLATILE';
  if (emaSpreadPct > 0.0035) return 'TREND';
  return 'SIDEWAYS';
}

module.exports = { detectMarketMode };

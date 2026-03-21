function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function scoreTrade(features, weights, threshold) {
  const parts = {
    trend: clamp(features.trend, 0, 100) * weights.trend,
    rsi: clamp(features.rsi, 0, 100) * weights.rsi,
    volume: clamp(features.volume, 0, 100) * weights.volume,
    volatility: clamp(features.volatility, 0, 100) * weights.volatility,
    candle: clamp(features.candle, 0, 100) * weights.candle
  };

  const score = Object.values(parts).reduce((a, b) => a + b, 0);
  return {
    score: Number(score.toFixed(2)),
    passed: score >= threshold,
    parts,
    threshold
  };
}

module.exports = { scoreTrade };

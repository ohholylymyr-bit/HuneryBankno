const { EMA, RSI, ATR } = require('technicalindicators');

function analyzeCandlePattern(last, prev) {
  const body = Math.abs(last.close - last.open);
  const range = last.high - last.low || 1;
  const upperWick = last.high - Math.max(last.close, last.open);
  const lowerWick = Math.min(last.close, last.open) - last.low;

  const doji = body / range < 0.12;
  const pinBarBull = lowerWick > body * 2.2 && upperWick < body;
  const pinBarBear = upperWick > body * 2.2 && lowerWick < body;

  const bullishEngulfing = prev.close < prev.open && last.close > last.open && last.close > prev.open && last.open < prev.close;
  const bearishEngulfing = prev.close > prev.open && last.close < last.open && last.open > prev.close && last.close < prev.open;

  return {
    doji,
    pinBarBull,
    pinBarBear,
    bullishEngulfing,
    bearishEngulfing,
    strength: bullishEngulfing || pinBarBull ? 85 : bearishEngulfing || pinBarBear ? 70 : doji ? 50 : 65
  };
}

function calcIndicators(candles) {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);

  const ema20 = EMA.calculate({ period: 20, values: closes }).at(-1);
  const ema50 = EMA.calculate({ period: 50, values: closes }).at(-1);
  const ema200 = EMA.calculate({ period: 200, values: closes }).at(-1);
  const rsi = RSI.calculate({ period: 14, values: closes }).at(-1);
  const atr = ATR.calculate({ period: 14, high: highs, low: lows, close: closes }).at(-1);

  const volAvg = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const volNow = volumes.at(-1);

  return { ema20, ema50, ema200, rsi, atr, volAvg, volNow };
}

function buildTradeFeatures(tfData) {
  const primary = tfData['5m'];
  const highTf = tfData['1h'];
  const higher = tfData['4h'];
  const ind = calcIndicators(primary);
  const highInd = calcIndicators(highTf);
  const higherInd = calcIndicators(higher);

  const last = primary.at(-1);
  const prev = primary.at(-2);
  const pattern = analyzeCandlePattern(last, prev);

  const upTrend = ind.ema20 > ind.ema50 && ind.ema50 > ind.ema200;
  const downTrend = ind.ema20 < ind.ema50 && ind.ema50 < ind.ema200;

  const htfConfirmBull = highInd.ema50 > highInd.ema200 && higherInd.ema50 > higherInd.ema200;
  const htfConfirmBear = highInd.ema50 < highInd.ema200 && higherInd.ema50 < higherInd.ema200;

  const pullbackTo50 = Math.abs((last.close - ind.ema50) / ind.ema50) < 0.0035;
  const breakout = (last.high - prev.high) > ind.atr * 0.7 || (prev.low - last.low) > ind.atr * 0.7;

  const trendScore = upTrend || downTrend ? 84 : 40;
  const rsiScore = ind.rsi > 45 && ind.rsi < 68 ? 82 : ind.rsi >= 30 && ind.rsi <= 75 ? 68 : 45;
  const volumeScore = ind.volNow > ind.volAvg * 1.25 ? 88 : ind.volNow > ind.volAvg ? 70 : 48;
  const volatilityScore = ind.atr / last.close > 0.0018 && ind.atr / last.close < 0.012 ? 83 : 52;

  const side = upTrend && htfConfirmBull && pullbackTo50 && (pattern.bullishEngulfing || pattern.pinBarBull || breakout)
    ? 'LONG'
    : downTrend && htfConfirmBear && pullbackTo50 && (pattern.bearishEngulfing || pattern.pinBarBear || breakout)
      ? 'SHORT'
      : 'NONE';

  return {
    signal: side,
    indicators: { ...ind, pattern, pullbackTo50, breakout },
    features: {
      trend: trendScore,
      rsi: rsiScore,
      volume: volumeScore,
      volatility: volatilityScore,
      candle: pattern.strength
    }
  };
}

module.exports = {
  buildTradeFeatures,
  calcIndicators
};

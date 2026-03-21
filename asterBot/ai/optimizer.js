const { detectMarketMode } = require('./marketMode');

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function optimizeSettings(context, config) {
  const mode = detectMarketMode(context.indicators);
  const semi = context.semiAggressive;

  let threshold = config.defaultScoreThreshold;
  let riskPct = config.baseRiskPct;
  let atrMult = { ...config.atrMultipliers };
  let leverage = 1;

  if (mode === 'TREND') {
    threshold -= semi ? 3 : 1;
    riskPct += semi ? 0.35 : 0.15;
    atrMult.trailing *= semi ? 0.9 : 1;
    leverage = semi ? 2 : 1.5;
  } else if (mode === 'SIDEWAYS') {
    threshold += semi ? 2 : 4;
    riskPct -= 0.2;
    atrMult.sl *= 0.9;
    leverage = 1;
  } else {
    threshold += semi ? 5 : 7;
    riskPct -= semi ? 0.15 : 0.3;
    atrMult.sl *= 1.2;
    atrMult.trailing *= 1.1;
    leverage = semi ? 1.3 : 1;
  }

  if (context.performance?.lossStreak >= 2) {
    threshold += 3;
    riskPct -= 0.2;
  }

  threshold = clamp(threshold, config.minScoreThreshold, config.maxScoreThreshold);
  riskPct = clamp(riskPct, config.riskRangePct[0], config.riskRangePct[1]);

  return {
    marketMode: mode,
    threshold,
    riskPct,
    atrMultipliers: atrMult,
    leverage,
    profile: semi ? 'SEMI_AGGRESSIVE' : 'SAFE'
  };
}

module.exports = { optimizeSettings };

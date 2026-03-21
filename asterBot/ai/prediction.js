function suggestPositionAction(position, marketMode, latestPrice, atr) {
  if (!position) return { action: 'HOLD', reason: 'No open position' };

  const unrealizedPct = ((latestPrice - position.entryPrice) / position.entryPrice) * (position.side === 'LONG' ? 100 : -100);

  if (marketMode === 'VOLATILE' && unrealizedPct < -0.6) {
    return { action: 'CUT_EARLY', reason: 'Volatile mode with adverse move' };
  }

  const nearStop = position.side === 'LONG'
    ? latestPrice < position.stopLoss + atr * 0.2
    : latestPrice > position.stopLoss - atr * 0.2;

  if (nearStop) {
    return { action: 'CUT_EARLY', reason: 'Price approaching stop-loss zone' };
  }

  if (unrealizedPct > 1.0) {
    return { action: 'HOLD', reason: 'Momentum favorable; trailing should manage exits' };
  }

  return { action: 'HOLD', reason: 'Risk/reward still acceptable' };
}

module.exports = { suggestPositionAction };

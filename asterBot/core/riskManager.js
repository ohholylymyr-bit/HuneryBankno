class RiskManager {
  constructor(config) {
    this.config = config;
    this.state = {
      date: new Date().toISOString().slice(0, 10),
      tradesToday: 0,
      dailyPnl: 0,
      lossStreak: 0,
      paused: false
    };
  }

  resetIfNewDay() {
    const now = new Date().toISOString().slice(0, 10);
    if (this.state.date !== now) {
      this.state = { date: now, tradesToday: 0, dailyPnl: 0, lossStreak: 0, paused: false };
    }
  }

  canTrade(balance) {
    this.resetIfNewDay();
    if (this.state.paused) return { ok: false, reason: 'Trading paused due to losses/limits' };
    if (this.state.tradesToday >= this.config.maxTradesPerDay) return { ok: false, reason: 'Daily trade limit reached' };

    const dailyLossLimit = -(balance * (this.config.dailyLossLimitPct / 100));
    if (this.state.dailyPnl <= dailyLossLimit) {
      this.state.paused = true;
      return { ok: false, reason: 'Daily loss limit hit' };
    }

    if (this.state.lossStreak >= this.config.maxConsecutiveLosses) {
      this.state.paused = true;
      return { ok: false, reason: 'Max consecutive losses reached' };
    }
    return { ok: true };
  }

  positionSize(balance, riskPct, entry, stop) {
    const riskCapital = balance * (riskPct / 100);
    const stopDistance = Math.abs(entry - stop);
    if (stopDistance <= 0) return 0;
    return Number((riskCapital / stopDistance).toFixed(4));
  }

  buildStops(entryPrice, side, atr, atrMultipliers) {
    const dir = side === 'LONG' ? 1 : -1;
    const sl = entryPrice - dir * atr * atrMultipliers.sl;
    const tp1 = entryPrice + dir * atr * atrMultipliers.tp1;
    const tp2 = entryPrice + dir * atr * atrMultipliers.tp2;
    const trailingGap = atr * atrMultipliers.trailing;

    return {
      stopLoss: Number(sl.toFixed(6)),
      takeProfit1: Number(tp1.toFixed(6)),
      takeProfit2: Number(tp2.toFixed(6)),
      trailingGap: Number(trailingGap.toFixed(6))
    };
  }

  updateAfterTrade(realizedPnl) {
    this.state.tradesToday += 1;
    this.state.dailyPnl += realizedPnl;
    this.state.lossStreak = realizedPnl < 0 ? this.state.lossStreak + 1 : 0;
  }
}

module.exports = RiskManager;

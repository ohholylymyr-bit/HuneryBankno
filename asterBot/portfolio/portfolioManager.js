class PortfolioManager {
  constructor(riskAllocation = {}) {
    this.riskAllocation = riskAllocation;
    this.pairStats = new Map();
  }

  allocationFor(pair) {
    return this.riskAllocation[pair] || 0.1;
  }

  updatePairStats(pair, pnl, win) {
    const curr = this.pairStats.get(pair) || { pnl: 0, trades: 0, wins: 0 };
    curr.pnl += pnl;
    curr.trades += 1;
    curr.wins += win ? 1 : 0;
    curr.winRate = curr.trades ? (curr.wins / curr.trades) * 100 : 0;
    this.pairStats.set(pair, curr);
    return curr;
  }

  getStats() {
    return Object.fromEntries(this.pairStats.entries());
  }
}

module.exports = PortfolioManager;

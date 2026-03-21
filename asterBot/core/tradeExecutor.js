const { logTradeAction } = require('../logs/logger');

class TradeExecutor {
  constructor({ mode, exchange, paperEngine, notifier, portfolioManager, hedgingEnabled }) {
    this.mode = mode;
    this.exchange = exchange;
    this.paper = paperEngine;
    this.notifier = notifier;
    this.portfolioManager = portfolioManager;
    this.hedgingEnabled = hedgingEnabled;
  }

  setMode(mode) {
    this.mode = mode;
  }

  async executeEntry(payload) {
    const { symbol, side, qty, entryPrice, stops, leverage } = payload;
    if (!this.hedgingEnabled && this.getOpenPosition(symbol)) {
      logTradeAction({ type: 'SKIPPED', symbol, reason: 'Position already open and hedging disabled' });
      return null;
    }

    let position;
    if (this.mode === 'paper') {
      position = this.paper.openPosition({ symbol, side, qty, entryPrice, leverage, stops });
    } else {
      position = await this.exchange.placeOrder({ symbol, side, qty, type: 'MARKET', leverage });
    }

    logTradeAction({ type: 'EXECUTED', symbol, side, qty, entryPrice, reason: 'Entry filled' });
    await this.notifier.notify('Trade Opened', `${symbol} ${side} @ ${entryPrice.toFixed(6)} qty=${qty}`);
    return position;
  }

  async executeExit(symbol, price, reason = 'EXIT') {
    let closed;
    if (this.mode === 'paper') {
      closed = this.paper.closePosition(symbol, price, reason);
    } else {
      const pos = this.getOpenPosition(symbol);
      if (!pos) return null;
      closed = await this.exchange.placeOrder({ symbol, side: pos.side === 'LONG' ? 'SELL' : 'BUY', qty: pos.qty, type: 'MARKET' });
    }

    if (!closed) return null;

    this.portfolioManager.updatePairStats(symbol, closed.pnl || 0, (closed.pnl || 0) > 0);
    logTradeAction({ type: 'EXECUTED', symbol, reason: `Exit ${reason}`, pnl: closed.pnl || 0 });
    await this.notifier.notify('Trade Closed', `${symbol} ${reason}, pnl=${(closed.pnl || 0).toFixed(2)}`);
    return closed;
  }

  getOpenPosition(symbol) {
    if (this.mode === 'paper') {
      return this.paper.positions.get(symbol);
    }
    return null;
  }
}

module.exports = TradeExecutor;

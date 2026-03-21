class PaperEngine {
  constructor(config) {
    this.feeRate = config.fees;
    this.slippage = config.slippage;
    this.balance = config.startingBalance;
    this.positions = new Map();
    this.tradeHistory = [];
  }

  getBalance() {
    return this.balance;
  }

  getPositions() {
    return Array.from(this.positions.values());
  }

  openPosition({ symbol, side, qty, entryPrice, leverage = 1, stops }) {
    const slippedEntry = side === 'LONG'
      ? entryPrice * (1 + this.slippage)
      : entryPrice * (1 - this.slippage);
    const notional = qty * slippedEntry;
    const fee = notional * this.feeRate;
    this.balance -= fee;

    const position = {
      id: `${symbol}-${Date.now()}`,
      symbol,
      side,
      qty,
      leverage,
      entryPrice: slippedEntry,
      ...stops,
      openedAt: Date.now()
    };
    this.positions.set(symbol, position);
    this.tradeHistory.push({ type: 'OPEN', symbol, side, qty, price: slippedEntry, fee, ts: Date.now() });
    return position;
  }

  closePosition(symbol, closePrice, reason = 'EXIT') {
    const pos = this.positions.get(symbol);
    if (!pos) return null;

    const slippedClose = pos.side === 'LONG'
      ? closePrice * (1 - this.slippage)
      : closePrice * (1 + this.slippage);

    const rawPnl = pos.side === 'LONG'
      ? (slippedClose - pos.entryPrice) * pos.qty
      : (pos.entryPrice - slippedClose) * pos.qty;

    const fee = slippedClose * pos.qty * this.feeRate;
    const pnl = rawPnl - fee;
    this.balance += pnl;

    this.tradeHistory.push({
      type: 'CLOSE',
      symbol,
      side: pos.side,
      qty: pos.qty,
      price: slippedClose,
      pnl,
      fee,
      reason,
      ts: Date.now()
    });

    this.positions.delete(symbol);
    return { ...pos, closePrice: slippedClose, pnl, reason };
  }
}

module.exports = PaperEngine;

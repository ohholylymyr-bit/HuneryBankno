const EventEmitter = require('events');

class MarketStream extends EventEmitter {
  constructor(exchange, symbol, timeframes) {
    super();
    this.exchange = exchange;
    this.symbol = symbol.toLowerCase();
    this.timeframes = timeframes;
  }

  start() {
    const streams = this.timeframes.map((tf) => `${this.symbol}@kline_${tf}`).concat(`${this.symbol}@ticker`);
    this.exchange.connectWebsocket(streams);

    this.exchange.on('ws_message', (msg) => {
      if (msg.stream?.includes('@kline_')) {
        this.emit('kline', msg.data);
      }
      if (msg.stream?.includes('@ticker')) {
        this.emit('ticker', msg.data);
      }
    });

    this.exchange.on('ws_error', (err) => this.emit('error', err));
  }

  stop() {
    this.exchange.closeWebsocket();
  }
}

module.exports = MarketStream;

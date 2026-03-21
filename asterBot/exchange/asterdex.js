const axios = require('axios');
const WebSocket = require('ws');
const EventEmitter = require('events');

class AsterDexAdapter extends EventEmitter {
  constructor(config = {}) {
    super();
    this.apiKey = process.env.ASTERDEX_API_KEY;
    this.apiSecret = process.env.ASTERDEX_API_SECRET;
    this.baseUrl = process.env.ASTERDEX_BASE_URL;
    this.wsUrl = process.env.ASTERDEX_WS_URL;
    this.timeoutMs = config.timeoutMs || 10000;
    this.retryCount = config.retryCount || 3;
    this.retryDelayMs = config.retryDelayMs || 500;
    this.rateLimitMs = config.rateLimitMs || 250;
    this.ws = null;
    this.lastRequestTs = 0;

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeoutMs,
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async rateLimitWait() {
    const elapsed = Date.now() - this.lastRequestTs;
    if (elapsed < this.rateLimitMs) {
      await new Promise((r) => setTimeout(r, this.rateLimitMs - elapsed));
    }
    this.lastRequestTs = Date.now();
  }

  async requestWithRetry(method, url, options = {}) {
    let lastError;
    for (let i = 0; i < this.retryCount; i += 1) {
      try {
        await this.rateLimitWait();
        const res = await this.http.request({ method, url, ...options });
        return res.data;
      } catch (err) {
        lastError = err;
        const status = err.response?.status;
        const retryable = !status || status >= 429;
        if (!retryable || i === this.retryCount - 1) {
          break;
        }
        await new Promise((r) => setTimeout(r, this.retryDelayMs * (i + 1)));
      }
    }
    throw new Error(`AsterDex request failed: ${lastError.message}`);
  }

  getServerTime() {
    return this.requestWithRetry('GET', '/v1/time');
  }

  getTicker(symbol) {
    return this.requestWithRetry('GET', `/v1/market/ticker?symbol=${symbol}`);
  }

  getCandles(symbol, interval = '1m', limit = 500) {
    return this.requestWithRetry('GET', `/v1/market/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
  }

  getBalance() {
    return this.requestWithRetry('GET', '/v1/account/balance');
  }

  placeOrder(order) {
    return this.requestWithRetry('POST', '/v1/order', { data: order });
  }

  cancelOrder(orderId) {
    return this.requestWithRetry('DELETE', `/v1/order/${orderId}`);
  }

  connectWebsocket(streams = []) {
    if (this.ws) this.ws.close();
    const streamParam = streams.join('/');
    this.ws = new WebSocket(`${this.wsUrl}?streams=${streamParam}`);

    this.ws.on('open', () => this.emit('ws_open'));
    this.ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        this.emit('ws_message', data);
      } catch (e) {
        this.emit('ws_error', e);
      }
    });
    this.ws.on('close', () => {
      this.emit('ws_close');
      setTimeout(() => this.connectWebsocket(streams), 1200);
    });
    this.ws.on('error', (err) => this.emit('ws_error', err));
  }

  closeWebsocket() {
    if (this.ws) this.ws.close();
  }
}

module.exports = AsterDexAdapter;

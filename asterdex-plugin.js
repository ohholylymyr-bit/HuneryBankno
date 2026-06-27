(function attachAsterDexPlugin(global) {
  const DEFAULT_PRO_FUTURES_BASE_URL = "https://fapi3.asterdex.com";
  const DEFAULT_PRO_TESTNET_BASE_URL = "https://testnet-fapi3.asterdex.com";
  const ASTER_EIP712_DOMAIN = {
    name: "AsterSignTransaction",
    version: "1",
    chainId: 1666,
    verifyingContract: "0x0000000000000000000000000000000000000000",
  };
  const ASTER_EIP712_TYPES = {
    Message: [{ name: "msg", type: "string" }],
  };

  class AsterProApiPlugin {
    constructor(options = {}) {
      this.baseUrl = (options.baseUrl || DEFAULT_PRO_FUTURES_BASE_URL).replace(/\/$/, "");
      this.user = options.user || "";
      this.signer = options.signer || "";
      this.includeUser = options.includeUser !== false;
      this.privateKey = options.privateKey || "";
      this.signatureProvider = options.signatureProvider || null;
      this.exchangeInfoCache = null;
    }

    static get defaults() {
      return { DEFAULT_PRO_FUTURES_BASE_URL, DEFAULT_PRO_TESTNET_BASE_URL, ASTER_EIP712_DOMAIN };
    }

    toAsterSymbol(symbol) {
      return symbol.replace("/", "").toUpperCase();
    }

    createNonce() {
      return String(Date.now() * 1000 + Math.floor(performance.now() % 1000));
    }

    encodeParams(params) {
      return new URLSearchParams(params).toString();
    }

    encodeSortedParams(params) {
      const sortedEntries = Object.entries(params).sort(([left], [right]) => left.localeCompare(right));
      return new URLSearchParams(sortedEntries).toString();
    }

    async request(path, { method = "GET", params = {}, signed = false } = {}) {
      const requestParams = { ...params };
      if (signed) {
        if (this.includeUser) {
          requestParams.user = requestParams.user || this.user;
          if (!requestParams.user) throw new Error("Aster Pro API user wallet -osoite puuttuu. Syötä päätilin wallet, johon signer-agentti on liitetty.");
        }
        requestParams.nonce = requestParams.nonce || this.createNonce();
        requestParams.signer = requestParams.signer || this.signer;
        if (!requestParams.signer) throw new Error("Aster Pro API signer wallet -osoite puuttuu.");
        const message = this.encodeSortedParams(requestParams);
        requestParams.signature = await this.signMessage(message);
        requestParams.__signedPayload = `${message}&signature=${encodeURIComponent(requestParams.signature)}`;
      }

      const query = requestParams.__signedPayload || this.encodeParams(requestParams);
      delete requestParams.__signedPayload;
      const url = `${this.baseUrl}${path}${method === "GET" && query ? `?${query}` : ""}`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: method === "GET" ? undefined : query,
      });
      const text = await response.text();
      if (!response.ok) {
        const details = text ? `: ${text.slice(0, 300)}` : "";
        const hint = text.includes("No agent found")
          ? " — tarkista, että User wallet on päätilisi wallet ja Signer wallet on siihen Asterissä luotu Pro API / agent wallet."
          : text.includes("Signature check failed")
            ? " — tarkista, että allekirjoittava lompakko tai private key on täsmälleen sama osoite kuin Signer wallet, ei päätilin User wallet."
            : "";
        throw new Error(`Aster Pro API ${method} ${path} epäonnistui (${response.status})${details}${hint}`);
      }
      return text ? JSON.parse(text) : {};
    }

    async signMessage(message) {
      if (this.signatureProvider) return this.signatureProvider(message, ASTER_EIP712_DOMAIN, ASTER_EIP712_TYPES);
      if (this.privateKey) return this.signWithLocalPrivateKey(message);
      if (global.ethereum?.request) return this.signWithInjectedWallet(message);
      throw new Error("Aster Pro API tarvitsee allekirjoittajan: asenna/avaa selainlompakko tai syötä Pro API signer private key kehitystestausta varten.");
    }

    typedData(message) {
      return {
        types: { EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ], ...ASTER_EIP712_TYPES },
        primaryType: "Message",
        domain: ASTER_EIP712_DOMAIN,
        message: { msg: message },
      };
    }

    normalizeAddress(address) {
      return String(address || "").trim().toLowerCase();
    }

    assertSignerAddress(actualAddress) {
      if (this.signer && this.normalizeAddress(actualAddress) !== this.normalizeAddress(this.signer)) {
        throw new Error("Aster Pro API signature check failed ennen lähetystä: allekirjoittava wallet ei vastaa Signer wallet -kenttää. Vaihda lompakossa agent signer -osoitteeseen tai käytä signer private keytä.");
      }
    }

    async signWithInjectedWallet(message) {
      const [account] = await global.ethereum.request({ method: "eth_requestAccounts" });
      this.assertSignerAddress(account);
      return global.ethereum.request({
        method: "eth_signTypedData_v4",
        params: [account, JSON.stringify(this.typedData(message))],
      });
    }

    async signWithLocalPrivateKey(message) {
      if (!global.ethers?.Wallet) {
        throw new Error("Paikallinen private key -allekirjoitus vaatii ethers.js-kirjaston latautumisen.");
      }
      const wallet = new global.ethers.Wallet(this.privateKey);
      this.assertSignerAddress(wallet.address);
      return wallet.signTypedData(ASTER_EIP712_DOMAIN, ASTER_EIP712_TYPES, { msg: message });
    }

    ping() {
      return this.request("/fapi/v3/ping");
    }

    serverTime() {
      return this.request("/fapi/v3/time");
    }

    exchangeInfo() {
      if (!this.exchangeInfoCache) this.exchangeInfoCache = this.request("/fapi/v3/exchangeInfo");
      return this.exchangeInfoCache;
    }

    async symbolInfo(symbol) {
      const asterSymbol = this.toAsterSymbol(symbol);
      const exchangeInfo = await this.exchangeInfo();
      return exchangeInfo.symbols?.find((item) => item.symbol === asterSymbol);
    }

    async formatMarketQuantity(symbol, quantity) {
      const info = await this.symbolInfo(symbol);
      const filters = info?.filters || [];
      const lotFilter = filters.find((filter) => filter.filterType === "MARKET_LOT_SIZE")
        || filters.find((filter) => filter.filterType === "LOT_SIZE");
      if (!lotFilter?.stepSize) return String(quantity);
      const formatted = this.floorToStep(quantity, lotFilter.stepSize);
      if (Number(lotFilter.minQty) && Number(formatted) < Number(lotFilter.minQty)) {
        throw new Error(`Aster Pro API määrä on liian pieni symbolille ${this.toAsterSymbol(symbol)}. Minimi on ${lotFilter.minQty}.`);
      }
      return formatted;
    }

    floorToStep(value, stepSize) {
      const decimals = this.decimalsFromStep(stepSize);
      const factor = 10 ** decimals;
      const floored = Math.floor(Number(value) * factor) / factor;
      return floored.toFixed(decimals).replace(/\.?0+$/, "");
    }

    decimalsFromStep(stepSize) {
      const normalized = String(stepSize).replace(/0+$/, "");
      const decimalPart = normalized.split(".")[1];
      return decimalPart ? decimalPart.length : 0;
    }

    tickerPrice(symbol) {
      return this.request("/fapi/v3/ticker/price", { params: { symbol: this.toAsterSymbol(symbol) } });
    }

    async candle(symbol) {
      const ticker = await this.tickerPrice(symbol);
      return { symbol, price: Number(ticker.price), source: "asterdex" };
    }

    async placeMarketOrder({ symbol, side, quantity, reduceOnly = false }) {
      const params = {
        symbol: this.toAsterSymbol(symbol),
        side,
        type: "MARKET",
        quantity: await this.formatMarketQuantity(symbol, quantity),
      };
      if (reduceOnly) params.reduceOnly = "true";
      return this.request("/fapi/v3/order", {
        method: "POST",
        signed: true,
        params,
      });
    }
  }

  global.AsterProApiPlugin = AsterProApiPlugin;
  global.AsterDexPlugin = AsterProApiPlugin;
})(window);

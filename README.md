# Hunery AI Sijoitusbotti

Selainpohjainen prototyyppi kryptobottiin, jossa on oma kevyt sääntö-AI, paper trading -tila, uusi Aster Pro API -plugin sekä HTML-käyttöliittymä.

## Ominaisuudet

- Esiasetetut kryptovaihtoehdot: BTC, ETH, SOL, BNB, XRP ja DOGE USDT-pareina.
- Oma `MicroInvestmentAI`, joka pisteyttää markkinadatan momentumin, trendin, volyymin ja volatiliteettiriskin perusteella.
- Automaattinen position avaus, kun AI antaa BUY-signaalin.
- Automaattinen sulkeminen stop loss-, take profit- tai SELL-signaalilla.
- Paper trading toimii kokonaan selaimessa ilman API-avaimia.
- `asterdex-plugin.js` sisältää uuden `AsterProApiPlugin`-clientin, joka käyttää Aster Pro / V3 Futures -base URL:ia `https://fapi3.asterdex.com` ja `/fapi/v3/*`-polkuja.
- Pro-signed requestit lisäävät `user`, `nonce`, `signer` ja `signature` -kentät, järjestävät allekirjoitettavat parametrit vakaaseen ASCII-järjestykseen ja allekirjoittavat saman form-urlencoded-parametrimerkkijonon EIP-712 `AsterSignTransaction` -viestinä. `user` on päätilin wallet, johon signer-agentti on liitetty; ilman sitä Aster voi palauttaa `No agent found`.
- Live-tilassa plugin allekirjoittaa ensisijaisesti selaimen `window.ethereum`-lompakolla, vaihtoehtoisesti kehitystestaukseen syötetyllä signer private keyllä `ethers.js`-kirjaston avulla tai omalla `signatureProvider`-funktiolla. Allekirjoittavan osoitteen pitää olla sama kuin `Signer wallet`, ei päätilin `User wallet`. Vanhoja V1 `API key + secret` -kenttiä ei enää käytetä.
- Live-market orderien `quantity` pyöristetään automaattisesti Asterin `exchangeInfo`-endpointin `MARKET_LOT_SIZE`/`LOT_SIZE` `stepSize`-tarkkuuteen, jotta virhe `Precision is over the maximum defined for this asset` vältetään.

## Käynnistys

Avaa `index.html` selaimessa tai aja kevyt paikallinen palvelin:

```bash
python3 -m http.server 8080
```

ja avaa <http://localhost:8080>.

## Aster Pro API live -käyttö

1. Luo Aster Pro API / Agent / API wallet Asterissä.
2. Syötä käyttöliittymään Pro Futures Base URL, oletuksena `https://fapi3.asterdex.com`.
3. Syötä `User wallet` eli päätilin wallet-osoite.
4. Syötä `Signer wallet` eli tähän päätiliin Asterissä liitetty Pro API / agent signer -osoite. Varmista, että allekirjoitat juuri tällä osoitteella; jos lompakko on päätilissä eikä agent signerissä, Aster palauttaa `Signature check failed`.
5. Käynnistä botti live-tilassa ja allekirjoita EIP-712-viestit lompakossa. Jos selaimessa ei ole lompakkoa, voit kehitystestissä syöttää signer private keyn käyttöliittymään; sitä ei tallenneta selaimen localStorageen tai repositorioon.

> Huomio: selainpohjainen live-treidaus on tarkoitettu vain kehitys- ja testikäyttöön. Tuotannossa private key -kenttää ei kannata käyttää. Allekirjoitus kannattaa tehdä omalla backendillä tai hardware-wallet-/vault-ratkaisulla, eikä salaisia avaimia pidä koskaan tallentaa tähän repositorioon.

## Turvallisuus

Tämä on prototyyppi eikä sijoitusneuvontaa. Testaa paper trading -tilassa ennen oikeita toimeksiantoja. Älä tallenna API-avaimia, signereiden private key -avaimia tai siemenlauseita versionhallintaan.

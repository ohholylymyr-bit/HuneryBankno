# HERKKULÄHETTI – Koko sovelluksen täydellinen suunnitelma

## 1) Design-filosofia

**Teema:**
- Yksinkertainen
- Selkeä
- Nopea
- Minimalistinen
- Ei turhaa hälyä
- Kaikki tärkeä 1–2 klikkauksen päässä

**Päätavoite:**
- Tilauksen tekeminen alle 30 sekunnissa.

**UX-periaatteet (mitattavat):**
- Keskimääräinen aika etusivulta kassalle: **< 30 s**.
- Tuotteen löytyminen haulla: **< 10 s**.
- “Tyhjän tilan” näkymät aina ohjaavia (ei dead-end-näkymiä).
- Kaikissa kriittisissä flow’issa selkeä progress-indikaattori (1/2/3).

---

## 2) Käyttäjäroolit ja pääsyoikeudet

Sovelluksessa on 4 erillistä roolia, joilla on omat kirjautumis- ja käyttöpolut:
1. **Asiakas (tilaaja)**
2. **Lähetti (courier)**
3. **Ravintola / kauppias**
4. **Admin (ylläpito)**

### Roolieristys
- Jokaisella roolilla on oma sovellus/näkymä.
- Kirjautuminen on roolikohtaista; asiakastili ei toimi courier-/ravintola-/admin-sovelluksessa.
- Tokenit ja sessiot erotellaan rooliperusteisesti.

### Tilikäytäntö
- Admin hyväksyy courier- ja ravintolatilien luomisen ennen aktivointia.
- Kaikista hyväksyntätoimista jää audit-loki.

---

## 3) Asiakassovellus

## 3.1 Rekisteröinti ja kirjautuminen

Tuetut menetelmät:
- Google Login
- Apple Login
- Sähköposti + salasana
- Puhelinnumero + SMS-vahvistus
- Salasanan palautus
- Käyttöehtojen hyväksyntä
- Sijaintilupa

### Turvallisuus
- 2FA valinnainen (SMS / authenticator).
- Brute-force-suojaus ja kirjautumisyritysten rajoitus.
- Device fingerprinting riskihälytyksiin.

---

## 3.2 Etusivu (Home)

### Yläosa
- Toimitusosoite (vaihdettava)
- Hakukenttä (ravintolat / ruoat)
- Kampanjabanneri

### Kategoriat
- Burgerit
- Pizza
- Salaatit
- Sushi
- Kahvilat
- Ruokakaupat
- Apteekit
- Jälkiruoat

### Ravintolakortin tiedot
- Logo
- Nimi
- Arvosana
- Toimitusaika
- Toimitusmaksu
- Minimitilaus
- Etäisyys
- Auki / kiinni

---

## 3.3 Haku

Hakukenttä hakee:
- Ravintolan nimellä
- Ruokalajin nimellä
- Annoksen nimellä

Suodattimet:
- Halvin toimitus
- Nopein toimitus
- Paras arvosana
- Ilmainen toimitus
- Vegaaninen
- Gluteeniton

### Suorituskyky
- Debounce 250 ms
- Top-hitit + viimeisimmät haut
- Synonyymit (esim. “hamppari” → “burger”)

---

## 3.4 Ravintolan sivu

Sisältää:
- Kansikuva
- Logo
- Arvosana + arvostelut
- Toimitusaika
- Toimitusmaksu
- Minimitilaus
- Aukioloajat

Menu-rakenne:
- Suosituimmat
- Alkuruoat
- Pääruoat
- Juomat
- Lisukkeet

Annoskortti:
- Kuva
- Nimi
- Kuvaus
- Hinta
- Lisävalinnat (koko, lisätäytteet)
- Erikoistoiveet (teksti)

---

## 3.5 Ostoskori

Näyttää:
- Tuotteet
- Määrä + / -
- Hintaerittely:
  - Tuotteet
  - Toimitusmaksu
  - Palvelumaksu
  - Alennus
  - Kokonaishinta

Kentät:
- Toimitusohje
- Ovikoodi
- Puhelin

### Validaatiot
- Minimitilaus tarkistus reaaliajassa.
- Osoitealueen saatavuus ennen maksua.
- Ovikoodi/puh. pakollisuus talokohtaisilla säännöillä.

---

## 3.6 Maksaminen

Tuetut maksutavat:
- Kortti (Visa/Mastercard)
- MobilePay
- Apple Pay
- Google Pay
- PayPal
- Lahjakortti
- Sovelluksen saldo

### Maksun flow
1. Maksutapa valitaan
2. Hinta lukitaan (TTL esim. 5 min)
3. Maksuvarmennus
4. Tilaus luodaan
5. Kuitti + push-ilmoitus

---

## 3.7 Tilauksen seuranta (Live Map)

Tilauksen vaiheet:
1. Ravintola vastaanotti tilauksen
2. Valmistetaan
3. Lähetti matkalla ravintolaan
4. Lähetti matkalla sinulle
5. Toimitettu

Karttaominaisuudet:
- Lähetin sijainti live
- Arvioitu saapumisaika (ETA)
- Chat lähetin kanssa
- Soita lähetin numeroon (välitysnumerolla)

---

## 3.8 Arvostelut

Toimituksen jälkeen:
- 1–5 tähteä
- Kommentti
- Arvioi:
  - Ruoka
  - Toimitus
  - Lähetti

### Moderointi
- Automaattinen toksisuusfiltteri
- Ilmianto ja admin-käsittely

---

## 3.9 Profiili

Sisältää:
- Osoitteet
- Maksutavat
- Tilaushistoria
- Suosikit
- Ilmoitusasetukset
- Tukichat
- Kutsukoodit (referral)

---

## 4) Lähettisovellus

Sisältää:
- Rekisteröinti + dokumentit
- Online / Offline -nappi
- Tilauspyynnöt (accept / reject)
- Navigointi (Google Maps)
- Tulot-dashboard
- Viikkotulot
- Bonuskampanjat
- Chat asiakkaan kanssa
- Chat tuen kanssa

### Lähettilogiiikka
- “Nearest + fairness” -jakomalli.
- Aikakatkaisu tarjouspyynnöille (esim. 20 s).
- Peruutusten sanktiot/rajoitteet määriteltävissä.

---

## 5) Ravintolapaneeli

Ravintola voi:
- Hallita menua
- Muuttaa hintoja
- Asettaa aukioloajat
- Vastaanottaa tilaukset
- Tulostaa kuitit
- Nähdä myyntiraportit
- Luoda kampanjat & tarjoukset
- Vastata arvosteluihin

### Lisätoiminnot
- Saatavuus (86-out) annostasolla
- Ajastetut hinnanmuutokset
- Ruuhkatila (pidempi valmistusaika)

---

## 6) Admin-paneeli

Admin voi hallita:
- Kaikki käyttäjät
- Kaikki ravintolat
- Kaikki lähettit
- Kaikki tilaukset
- Komissiot %
- Kampanjat
- Bannit
- Refundit
- Tukikeskus

### Riskienhallinta
- Fraud-hälytykset
- Epäilyttävien tilausten hold
- Laaja audit trail kaikista kriittisistä toiminnoista

---

## 7) Liiketoimintamalli (rahanteko)

Tulonlähteet:
1. Komissio ravintolalta (20–30 %)
2. Toimitusmaksu asiakkaalta
3. Palvelumaksu
4. Mainokset ravintoloille
5. Premium-tilaus (ilmainen toimitus)

### KPI-ydinmittarit
- GMV / kk
- AOV (average order value)
- On-time delivery %
- Peruutusaste
- CAC vs. LTV

---

## 8) Tekninen arkkitehtuuri

## 8.1 Backend-ominaisuudet
- Real-time GPS tracking
- Chat-järjestelmä
- Maksuintegraatiot
- Push-ilmoitukset
- Skaalautuva kuormankesto
- Monikielisyys
- Monivaluutta

### Ehdotettu stack (suuntaa-antava)
- API: Node.js (NestJS) / Go
- DB: PostgreSQL
- Cache + queue: Redis
- Reaaliaikaisuus: WebSocket + pub/sub
- Kartat: Google Maps Platform
- Tiedostot: S3-yhteensopiva object storage

## 8.2 Ydinpalvelut (mikropalvelu-/moduulijako)
- Auth Service
- User Service
- Catalog/Menu Service
- Order Service
- Dispatch Service
- Payment Service
- Notification Service
- Review Service
- Admin Service

## 8.3 Tietoturva
- JWT + refresh token rotaatio
- PII-salaus levossa + TLS siirrossa
- PCI-DSS-vaatimusten huomiointi maksamisessa
- GDPR: data export / delete -prosessit

---

## 9) Ilmoitukset

Push-ilmoitukset:
- Tilauksen tila
- Tarjoukset
- Kampanjat
- Lähetti lähellä

### Kanavat
- Push (ensisijainen)
- SMS (fallback kriittisiin tilapäivityksiin)
- Email (kuitit, kampanjat)

---

## 10) Tulevaisuuden ominaisuudet

- Drone-toimitukset
- Robottitoimitukset
- AI-suositukset
- Ryhmätilaukset
- Aikataulutettu toimitus

---

## 11) MVP-vaiheistus (suositus)

### Phase 1 (8–12 viikkoa)
- Asiakassovellus: rekisteröinti, haku, menu, kori, korttimaksu, seuranta
- Ravintolapaneeli: tilaukset + menuhallinta
- Lähettisovellus: online/offline + tilausten vastaanotto + navigointi
- Admin: hyväksynnät + perushallinta

### Phase 2
- Monimaksutavat, referral, kampanjakone, kehittynyt raportointi

### Phase 3
- AI-suositukset, ryhmätilaukset, aikataulutettu toimitus

---

## 12) Onnistumiskriteerit

- Ensimmäinen tilaus alle 30 sekunnissa (mediaani).
- 95 % tilauksista ajallaan.
- Sovelluksen kaatumisprosentti < 0.3 %.
- NPS > 50 kolmen kuukauden sisällä lanseerauksesta.


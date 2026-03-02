# HenryBankki (PHP + Firebase)

Monisivuinen pankkidemo, jossa:
- Hampurilaismenu ja erilliset sivut (etusivu, kirjautuminen, saldo, maksu, profiili, sijoitukset, laina, kortit, yritystili, admin)
- Rekisteröityminen (10 numeron käyttäjätunnus + 6 numeron PIN) ja sen jälkeen kirjautuminen
- Firebase JS SDK alustetaan (`public/assets/js/firebase-init.js`) valmiina oikeille tunnuksille
- Maksujen vahvistus PIN-koodilla
- Profiilissa support-chatin lähetys
- Sijoituksissa 10 kryptoa, 20 suomalaista ja 50 globaalia osaketta

## Käynnistys

```bash
php -S 0.0.0.0:8000 -t public
```

Avaa: `http://localhost:8000`

## Kirjautuminen
- Ensin rekisteröi käyttäjä login-sivulta
- Käyttäjätunnus: 10 numeroa
- PIN-koodi: 6 numeroa
- Admin: `9999999999` / `123456`

## Firebase
Vaihda `public/includes/config.php` tiedostoon omat Firebase-avaimet.

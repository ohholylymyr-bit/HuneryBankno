async function loadMarket() {
  const el = document.getElementById('market');
  if (!el) return;
  el.textContent = 'Ladataan markkinadataa...';
  try {
    const res = await fetch('/market.php');
    const data = await res.json();
    const block = (title, rows) => `<h3>${title}</h3>` + rows.map(r => `<div class='tx'><span>${r.symbol}</span><span>${Number(r.price).toFixed(2)} €</span><strong>${Number(r.change).toFixed(2)}%</strong></div>`).join('');
    el.innerHTML = block('Kryptot', data.crypto) + block('Suomi', data.fi) + block('Maailma', data.global);
  } catch (e) {
    el.textContent = 'Markkinadatan lataus epäonnistui.';
  }
}
loadMarket();
setInterval(loadMarket, 30000);

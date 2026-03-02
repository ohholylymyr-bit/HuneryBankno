<?php requireLogin(); $u = userData(); renderHeader('Yritystili', $config); ?>
<?php if ($ok = flash('ok')): ?><p class="ok"><?= h($ok) ?></p><?php endif; ?>
<section class="card">
<h2>Yritystilin perustaminen</h2>
<p>Luo ensin perustili, jonka jälkeen admin voi vaihtaa sen yritystiliksi. Yritystilillä voit vastaanottaa NFC- tai korttimaksuja, maksaa palkkoja ja käyttää samoja toimintoja kuin perustilillä.</p>
<form method="post">
<input type="hidden" name="action" value="request_business">
<label>Yrityksen nimi<input name="business_name" value="<?= h($u['business']['name'] ?: 'Uusi Yritys Oy') ?>"></label>
<button class="btn">Luo perustili yritykselle</button>
</form>
</section>
<section class="card">
<h3>Korttimaksut</h3>
<p>NFC: maksu vaatii saman PIN-koodin kuin kortilla. Rahat siirtyvät asiakkaan tililtä yrityksen tilille.</p>
<p>Palkat: yritystili -> työntekijän henkilökohtainen tili.</p>
</section>
<?php renderFooter(); ?>

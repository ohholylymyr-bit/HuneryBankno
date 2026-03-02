<?php requireLogin(); $u = userData(); renderHeader('Korttien tiedot', $config); ?>
<section class="grid">
<?php foreach ($u['cards'] as $c): ?>
<div class="card">
<div class="bank-card"><h3>HenryBankki</h3><p><?= h($c['name']) ?></p><p><?= h($c['number']) ?></p></div>
<p>Kortin PIN: <?= h($c['card_pin']) ?></p>
<p>Tilin PIN: <?= h($u['pin']) ?></p>
<p>Verkkomaksu PIN: <?= h($c['web_pin']) ?></p>
</div>
<?php endforeach; ?>
</section>
<?php renderFooter(); ?>

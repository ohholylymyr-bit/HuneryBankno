<?php requireLogin(); $u = userData(); renderHeader('Saldo ja kortit', $config); ?>
<?php if ($ok = flash('ok')): ?><p class="ok"><?= h($ok) ?></p><?php endif; ?>
<section class="grid">
<div class="card"><h2>Saldo</h2><p class="big"><?= number_format($u['balance'], 2, ',', ' ') ?> €</p></div>
<div class="card"><h2>Kortit</h2><?php foreach ($u['cards'] as $card): ?><p><?= h($card['number']) ?> - <?= h($card['name']) ?></p><?php endforeach; ?></div>
</section>
<section class="actions-row wrap">
    <a class="btn" href="/?page=pay">Maksa</a>
    <a class="btn" href="/?page=profile">Profiili</a>
    <a class="btn" href="/?page=investments">Sijoitukset</a>
    <a class="btn" href="/?page=loan">Laina</a>
    <a class="btn" href="/?page=cards">Korttien tiedot</a>
</section>
<section class="card"><h3>Tapahtumat</h3>
<?php foreach (array_reverse($u['transactions']) as $t): ?>
<div class="tx"><span><?= h($t['date']) ?></span><span><?= h($t['text']) ?></span><strong><?= number_format($t['amount'],2,',',' ') ?> €</strong></div>
<?php endforeach; ?></section>
<?php renderFooter(); ?>

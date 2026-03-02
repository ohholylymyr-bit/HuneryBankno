<?php requireLogin(); $u = userData(); renderHeader('Laina', $config); ?>
<?php if ($ok = flash('ok')): ?><p class="ok"><?= h($ok) ?></p><?php endif; ?>
<?php if ($err = flash('error')): ?><p class="error"><?= h($err) ?></p><?php endif; ?>
<section class="card narrow">
<h2>Lainat</h2><p>Nykyinen laina: <?= number_format($u['loans'], 2, ',', ' ') ?> €</p>
<form method="post">
<input type="hidden" name="action" value="loan">
<label>Summa (max 20€)<input type="number" step="0.01" min="0.01" max="20" name="amount" required></label>
<div class="actions-row"><button class="btn" name="loan_action" value="take">Ota lainaa</button><button class="btn ghost" name="loan_action" value="repay">Maksa takaisin</button></div>
</form>
</section>
<?php renderFooter(); ?>

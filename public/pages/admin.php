<?php requireLogin(); $u = userData(); renderHeader('Admin', $config); ?>
<?php if (empty($u['is_admin'])): ?>
<section class="card"><p>Kirjaudu admin-tunnuksella nähdäksesi hallintapaneelin.</p></section>
<?php else: ?>
<?php if ($ok = flash('ok')): ?><p class="ok"><?= h($ok) ?></p><?php endif; ?>
<section class="grid">
<div class="card"><h2>Rahojen lisäys</h2><p>Lisää varoja kaikille tileille ilman admin-kuluja (demo-toiminto).</p></div>
<div class="card"><h2>Tilien tarkastelu</h2><p>Listaa käyttäjä- ja yritystilit sekä tilastot.</p></div>
<div class="card"><h2>Yritystiliksi vaihto</h2>
<form method="post"><input type="hidden" name="action" value="admin_upgrade_business"><label>Käyttäjätunnus<input name="target_user" pattern="\d{10}"></label><button class="btn">Vaihda yritystiliksi</button></form>
</div>
<div class="card"><h2>Support-pyynnöt</h2><p>Näe käyttäjien chatbot-keskustelut ja jatka tukena.</p></div>
</section>
<?php endif; ?>
<?php renderFooter(); ?>

<?php requireLogin(); $u = userData(); renderHeader('Profiili', $config); ?>
<?php if ($ok = flash('ok')): ?><p class="ok"><?= h($ok) ?></p><?php endif; ?>
<section class="grid">
<div class="card">
<h2>Support (chatbot -> sinulle)</h2>
<form method="post">
<input type="hidden" name="action" value="support_chat">
<label>Chat-keskustelu<input name="conversation" placeholder="Kirjoita bottikeskustelu tähän" required></label>
<button class="btn">Lähetä supportiin</button>
</form>
</div>
<div class="card">
<h2>Henkilötiedot</h2>
<form method="post">
<input type="hidden" name="action" value="update_profile">
<label>Nimi<input name="name" value="<?= h($u['name']) ?>"></label>
<label>Uusi käyttäjätunnus (10 numeroa)<input name="new_id" pattern="\d{10}" maxlength="10"></label>
<label>Uusi PIN (6 numeroa)<input name="new_pin" pattern="\d{6}" maxlength="6"></label>
<button class="btn">Tallenna muutokset</button>
</form>
</div>
</section>
<?php renderFooter(); ?>

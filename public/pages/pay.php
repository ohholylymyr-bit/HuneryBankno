<?php requireLogin(); renderHeader('Maksa', $config); $pending = $_SESSION['pending_payment'] ?? null; ?>
<?php if ($ok = flash('ok')): ?><p class="ok"><?= h($ok) ?></p><?php endif; ?>
<?php if ($err = flash('error')): ?><p class="error"><?= h($err) ?></p><?php endif; ?>
<section class="card">
<h2>Maksu</h2>
<form method="post">
    <input type="hidden" name="action" value="pay">
    <label>Vastaanottajan IBAN<input name="iban" required></label>
    <label>Tilin valinta
        <select name="account"><?php foreach (userData()['accounts'] as $a): ?><option><?= h($a) ?></option><?php endforeach; ?></select>
    </label>
    <label>Summa €<input type="number" name="amount" min="0.01" step="0.01" required></label>
    <label>Viite / viesti<input name="message"></label>
    <label><input type="checkbox" name="invoice"> Maksetaanko lasku?</label>
    <button class="btn" type="submit">Valmis</button>
</form>
</section>
<?php if ($pending): ?>
<section class="card floating">
<h3>Vahvistusikkuna</h3>
<p><?= h($pending['iban']) ?> / <?= number_format($pending['amount'],2,',',' ') ?> €</p>
<form method="post">
<input type="hidden" name="action" value="confirm_payment">
<label>PIN-koodi<input type="password" name="pin" pattern="\d{6}" maxlength="6" required></label>
<button class="btn">Vahvista</button>
</form>
</section>
<?php endif; ?>
<?php renderFooter(); ?>

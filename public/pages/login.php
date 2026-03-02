<?php renderHeader('Kirjautuminen', $config); ?>
<section class="card narrow">
    <h2>Kirjaudu sisään</h2>
    <?php if ($ok = flash('ok')): ?><p class="ok"><?= h($ok) ?></p><?php endif; ?>
    <?php if ($err = flash('error')): ?><p class="error"><?= h($err) ?></p><?php endif; ?>

    <form method="post">
        <input type="hidden" name="action" value="login">
        <label>Käyttäjätunnus (10 numeroa)
            <input name="user_id" inputmode="numeric" pattern="\d{10}" maxlength="10" required>
        </label>
        <label>PIN-koodi (6 numeroa)
            <input name="pin" type="password" inputmode="numeric" pattern="\d{6}" maxlength="6" required>
        </label>
        <button class="btn" type="submit">Kirjaudu</button>
    </form>
</section>

<section class="card narrow">
    <h2>Registeröidy</h2>
    <p>Luo uusi käyttäjä antamalla käyttäjätunnus ja PIN-koodi.</p>
    <form method="post">
        <input type="hidden" name="action" value="register">
        <label>Käyttäjätunnus (10 numeroa)
            <input name="user_id" inputmode="numeric" pattern="\d{10}" maxlength="10" required>
        </label>
        <label>PIN-koodi (6 numeroa)
            <input name="pin" type="password" inputmode="numeric" pattern="\d{6}" maxlength="6" required>
        </label>
        <button class="btn ghost" type="submit">Registeröidy</button>
    </form>
</section>
<?php renderFooter(); ?>

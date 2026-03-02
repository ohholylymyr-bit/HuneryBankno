<?php
function renderHeader(string $title, array $config): void
{
    $user = userData();
    $firebaseJson = json_encode($config['firebase'], JSON_UNESCAPED_SLASHES);
    echo "<!doctype html><html lang='fi'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>";
    echo '<title>' . h($title) . ' | ' . h($config['app_name']) . '</title>';
    echo "<link rel='stylesheet' href='/assets/css/style.css'>";
    echo "<script defer src='https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js'></script>";
    echo "<script defer src='https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'></script>";
    echo "<script defer src='/assets/js/firebase-init.js'></script>";
    echo "<script>window.HENRY_FIREBASE={$firebaseJson};</script>";
    echo "</head><body>";
    echo "<header class='topbar'><button id='hamburger' class='hamburger'>☰</button><h1>HenryBankki</h1>";
    if ($user) {
        echo "<div class='user-chip'>" . h($user['id']) . "</div>";
    }
    echo "</header>";
    echo "<aside id='menu' class='menu'>";
    echo "<a href='/?page=home'>Etusivu</a><a href='/?page=dashboard'>Saldo</a><a href='/?page=pay'>Maksa</a><a href='/?page=profile'>Profiili</a><a href='/?page=investments'>Sijoitukset</a><a href='/?page=loan'>Laina</a><a href='/?page=cards'>Kortit</a><a href='/?page=business'>Yritystili</a><a href='/?page=admin'>Admin</a><a href='/?page=logout'>Kirjaudu ulos</a>";
    echo "</aside><main class='container'>";
}

function renderFooter(): void
{
    echo "</main><script src='/assets/js/app.js'></script></body></html>";
}

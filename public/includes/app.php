<?php
session_start();

$config = require __DIR__ . '/config.php';

function isLoggedIn(): bool
{
    return isset($_SESSION['user']);
}

function requireLogin(): void
{
    if (!isLoggedIn()) {
        header('Location: /?page=login');
        exit;
    }
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function flash(string $key): ?string
{
    if (!isset($_SESSION['flash'][$key])) {
        return null;
    }
    $msg = $_SESSION['flash'][$key];
    unset($_SESSION['flash'][$key]);
    return $msg;
}

function setFlash(string $key, string $message): void
{
    $_SESSION['flash'][$key] = $message;
}

function userData(): array
{
    if (!isset($_SESSION['user'])) {
        return [];
    }
    return $_SESSION['user'];
}

function usersFilePath(): string
{
    return dirname(__DIR__) . '/data/users.json';
}

function loadUsers(): array
{
    $path = usersFilePath();
    if (!file_exists($path)) {
        return [];
    }

    $raw = file_get_contents($path);
    if ($raw === false || $raw === '') {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function saveUsers(array $users): bool
{
    $path = usersFilePath();
    $json = json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        return false;
    }
    return file_put_contents($path, $json, LOCK_EX) !== false;
}

function createUser(string $userId, string $pin): bool
{
    $users = loadUsers();
    if (isset($users[$userId])) {
        return false;
    }

    $users[$userId] = [
        'id' => $userId,
        'name' => 'Henry Asiakas',
        'pin_hash' => password_hash($pin, PASSWORD_DEFAULT),
        'created' => date('c'),
    ];

    return saveUsers($users);
}

function findUser(string $userId): ?array
{
    $users = loadUsers();
    return $users[$userId] ?? null;
}

function loginUserSession(string $userId, string $name, string $pin, bool $isAdmin = false): void
{
    $_SESSION['user'] = [
        'id' => $userId,
        'name' => $name,
        'pin' => $pin,
        'balance' => 2580.45,
        'cards' => [
            ['name' => $name, 'number' => '4556 7788 1100 2233', 'web_pin' => '993311', 'card_pin' => '4321'],
        ],
        'accounts' => ['Käyttötili', 'Säästötili', 'Matkatili'],
        'loans' => 12.50,
        'business' => ['enabled' => false, 'name' => ''],
        'transactions' => [
            ['date' => date('Y-m-d'), 'text' => 'Ruokakauppa', 'amount' => -42.30],
            ['date' => date('Y-m-d', strtotime('-1 day')), 'text' => 'Palkka', 'amount' => 1800.00],
        ],
        'support_chats' => [],
        'is_admin' => $isAdmin,
    ];
}

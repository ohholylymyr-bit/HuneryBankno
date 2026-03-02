<?php
require __DIR__ . '/includes/app.php';
require __DIR__ . '/includes/layout.php';

$page = $_GET['page'] ?? 'home';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'register') {
        $id = preg_replace('/\D/', '', $_POST['user_id'] ?? '');
        $pin = preg_replace('/\D/', '', $_POST['pin'] ?? '');

        if (strlen($id) !== 10 || strlen($pin) !== 6) {
            setFlash('error', 'Rekisteröinti epäonnistui: tunnus 10 numeroa ja PIN 6 numeroa.');
            header('Location: /?page=login');
            exit;
        }

        if (createUser($id, $pin)) {
            setFlash('ok', 'Rekisteröinti onnistui. Voit nyt kirjautua sisään.');
        } else {
            setFlash('error', 'Käyttäjä on jo olemassa tai tallennus epäonnistui.');
        }

        header('Location: /?page=login');
        exit;
    }

    if ($action === 'login') {
        $id = preg_replace('/\D/', '', $_POST['user_id'] ?? '');
        $pin = preg_replace('/\D/', '', $_POST['pin'] ?? '');

        if (strlen($id) !== 10 || strlen($pin) !== 6) {
            setFlash('error', 'Käyttäjätunnuksen tulee olla 10 numeroa ja PIN-koodin 6 numeroa.');
            header('Location: /?page=login');
            exit;
        }

        if ($id === $config['admin_user'] && $pin === $config['admin_pin']) {
            loginUserSession($id, 'Henry Admin', $pin, true);
            header('Location: /?page=dashboard');
            exit;
        }

        $existing = findUser($id);
        if (!$existing || empty($existing['pin_hash']) || !password_verify($pin, $existing['pin_hash'])) {
            setFlash('error', 'Kirjautuminen epäonnistui. Rekisteröidy ensin tai tarkista tunnus/PIN.');
            header('Location: /?page=login');
            exit;
        }

        loginUserSession($id, $existing['name'] ?? 'Henry Asiakas', $pin);
        header('Location: /?page=dashboard');
        exit;
    }

    if (!isLoggedIn()) {
        header('Location: /?page=login');
        exit;
    }

    if ($action === 'pay') {
        $iban = trim($_POST['iban'] ?? '');
        $amount = (float) ($_POST['amount'] ?? 0);
        if ($iban === '' || $amount <= 0) {
            setFlash('error', 'Täytä IBAN ja summa.');
        } else {
            $_SESSION['pending_payment'] = [
                'iban' => $iban,
                'account' => $_POST['account'] ?? 'Käyttötili',
                'message' => trim($_POST['message'] ?? ''),
                'amount' => $amount,
                'invoice' => isset($_POST['invoice']),
            ];
            setFlash('ok', 'Maksu tallennettu vahvistettavaksi.');
        }
        header('Location: /?page=pay');
        exit;
    }

    if ($action === 'confirm_payment') {
        $pin = preg_replace('/\D/', '', $_POST['pin'] ?? '');
        $payment = $_SESSION['pending_payment'] ?? null;
        if ($payment && $pin === $_SESSION['user']['pin']) {
            $_SESSION['user']['balance'] -= $payment['amount'];
            $_SESSION['user']['transactions'][] = ['date' => date('Y-m-d'), 'text' => 'Tilisiirto ' . $payment['iban'], 'amount' => -$payment['amount']];
            unset($_SESSION['pending_payment']);
            setFlash('ok', 'Maksu vahvistettu.');
        } else {
            setFlash('error', 'Virheellinen PIN tai ei odottavaa maksua.');
        }
        header('Location: /?page=dashboard');
        exit;
    }

    if ($action === 'support_chat') {
        $_SESSION['user']['support_chats'][] = [
            'created' => date('c'),
            'conversation' => trim($_POST['conversation'] ?? ''),
        ];
        setFlash('ok', 'Chat-keskustelu lähetetty supportille.');
        header('Location: /?page=profile');
        exit;
    }

    if ($action === 'update_profile') {
        $_SESSION['user']['name'] = trim($_POST['name'] ?? $_SESSION['user']['name']);
        $newId = preg_replace('/\D/', '', $_POST['new_id'] ?? '');
        $newPin = preg_replace('/\D/', '', $_POST['new_pin'] ?? '');
        if (strlen($newId) === 10) {
            $_SESSION['user']['id'] = $newId;
        }
        if (strlen($newPin) === 6) {
            $_SESSION['user']['pin'] = $newPin;
        }
        setFlash('ok', 'Profiili päivitetty.');
        header('Location: /?page=profile');
        exit;
    }

    if ($action === 'loan') {
        $type = $_POST['loan_action'] ?? '';
        $amount = (float) ($_POST['amount'] ?? 0);
        if ($amount > 20) {
            setFlash('error', 'Lainan maksimisummaa on 20 € kerralla.');
        } elseif ($amount <= 0) {
            setFlash('error', 'Anna kelvollinen summa.');
        } elseif ($type === 'take') {
            $_SESSION['user']['loans'] += $amount;
            $_SESSION['user']['balance'] += $amount;
            setFlash('ok', 'Laina nostettu.');
        } elseif ($type === 'repay' && $_SESSION['user']['balance'] >= $amount) {
            $_SESSION['user']['loans'] = max(0, $_SESSION['user']['loans'] - $amount);
            $_SESSION['user']['balance'] -= $amount;
            setFlash('ok', 'Laina maksettu.');
        } else {
            setFlash('error', 'Lainan maksu epäonnistui.');
        }
        header('Location: /?page=loan');
        exit;
    }

    if ($action === 'request_business') {
        $_SESSION['user']['business']['name'] = trim($_POST['business_name'] ?? 'Yritys Oy');
        setFlash('ok', 'Perustili luotu. Pyydä adminia vaihtamaan yritystiliksi.');
        header('Location: /?page=business');
        exit;
    }

    if ($action === 'admin_upgrade_business' && !empty($_SESSION['user']['is_admin'])) {
        $_SESSION['admin_last_upgrade'] = trim($_POST['target_user'] ?? '');
        setFlash('ok', 'Tilin tyyppi päivitetty yritystiliksi (demo).');
        header('Location: /?page=admin');
        exit;
    }
}

if ($page === 'logout') {
    session_destroy();
    header('Location: /?page=home');
    exit;
}

$viewFile = __DIR__ . '/pages/' . preg_replace('/[^a-z_]/', '', $page) . '.php';
if (!file_exists($viewFile)) {
    $viewFile = __DIR__ . '/pages/home.php';
}

require $viewFile;

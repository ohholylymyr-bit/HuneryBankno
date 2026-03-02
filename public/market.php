<?php
header('Content-Type: application/json; charset=utf-8');
$symbols = require __DIR__ . '/data/symbols.php';

function getJson(string $url): ?array {
    $ctx = stream_context_create(['http' => ['timeout' => 8, 'header' => "User-Agent: HenryBankki/1.0\r\n"]]);
    $raw = @file_get_contents($url, false, $ctx);
    if ($raw === false) return null;
    return json_decode($raw, true);
}

$result = ['crypto' => [], 'fi' => [], 'global' => []];
$crypto = implode(',', $symbols['crypto']);
$c = getJson("https://api.coingecko.com/api/v3/simple/price?ids={$crypto}&vs_currencies=eur&include_24hr_change=true");
if (is_array($c)) {
    foreach ($symbols['crypto'] as $id) {
        if (isset($c[$id])) {
            $result['crypto'][] = ['symbol' => $id, 'price' => $c[$id]['eur'] ?? 0, 'change' => $c[$id]['eur_24h_change'] ?? 0];
        }
    }
}

$allStocks = implode(',', array_merge($symbols['fi'], $symbols['global']));
$s = getJson('https://query1.finance.yahoo.com/v7/finance/quote?symbols=' . urlencode($allStocks));
if (isset($s['quoteResponse']['result'])) {
    foreach ($s['quoteResponse']['result'] as $row) {
        $entry = ['symbol' => $row['symbol'] ?? '-', 'price' => $row['regularMarketPrice'] ?? 0, 'change' => $row['regularMarketChangePercent'] ?? 0];
        if (str_ends_with($entry['symbol'], '.HE')) $result['fi'][] = $entry; else $result['global'][] = $entry;
    }
}

echo json_encode($result, JSON_UNESCAPED_UNICODE);

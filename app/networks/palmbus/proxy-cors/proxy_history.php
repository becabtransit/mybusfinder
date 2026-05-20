<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$HISTORY_DIR = __DIR__ . '/../history/';
$MAX_AGE_HOURS = 4;

if (!is_dir($HISTORY_DIR)) {
    mkdir($HISTORY_DIR, 0755, true);
}

$action = $_GET['action'] ?? 'list';

if ($action === 'save') {
    $raw = file_get_contents('php://input');
    if (!$raw) { echo json_encode(['ok' => false]); exit; }

    $ts       = time();
    $filename = $HISTORY_DIR . $ts . '.json';
    file_put_contents($filename, $raw);

    // supp les fichiers plusde 4h
    $cutoff = $ts - ($MAX_AGE_HOURS * 3600);
    foreach (glob($HISTORY_DIR . '*.json') as $f) {
        $ft = (int) basename($f, '.json');
        if ($ft < $cutoff) unlink($f);
    }

    echo json_encode(['ok' => true, 'ts' => $ts]);
    exit;
}

if ($action === 'list') {
    $files = glob($HISTORY_DIR . '*.json');
    $timestamps = array_map(fn($f) => (int) basename($f, '.json'), $files);
    sort($timestamps);
    echo json_encode($timestamps);
    exit;
}

if ($action === 'get') {
    $ts    = (int) ($_GET['ts'] ?? 0);
    $files = glob($HISTORY_DIR . '*.pb');
    $best  = null;
    $bestDiff = PHP_INT_MAX;

    foreach ($files as $f) {
        $ft   = (int) basename($f, '.pb');
        $diff = abs($ft - $ts);
        if ($diff < $bestDiff) {
            $bestDiff = $diff;
            $best     = $f;
        }
    }

    if ($best && $bestDiff < 120) {
        header('Content-Type: application/octet-stream');
        echo file_get_contents($best);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'snapshot introuvable']);
    }
    exit;
}

echo json_encode(['error' => 'unknown action']);

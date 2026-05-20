<?php
header('Access-Control-Allow-Origin: *');

$HISTORY_DIR = dirname(__DIR__) . '/history/';

$action = $_GET['action'] ?? 'list';

if ($action === 'list') {
    header('Content-Type: application/json');

    if (!is_dir($HISTORY_DIR)) {
        echo json_encode([]);
        exit;
    }

    $files = glob($HISTORY_DIR . '*.pb');

    if ($files === false || count($files) === 0) {
        echo json_encode([]);
        exit;
    }

    $timestamps = array_map(fn($f) => (int) basename($f, '.pb'), $files);
    sort($timestamps);

    $decimated = [];
    $lastKept  = 0;
    foreach ($timestamps as $ts) {
        if ($ts - $lastKept >= 30) {
            $decimated[] = $ts;
            $lastKept    = $ts;
        }
    }

    echo json_encode($decimated);
    exit;
}

if ($action === 'get') {
    $ts = (int) ($_GET['ts'] ?? 0);

    if ($ts === 0) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'ts manquant']);
        exit;
    }

    $files = glob($HISTORY_DIR . '*.pb');

    if ($files === false || count($files) === 0) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'aucun snapshot']);
        exit;
    }

    $best     = null;
    $bestDiff = PHP_INT_MAX;

    foreach ($files as $f) {
        $ft   = (int) basename($f, '.pb');
        $diff = abs($ft - $ts);
        if ($diff < $bestDiff) {
            $bestDiff = $diff;
            $best     = $f;
        }
    }

    if ($best === null || $bestDiff > 120) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'snapshot introuvable', 'ts' => $ts, 'diff' => $bestDiff]);
        exit;
    }

    header('Content-Type: application/octet-stream');
    header('Content-Length: ' . filesize($best));
    readfile($best);
    exit;
}

if ($action === 'debug') {
    header('Content-Type: application/json');
    $files = glob($HISTORY_DIR . '*.pb') ?: [];
    echo json_encode([
        'history_dir'  => $HISTORY_DIR,
        'dir_exists'   => is_dir($HISTORY_DIR),
        'file_count'   => count($files),
        'first_3'      => array_slice($files, 0, 3),
        'last_3'       => array_slice($files, -3),
        'php_cwd'      => getcwd(),
        'script_dir'   => __DIR__,
    ]);
    exit;
}

header('Content-Type: application/json');
echo json_encode(['error' => 'action inconnue']);

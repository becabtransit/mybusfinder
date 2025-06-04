<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

$cacheFile = __DIR__ . '/.file_cache.json';
$cacheTimeout = 300; 

if (file_exists($cacheFile)) {
    $cacheData = json_decode(file_get_contents($cacheFile), true);
    if ($cacheData && (time() - $cacheData['timestamp']) < $cacheTimeout) {
        header('X-Cache: HIT');
        echo json_encode($cacheData['files']);
        exit;
    }
}

try {
    $directory = __DIR__;
    $allFiles = scandir($directory);
    
    if ($allFiles === false) {
        throw new Exception('Impossible de lire le répertoire');
    }
    
    $txtFiles = [];
    foreach ($allFiles as $file) {
        if (strlen($file) > 4 && substr($file, -4) === '.txt') {
            $txtFiles[] = $file;
        }
    }
    
    sort($txtFiles);
    
    $cacheData = [
        'files' => $txtFiles,
        'timestamp' => time()
    ];
    
    file_put_contents($cacheFile, json_encode($cacheData), LOCK_EX);
    
    header('X-Cache: MISS');
    echo json_encode($txtFiles);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Erreur serveur',
        'message' => $e->getMessage()
    ]);
}
?>

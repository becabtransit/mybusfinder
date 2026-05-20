<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/octet-stream");

$url  = 'https://proxy.transport.data.gouv.fr/resource/palmbus-cannes-gtfs-rt-vehicle-position';
$data = file_get_contents($url);

if ($data !== false) {
    $dir = __DIR__ . '/../history/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $ts   = time();
    $file = $dir . $ts . '.pb';
    file_put_contents($file, $data);

    $cutoff = $ts - (4 * 3600);
    foreach (glob($dir . '*.pb') as $f) {
        if ((int) basename($f, '.pb') < $cutoff) {
            unlink($f);
        }
    }

    echo $data;
} else {
    http_response_code(503);
    echo json_encode(['error' => 'Impossible de récupérer les données']);
}
?>

<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$lat = round(floatval($_GET['lat'] ?? 0), 3); 
$lon = round(floatval($_GET['lon'] ?? 0), 3);
if (!$lat || !$lon) { echo '{"error":"no coords"}'; exit; }

$dbFile = __DIR__ . '/gps_cache.json';
$key = "{$lat},{$lon}";

$db = [];
if (file_exists($dbFile)) {
    $db = json_decode(file_get_contents($dbFile), true) ?? [];
}

if (isset($db[$key])) {
    echo json_encode($db[$key]);
    exit;
}

$cacheFile = sys_get_temp_dir() . '/geocode_' . md5($key) . '.json';
if (file_exists($cacheFile)) {
    $data = json_decode(file_get_contents($cacheFile), true);
    if ($data) {
        $db[$key] = $data;
        file_put_contents($dbFile, json_encode($db, JSON_PRETTY_PRINT));
        echo json_encode($data);
        exit;
    }
}

sleep(1);

$url = "https://nominatim.openstreetmap.org/reverse?lat={$lat}&lon={$lon}&format=json&zoom=16&accept-language=fr";
$ctx = stream_context_create(['http' => [
    'header' => "User-Agent: MyBusSchedule/1.0 bechirabidi@mybusfinder.fr\r\n",
    'timeout' => 10
]]);
$result = @file_get_contents($url, false, $ctx);

if ($result === false) {
    echo '{"error":"fetch failed"}';
    exit;
}

$data = json_decode($result, true);
if (!$data) {
    echo '{"error":"invalid response"}';
    exit;
}

$db[$key] = $data;
file_put_contents($dbFile, json_encode($db, JSON_PRETTY_PRINT));
file_put_contents($cacheFile, $result);

echo $result;

<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$lat = round(floatval($_GET['lat'] ?? 0), 3); 
$lon = round(floatval($_GET['lon'] ?? 0), 3);
if (!$lat || !$lon) { echo '{"error":"no coords"}'; exit; }

$cacheFile = sys_get_temp_dir() . '/geocode_' . md5("{$lat},{$lon}") . '.json';

if (file_exists($cacheFile)) {
    echo file_get_contents($cacheFile);
    exit;
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

file_put_contents($cacheFile, $result);
echo $result;

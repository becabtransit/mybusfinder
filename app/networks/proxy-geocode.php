<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$lat = floatval($_GET['lat'] ?? 0);
$lon = floatval($_GET['lon'] ?? 0);
if (!$lat || !$lon) { echo '{"error":"no coords"}'; exit; }

$url = "https://nominatim.openstreetmap.org/reverse?lat={$lat}&lon={$lon}&format=json&zoom=14&accept-language=fr";
$ctx = stream_context_create(['http' => [
    'header' => "User-Agent: MyBusSchedule/1.0\r\n",
    'timeout' => 10
]]);
$result = @file_get_contents($url, false, $ctx);

if ($result === false) {
    $err = error_get_last();
    echo json_encode(['error' => $err['message'] ?? 'fetch failed']);
} else {
    echo $result;
}

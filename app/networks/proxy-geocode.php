<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$lat = floatval($_GET['lat'] ?? 0);
$lon = floatval($_GET['lon'] ?? 0);
if (!$lat || !$lon) { echo '{}'; exit; }

$url = "https://nominatim.openstreetmap.org/reverse?lat={$lat}&lon={$lon}&format=json&zoom=14&accept-language=fr";
$ctx = stream_context_create(['http' => ['header' => "User-Agent: MyBusSchedule/1.0\r\n", 'timeout' => 5]]);
$result = @file_get_contents($url, false, $ctx);
echo $result ?: '{}';

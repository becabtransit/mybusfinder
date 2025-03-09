<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://proxy.transport.data.gouv.fr/resource/palmbus-cannes-gtfs-rt-service-alert';
$data = file_get_contents($url);
echo $data;
?>

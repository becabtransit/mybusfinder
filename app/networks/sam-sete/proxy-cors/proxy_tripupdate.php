<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://sete.ceccli.com/gtfs/TripUpdates.pb';
$data = file_get_contents($url);
echo $data;
?>

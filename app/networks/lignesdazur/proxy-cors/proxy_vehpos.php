<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://ara-api.enroute.mobi/rla/gtfs/vehicle-positions';
$data = file_get_contents($url);
echo $data;
?>

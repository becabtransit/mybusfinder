<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://feed-rdtpm-toulon.ratpdev.com/VehiclePosition/GTFS-RT';
$data = file_get_contents($url);
echo $data;
?>

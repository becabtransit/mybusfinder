<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://s3.eu-west-1.amazonaws.com/files.orchestra.ratpdev.com/networks/rd-toulon/exports/gtfs-complet.zip';
$data = file_get_contents($url);
echo $data;
?>

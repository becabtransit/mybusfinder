<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://mybusfinder.fr/gtfsrt/stas/vehicle-positions.pb';
$data = file_get_contents($url);
echo $data;
?>





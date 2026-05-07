<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://api.saint-etienne-metropole.fr/stas/api/horraires_tc/GTFS-RT.pb';
$data = file_get_contents($url);
echo $data;
?>

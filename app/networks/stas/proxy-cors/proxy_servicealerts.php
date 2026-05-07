<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://api.mrn.cityway.fr/dataflow/info-transport/download?provider=ASTUCE&dataFormat=gtfs-rt';
$data = file_get_contents($url);
echo $data;
?>

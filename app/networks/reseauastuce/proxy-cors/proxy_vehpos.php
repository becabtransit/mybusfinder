<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://api.mrn.cityway.fr/dataflow/vehicle-tc-tr/download?provider=TCAR&dataFormat=gtfs-rt';
$data = file_get_contents($url);
echo $data;
?>

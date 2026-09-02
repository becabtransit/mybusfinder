<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://accm.plateforme-2cloud.com/api/gtfsrt/2.0/tripupdates/ACCM-RSUD-4552-8552-5459/bin';
$data = file_get_contents($url);
echo $data;
?>

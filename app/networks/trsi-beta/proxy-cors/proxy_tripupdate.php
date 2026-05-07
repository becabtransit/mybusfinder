<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://www.data.gouv.fr/api/1/datasets/r/74db080b-3d7c-4f30-8811-b344e79f4092';
$data = file_get_contents($url);
echo $data;
?>

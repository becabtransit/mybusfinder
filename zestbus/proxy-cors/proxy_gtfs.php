<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://www.data.gouv.fr/fr/datasets/r/72609821-2459-47fb-a63b-3dbbc0d96c92';
$data = file_get_contents($url);
echo $data;
?>

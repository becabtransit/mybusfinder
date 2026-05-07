<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://transport.data.gouv.fr/resources/82273';
$data = file_get_contents($url);
echo $data;
?>

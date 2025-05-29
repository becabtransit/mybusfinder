<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://transport.data.gouv.fr/resources/80731/download';
$data = file_get_contents($url);
echo $data;
?>

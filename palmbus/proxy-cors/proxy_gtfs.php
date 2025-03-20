<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://www.data.gouv.fr/fr/datasets/r/47bc8088-6c72-43ad-a959-a5bbdd1aa14f';
$data = file_get_contents($url);
echo $data;
?>

<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://pysae.com/api/v2/groups/draguignan/gtfs-rt';
$data = file_get_contents($url);
echo $data;
?>

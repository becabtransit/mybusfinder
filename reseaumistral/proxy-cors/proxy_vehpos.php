<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = '';
$data = file_get_contents($url);
echo $data;
?>

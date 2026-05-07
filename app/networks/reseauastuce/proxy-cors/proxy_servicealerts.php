<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://hexatransit.fr/datasets/services_rt/astuce/service_alerts.pb';
$data = file_get_contents($url);
echo $data;
?>

<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://notify.ratpdev.com/api/networks/RD%20TPM/alerts/gtfsrt';
$data = file_get_contents($url);
echo $data;
?>

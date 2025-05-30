<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://gtfsrt.prod.obanyc.com/tripUpdates?key=95f7d9d0-ffb6-41dd-93ac-c79b6baa7db6';
$data = file_get_contents($url);
echo $data;
?>

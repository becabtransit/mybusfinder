<?php


$url = 'https://mybusfinder.fr/gtfsrt/trsi/vehicle_positions.pb';
$data = file_get_contents($url);
echo $data;
?>

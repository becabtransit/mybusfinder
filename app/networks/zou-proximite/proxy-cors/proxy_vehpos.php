<?php


$url = 'https://mybusfinder.fr/gtfsrt/zou-prox/vehicle_positions.pb';
$data = file_get_contents($url);
echo $data;
?>

<?php


$url = 'https://mybusfinder.fr/gtfsrt/zou-exp/vehicle_positions.pb';
$data = file_get_contents($url);
echo $data;
?>

<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = 'https://data.montpellier3m.fr/TAM_MMM_GTFSRT/Alert.pb';
$data = file_get_contents($url);
echo $data;
?>


https://accm.2cloud.app/api/gtfsrt/2.0/tripupdates/LUMIPLAN-2021-4815-1108/bin


https://accm.plateforme-2cloud.com/api/gtfsrt/2.0/tripupdates/ACCM-RSUD-4552-8552-5459/bin
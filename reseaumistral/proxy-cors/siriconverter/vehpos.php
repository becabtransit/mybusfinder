<?php
/**
 * Convertisseur SIRI vers GTFS-RT - Vehicle Positions
 * 
 * Ce script convertit les données SIRI (Service Interface for Real Time Information)
 * en format GTFS-RT (General Transit Feed Specification - Realtime) pour les positions des véhicules.
 * Par Becab Systems - pour MyBusFinder 3X
 * !!! A n'utiliser uniquement si vous ne disposez pas de données GTFSRT, les données sont peut être inexactes !
 */

require_once 'vendor/autoload.php';

use transit_realtime\FeedMessage;
use transit_realtime\FeedHeader;
use transit_realtime\FeedEntity;
use transit_realtime\VehiclePosition;
use transit_realtime\TripDescriptor;
use transit_realtime\Position;
use transit_realtime\VehicleDescriptor;

$config = [
    'siri_url' => 'https://saes.ratpdev.com/rdtpm', // URL du service SIRI
    'siri_api_key' => 'OPENDATA', // Clé API pour SIRI (si nécessaire)
    'agency_timezone' => 'Europe/Paris', // Fuseau horaire par défaut
];

/**
 * Récupère les données SIRI depuis le service
 * 
 * @return SimpleXMLElement Les données SIRI sous forme d'objet XML
 */
function fetchSiriData() {
    global $config;
    
    $options = [
        'http' => [
            'header' => "Content-Type: text/xml\r\n" .
                        "Authorization: " . $config['siri_api_key'] . "\r\n",
            'method' => 'POST',
            'content' => buildSiriRequest(),
            'timeout' => 30,
        ],
    ];
    
    $context = stream_context_create($options);
    $response = file_get_contents($config['siri_url'], false, $context);
    
    if ($response === false) {
        throw new Exception("Impossible de récupérer les données SIRI");
    }
    
    return new SimpleXMLElement($response);
}

/**
 * Construit la requête SIRI pour les positions des véhicules
 * 
 * @return string Requête SIRI au format XML
 */
function buildSiriRequest() {
    $timestamp = gmdate('Y-m-d\TH:i:s\Z');
    $messageId = 'VP_' . uniqid();
    
    return <<<XML
<Siri xmlns="http://www.siri.org.uk/siri" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="2.0">
    <ServiceRequest>
        <RequestTimestamp>{$timestamp}</RequestTimestamp>
        <RequestorRef>PHP_SIRI_CONVERTER</RequestorRef>
        <MessageIdentifier>{$messageId}</MessageIdentifier>
        <VehicleMonitoringRequest version="2.0">
            <RequestTimestamp>{$timestamp}</RequestTimestamp>
            <MessageIdentifier>{$messageId}</MessageIdentifier>
        </VehicleMonitoringRequest>
    </ServiceRequest>
</Siri>
XML;
}

/**
 * Convertit les données SIRI en protobuf GTFS-RT pour les positions de véhicules
 * 
 * @param SimpleXMLElement $siriData Les données SIRI
 * @return FeedMessage Message GTFS-RT
 */
function convertSiriToGtfsRtVehiclePositions($siriData) {
    $namespaces = $siriData->getNamespaces(true);
    $siri_ns = isset($namespaces['']) ? $namespaces[''] : 'http://www.siri.org.uk/siri';
    
    $feed = new FeedMessage();
    
    $header = new FeedHeader();
    $header->setGtfsRealtimeVersion('2.0');
    $header->setTimestamp(time());
    $feed->setHeader($header);
    
    $vehicleActivities = [];
    
    if (isset($siriData->ServiceDelivery)) {
        $serviceDelivery = $siriData->ServiceDelivery;
        
        if (isset($serviceDelivery->VehicleMonitoringDelivery)) {
            $vmDelivery = $serviceDelivery->VehicleMonitoringDelivery;
            
            if (isset($vmDelivery->VehicleActivity)) {
                foreach ($vmDelivery->VehicleActivity as $activity) {
                    $vehicleActivities[] = $activity;
                }
            }
        }
    }
    
    $entityId = 1;
    foreach ($vehicleActivities as $activity) {
        $entity = new FeedEntity();
        $entity->setId((string)$entityId++);
        
        $vehiclePosition = new VehiclePosition();
        
        if (isset($activity->VehicleLocation)) {
            $position = new Position();
            
            if (isset($activity->VehicleLocation->Longitude)) {
                $position->setLongitude(floatval((string)$activity->VehicleLocation->Longitude));
            }
            
            if (isset($activity->VehicleLocation->Latitude)) {
                $position->setLatitude(floatval((string)$activity->VehicleLocation->Latitude));
            }
            
            if (isset($activity->VehicleLocation->Bearing)) {
                $position->setBearing(floatval((string)$activity->VehicleLocation->Bearing));
            }
            
            if (isset($activity->VehicleLocation->Speed)) {
                $position->setSpeed(floatval((string)$activity->VehicleLocation->Speed));
            }
            
            $vehiclePosition->setPosition($position);
        }
        
        if (isset($activity->RecordedAtTime)) {
            $timestamp = strtotime((string)$activity->RecordedAtTime);
            $vehiclePosition->setTimestamp($timestamp);
        }
        
        if (isset($activity->MonitoredVehicleJourney->VehicleRef)) {
            $vehicleDesc = new VehicleDescriptor();
            $vehicleDesc->setId((string)$activity->MonitoredVehicleJourney->VehicleRef);
            
            if (isset($activity->MonitoredVehicleJourney->PublishedLineName)) {
                $vehicleDesc->setLabel((string)$activity->MonitoredVehicleJourney->PublishedLineName);
            }
            
            $vehiclePosition->setVehicle($vehicleDesc);
        }
        
        if (isset($activity->MonitoredVehicleJourney)) {
            $mvj = $activity->MonitoredVehicleJourney;
            $tripDescriptor = new TripDescriptor();
            
            if (isset($mvj->LineRef)) {
                $tripDescriptor->setRouteId((string)$mvj->LineRef);
            }
            
            if (isset($mvj->FramedVehicleJourneyRef->DatedVehicleJourneyRef)) {
                $tripDescriptor->setTripId((string)$mvj->FramedVehicleJourneyRef->DatedVehicleJourneyRef);
            }
            
            if (isset($mvj->DirectionRef)) {
                $tripDescriptor->setDirectionId(intval((string)$mvj->DirectionRef));
            }
            
            $vehiclePosition->setTrip($tripDescriptor);
            
            if (isset($mvj->VehicleStatus)) {
                $status = (string)$mvj->VehicleStatus;
                switch ($status) {
                    case 'inProgress':
                        $vehiclePosition->setCurrentStatus(VehiclePosition\VehicleStopStatus::IN_TRANSIT_TO);
                        break;
                    case 'atStop':
                        $vehiclePosition->setCurrentStatus(VehiclePosition\VehicleStopStatus::STOPPED_AT);
                        break;
                    default:
                        $vehiclePosition->setCurrentStatus(VehiclePosition\VehicleStopStatus::IN_TRANSIT_TO);
                        break;
                }
            }
            
            if (isset($mvj->InCongestion) && ((string)$mvj->InCongestion === 'true')) {
                $vehiclePosition->setCongestionLevel(VehiclePosition\CongestionLevel::CONGESTION);
            }
            
            if (isset($mvj->MonitoredCall) && isset($mvj->MonitoredCall->StopPointRef)) {
                $vehiclePosition->setStopId((string)$mvj->MonitoredCall->StopPointRef);
            }
        }
        
        $entity->setVehicle($vehiclePosition);
        
        $feed->addEntity($entity);
    }
    
    return $feed;
}

try {
    header('Content-Type: application/x-protobuf');
    
    $siriData = fetchSiriData();
    
    $gtfsRtFeed = convertSiriToGtfsRtVehiclePositions($siriData);
    
    echo $gtfsRtFeed->serializeToString();
    
} catch (Exception $e) {
    header('HTTP/1.1 500 Internal Server Error');
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
}
?>
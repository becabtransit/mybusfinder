<?php
/**
 * Convertisseur SIRI vers GTFS-RT - Trip Updates
 * 
 * Ce script convertit les données SIRI (Service Interface for Real Time Information)
 * en format GTFS-RT (General Transit Feed Specification - Realtime) pour les màj des trajets
 * Par Becab Systems - pour MyBusFinder 3X
 * !!! A n'utiliser uniquement si vous ne disposez pas de données GTFSRT, les données sont peut être inexactes !
 */

require_once 'vendor/autoload.php';

use transit_realtime\FeedMessage;
use transit_realtime\FeedHeader;
use transit_realtime\FeedEntity;
use transit_realtime\TripUpdate;
use transit_realtime\TripDescriptor;
use transit_realtime\StopTimeUpdate;
use transit_realtime\StopTimeEvent;

$config = [
    'siri_url' => 'https://votreserveur.com/siri-service', // URL du service SIRI
    'siri_api_key' => 'VOTRE_CLE_API', // Clé API  SIRI (si nécessaire)
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
 * Construit la requête SIRI pour les mises à jour de voyage
 * 
 * @return string Requête SIRI au format XML
 */
function buildSiriRequest() {
    $timestamp = gmdate('Y-m-d\TH:i:s\Z');
    $messageId = 'Trip_' . uniqid();
    
    return <<<XML
<Siri xmlns="http://www.siri.org.uk/siri" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="2.0">
    <ServiceRequest>
        <RequestTimestamp>{$timestamp}</RequestTimestamp>
        <RequestorRef>PHP_SIRI_CONVERTER</RequestorRef>
        <MessageIdentifier>{$messageId}</MessageIdentifier>
        <EstimatedTimetableRequest version="2.0">
            <RequestTimestamp>{$timestamp}</RequestTimestamp>
            <MessageIdentifier>{$messageId}</MessageIdentifier>
        </EstimatedTimetableRequest>
    </ServiceRequest>
</Siri>
XML;
}

/**
 * Convertit les données SIRI en protobuf GTFS-RT
 * 
 * @param SimpleXMLElement $siriData Les données SIRI
 * @return FeedMessage Message GTFS-RT
 */
function convertSiriToGtfsRtTripUpdates($siriData) {
    $namespaces = $siriData->getNamespaces(true);
    $siri_ns = isset($namespaces['']) ? $namespaces[''] : 'http://www.siri.org.uk/siri';
    
    $feed = new FeedMessage();
    
    $header = new FeedHeader();
    $header->setGtfsRealtimeVersion('2.0');
    $header->setTimestamp(time());
    $feed->setHeader($header);
    
    $estimatedJourneys = [];
    
    if (isset($siriData->ServiceDelivery)) {
        $serviceDelivery = $siriData->ServiceDelivery;
        
        if (isset($serviceDelivery->EstimatedTimetableDelivery)) {
            $etDelivery = $serviceDelivery->EstimatedTimetableDelivery;
            
            if (isset($etDelivery->EstimatedJourneyVersionFrame)) {
                foreach ($etDelivery->EstimatedJourneyVersionFrame as $journeyFrame) {
                    if (isset($journeyFrame->EstimatedVehicleJourney)) {
                        foreach ($journeyFrame->EstimatedVehicleJourney as $vehicleJourney) {
                            $estimatedJourneys[] = $vehicleJourney;
                        }
                    }
                }
            }
        }
    }
    
    $entityId = 1;
    foreach ($estimatedJourneys as $journey) {
        $entity = new FeedEntity();
        $entity->setId((string)$entityId++);
        
        $tripUpdate = new TripUpdate();
        
        $tripDescriptor = new TripDescriptor();
        
        $lineRef = isset($journey->LineRef) ? (string)$journey->LineRef : '';
        $journeyRef = isset($journey->DatedVehicleJourneyRef) ? (string)$journey->DatedVehicleJourneyRef : '';
        $tripId = $journeyRef;
        
        $tripDescriptor->setTripId($tripId);
        $tripDescriptor->setRouteId($lineRef);
        
        if (isset($journey->JourneyStatus)) {
            $status = (string)$journey->JourneyStatus;
            switch ($status) {
                case 'cancelled':
                    $tripDescriptor->setScheduleRelationship(TripDescriptor\ScheduleRelationship::CANCELED);
                    break;
                case 'added':
                    $tripDescriptor->setScheduleRelationship(TripDescriptor\ScheduleRelationship::ADDED);
                    break;
                default:
                    $tripDescriptor->setScheduleRelationship(TripDescriptor\ScheduleRelationship::SCHEDULED);
                    break;
            }
        }
        
        $tripUpdate->setTrip($tripDescriptor);
        
        if (isset($journey->EstimatedCalls) && isset($journey->EstimatedCalls->EstimatedCall)) {
            foreach ($journey->EstimatedCalls->EstimatedCall as $call) {
                $stopTimeUpdate = new StopTimeUpdate();
                
                $stopId = isset($call->StopPointRef) ? (string)$call->StopPointRef : '';
                $stopTimeUpdate->setStopId($stopId);
                
                if (isset($call->ExpectedArrivalTime)) {
                    $arrivalEvent = new StopTimeEvent();
                    $arrivalTime = strtotime((string)$call->ExpectedArrivalTime);
                    $arrivalEvent->setTime($arrivalTime);
                    
                    if (isset($call->ArrivalStatus) && (string)$call->ArrivalStatus === 'delayed') {
                        $arrivalEvent->setDelay(calculateDelay(
                            (string)$call->ExpectedArrivalTime, 
                            isset($call->AimedArrivalTime) ? (string)$call->AimedArrivalTime : ''
                        ));
                    }
                    
                    $stopTimeUpdate->setArrival($arrivalEvent);
                }
                
                if (isset($call->ExpectedDepartureTime)) {
                    $departureEvent = new StopTimeEvent();
                    $departureTime = strtotime((string)$call->ExpectedDepartureTime);
                    $departureEvent->setTime($departureTime);
                    
                    if (isset($call->DepartureStatus) && (string)$call->DepartureStatus === 'delayed') {
                        $departureEvent->setDelay(calculateDelay(
                            (string)$call->ExpectedDepartureTime, 
                            isset($call->AimedDepartureTime) ? (string)$call->AimedDepartureTime : ''
                        ));
                    }
                    
                    $stopTimeUpdate->setDeparture($departureEvent);
                }
                
                if (isset($call->Order)) {
                    $stopTimeUpdate->setStopSequence(intval((string)$call->Order));
                }
                
                $tripUpdate->addStopTimeUpdate($stopTimeUpdate);
            }
        }
        
        $entity->setTripUpdate($tripUpdate);
        
        $feed->addEntity($entity);
    }
    
    return $feed;
}

/**
 * Calcule le retard en secondes entre l'heure prévue et l'heure attendue
 * 
 * @param string $expectedTime Heure attendue
 * @param string $aimedTime Heure prévue
 * @return int Retard en secondes
 */
function calculateDelay($expectedTime, $aimedTime) {
    if (empty($expectedTime) || empty($aimedTime)) {
        return 0;
    }
    
    $expected = strtotime($expectedTime);
    $aimed = strtotime($aimedTime);
    
    return $expected - $aimed;
}

try {
    header('Content-Type: application/x-protobuf');
    
    $siriData = fetchSiriData();
    
    $gtfsRtFeed = convertSiriToGtfsRtTripUpdates($siriData);
    
    echo $gtfsRtFeed->serializeToString();
    
} catch (Exception $e) {
    header('HTTP/1.1 500 Internal Server Error');
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
}
?>
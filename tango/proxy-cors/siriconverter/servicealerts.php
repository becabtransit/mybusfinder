<?php
/**
 * Convertisseur SIRI vers GTFS-RT - Service Alerts
 * 
 * Ce script convertit les données SIRI (Service Interface for Real Time Information)
 * en format GTFS-RT (General Transit Feed Specification - Realtime) pour les alertes de service.
 * Par Becab Systems - pour MyBusFinder 3X
 * !!! A n'utiliser uniquement si vous ne disposez pas de données GTFSRT, les données sont peut être inexactes !
 */

require_once 'vendor/autoload.php';

use transit_realtime\FeedMessage;
use transit_realtime\FeedHeader;
use transit_realtime\FeedEntity;
use transit_realtime\Alert;
use transit_realtime\EntitySelector;
use transit_realtime\TimeRange;
use transit_realtime\TranslatedString;
use transit_realtime\TranslatedString\Translation;

// Configuration
$config = [
    'siri_url' => 'https://votreserveur.com/siri-service', // URL du service SIRI
    'siri_api_key' => 'VOTRE_CLE_API', // Clé API pour SIRI (si nécessaire)
    'agency_timezone' => 'Europe/Paris', // Fuseau horaire par défaut
    'default_language' => 'fr', // Langue pour les message
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
 * Construit la requête SIRI pour les alertes de service
 * 
 * @return string Requête SIRI au format XML
 */
function buildSiriRequest() {
    $timestamp = gmdate('Y-m-d\TH:i:s\Z');
    $messageId = 'SA_' . uniqid();
    
    return <<<XML
<Siri xmlns="http://www.siri.org.uk/siri" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="2.0">
    <ServiceRequest>
        <RequestTimestamp>{$timestamp}</RequestTimestamp>
        <RequestorRef>PHP_SIRI_CONVERTER</RequestorRef>
        <MessageIdentifier>{$messageId}</MessageIdentifier>
        <SituationExchangeRequest version="2.0">
            <RequestTimestamp>{$timestamp}</RequestTimestamp>
            <MessageIdentifier>{$messageId}</MessageIdentifier>
        </SituationExchangeRequest>
    </ServiceRequest>
</Siri>
XML;
}

/**
 * Convertit les données SIRI en protobuf GTFS-RT pour les alertes de service
 * 
 * @param SimpleXMLElement $siriData Les données SIRI
 * @return FeedMessage Message GTFS-RT
 */
function convertSiriToGtfsRtServiceAlerts($siriData) {
    $namespaces = $siriData->getNamespaces(true);
    $siri_ns = isset($namespaces['']) ? $namespaces[''] : 'http://www.siri.org.uk/siri';
    
    $feed = new FeedMessage();
    
    $header = new FeedHeader();
    $header->setGtfsRealtimeVersion('2.0');
    $header->setTimestamp(time());
    $feed->setHeader($header);
    
    $situations = [];
    
    if (isset($siriData->ServiceDelivery)) {
        $serviceDelivery = $siriData->ServiceDelivery;
        
        if (isset($serviceDelivery->SituationExchangeDelivery)) {
            $sxDelivery = $serviceDelivery->SituationExchangeDelivery;
            
            if (isset($sxDelivery->Situations) && isset($sxDelivery->Situations->PtSituationElement)) {
                foreach ($sxDelivery->Situations->PtSituationElement as $situation) {
                    $situations[] = $situation;
                }
            }
        }
    }
    
    $entityId = 1;
    foreach ($situations as $situation) {
        $entity = new FeedEntity();
        $entity->setId(isset($situation->SituationNumber) ? (string)$situation->SituationNumber : (string)$entityId++);
        
        $alert = new Alert();
        
        if (isset($situation->ValidityPeriod)) {
            foreach ($situation->ValidityPeriod as $period) {
                $timeRange = new TimeRange();
                
                if (isset($period->StartTime)) {
                    $timeRange->setStart(strtotime((string)$period->StartTime));
                }
                
                if (isset($period->EndTime)) {
                    $timeRange->setEnd(strtotime((string)$period->EndTime));
                }
                
                $alert->addActivePeriod($timeRange);
            }
        }
        
        if (isset($situation->Affects)) {
            if (isset($situation->Affects->StopPoints) && isset($situation->Affects->StopPoints->AffectedStopPoint)) {
                foreach ($situation->Affects->StopPoints->AffectedStopPoint as $stopPoint) {
                    $selector = new EntitySelector();
                    if (isset($stopPoint->StopPointRef)) {
                        $selector->setStopId((string)$stopPoint->StopPointRef);
                        $alert->addInformedEntity($selector);
                    }
                }
            }
            
            if (isset($situation->Affects->VehicleJourneys) && isset($situation->Affects->VehicleJourneys->AffectedVehicleJourney)) {
                foreach ($situation->Affects->VehicleJourneys->AffectedVehicleJourney as $journey) {
                    $selector = new EntitySelector();
                    
                    if (isset($journey->LineRef)) {
                        $selector->setRouteId((string)$journey->LineRef);
                    }
                    
                    if (isset($journey->DatedVehicleJourneyRef)) {
                        $selector->setTripId((string)$journey->DatedVehicleJourneyRef);
                    }
                    
                    $alert->addInformedEntity($selector);
                }
            }
            
            if (isset($situation->Affects->Networks) && isset($situation->Affects->Networks->AffectedNetwork)) {
                foreach ($situation->Affects->Networks->AffectedNetwork as $network) {
                    if (isset($network->AffectedOperator) && isset($network->AffectedOperator->OperatorRef)) {
                        $selector = new EntitySelector();
                        $selector->setAgencyId((string)$network->AffectedOperator->OperatorRef);
                        $alert->addInformedEntity($selector);
                    }
                }
            }
        }
        
        if (isset($situation->ReasonType)) {
            $cause = mapSiriCauseToGtfsCause((string)$situation->ReasonType);
            $alert->setCause($cause);
        }
        
        if (isset($situation->Consequence) && isset($situation->Consequence->Severity)) {
            $effect = mapSiriSeverityToGtfsEffect((string)$situation->Consequence->Severity);
            $alert->setEffect($effect);
        }
        
        if (isset($situation->Summary)) {
            $summary = new TranslatedString();
            $translation = new Translation();
            $translation->setText((string)$situation->Summary);
            $translation->setLanguage($config['default_language']);
            $summary->addTranslation($translation);
            $alert->setHeaderText($summary);
        }
        
        if (isset($situation->Description)) {
            $description = new TranslatedString();
            $translation = new Translation();
            $translation->setText((string)$situation->Description);
            $translation->setLanguage($config['default_language']);
            $description->addTranslation($translation);
            $alert->setDescriptionText($description);
        }
        
        if (isset($situation->Advice) && isset($situation->Advice->AdviceText)) {
            $advice = new TranslatedString();
            $translation = new Translation();
            $translation->setText((string)$situation->Advice->AdviceText);
            $translation->setLanguage($config['default_language']);
            $advice->addTranslation($translation);
            $alert->setUrl($advice);
        }
        
        $entity->setAlert($alert);
        
        $feed->addEntity($entity);
    }
    
    return $feed;
}

/**
 * Mappe les causes SIRI vers les causes GTFS-RT
 * 
 * @param string $siriCause Cause au format SIRI
 * @return int Cause au format GTFS-RT
 */
function mapSiriCauseToGtfsCause($siriCause) {
    $causeMap = [
        'accident' => Alert\Cause::ACCIDENT,
        'congestion' => Alert\Cause::CONGESTION,
        'constructionWork' => Alert\Cause::CONSTRUCTION,
        'demonstration' => Alert\Cause::DEMONSTRATION,
        'disaster' => Alert\Cause::OTHER_CAUSE,
        'equipment' => Alert\Cause::TECHNICAL_PROBLEM,
        'holiday' => Alert\Cause::HOLIDAY,
        'maintenance' => Alert\Cause::MAINTENANCE,
        'medical' => Alert\Cause::MEDICAL_EMERGENCY,
        'police' => Alert\Cause::POLICE_ACTIVITY,
        'staff' => Alert\Cause::STRIKE,
        'technicalProblem' => Alert\Cause::TECHNICAL_PROBLEM,
        'vandalism' => Alert\Cause::TECHNICAL_PROBLEM,
        'weather' => Alert\Cause::WEATHER
    ];
    
    return isset($causeMap[$siriCause]) ? $causeMap[$siriCause] : Alert\Cause::UNKNOWN_CAUSE;
}

/**
 * Mappe les sévérités SIRI vers les effets GTFS-RT
 * 
 * @param string $siriSeverity Sévérité au format SIRI
 * @return int Effet au format GTFS-RT
 */
function mapSiriSeverityToGtfsEffect($siriSeverity) {
    $effectMap = [
        'noService' => Alert\Effect::NO_SERVICE,
        'reducedService' => Alert\Effect::REDUCED_SERVICE,
        'delayedService' => Alert\Effect::SIGNIFICANT_DELAYS,
        'diversionService' => Alert\Effect::DETOUR,
        'additionalService' => Alert\Effect::ADDITIONAL_SERVICE,
        'modifiedService' => Alert\Effect::MODIFIED_SERVICE,
        'normal' => Alert\Effect::OTHER_EFFECT
    ];
    
    return isset($effectMap[$siriSeverity]) ? $effectMap[$siriSeverity] : Alert\Effect::UNKNOWN_EFFECT;
}

try {
    header('Content-Type: application/x-protobuf');
    
    $siriData = fetchSiriData();
    
    $gtfsRtFeed = convertSiriToGtfsRtServiceAlerts($siriData);
    
    echo $gtfsRtFeed->serializeToString();
    
} catch (Exception $e) {
    header('HTTP/1.1 500 Internal Server Error');
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
}
?>
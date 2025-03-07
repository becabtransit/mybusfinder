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

// Charger la configuration depuis un fichier ou utiliser des valeurs par défaut
$configFile = __DIR__ . '/config.php';
$defaultConfig = [
    'siri_url' => 'https://api.okina.fr/gateway/cae/realtime/anshar/ws/services', // URL du service SIRI
    'siri_api_key' => 'opendata', // Clé API pour SIRI
    'agency_timezone' => 'Europe/Paris', // Fuseau horaire par défaut
    'request_timeout' => 30, // Timeout en secondes
    'retry_delay' => 5, // Délai entre les tentatives en secondes
    'max_retries' => 3, // Nombre maximum de tentatives
    'log_file' => __DIR__ . '/siri_conversion.log', // Fichier de log
];

$config = file_exists($configFile) ? array_merge($defaultConfig, include($configFile)) : $defaultConfig;

/**
 * Fonction de journalisation
 * 
 * @param string $message Message à journaliser
 * @param string $level Niveau de journalisation (INFO, ERROR, WARNING)
 */
function logMessage($message, $level = 'INFO') {
    global $config;
    
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] [$level] $message" . PHP_EOL;
    
    // Journaliser dans un fichier
    if (!empty($config['log_file'])) {
        file_put_contents($config['log_file'], $logEntry, FILE_APPEND);
    }
    
    // En mode développement, afficher également dans la console
    if (defined('DEVELOPMENT_MODE') && DEVELOPMENT_MODE) {
        error_log($logEntry);
    }
}

/**
 * Récupère les données SIRI depuis le service avec gestion des erreurs et tentatives
 * 
 * @return SimpleXMLElement|null Les données SIRI sous forme d'objet XML ou null en cas d'échec
 */
function fetchSiriData() {
    global $config;
    
    $retries = 0;
    $maxRetries = $config['max_retries'];
    
    while ($retries <= $maxRetries) {
        try {
            $options = [
                'http' => [
                    'header' => "Content-Type: text/xml\r\n",
                    'method' => 'POST',
                    'content' => buildSiriRequest(),
                    'timeout' => $config['request_timeout'],
                ],
            ];
            
            // Ajouter l'authentification si une clé API est spécifiée
            if (!empty($config['siri_api_key'])) {
                $options['http']['header'] .= "Authorization: Bearer " . $config['siri_api_key'] . "\r\n";
            }
            
            $context = stream_context_create($options);
            $response = @file_get_contents($config['siri_url'], false, $context);
            
            // Récupérer les en-têtes de réponse HTTP
            $responseHeaders = $http_response_header ?? [];
            $statusLine = $responseHeaders[0] ?? '';
            
            // Extraire le code de statut HTTP
            preg_match('/^HTTP\/\d\.\d\s+(\d+)/', $statusLine, $matches);
            $statusCode = isset($matches[1]) ? (int)$matches[1] : 0;
            
            // Gérer les codes d'erreur HTTP
            if ($statusCode === 429) {
                $retries++;
                $delay = $config['retry_delay'] * $retries; // Augmentation exponentielle du délai
                logMessage("Limite de taux atteinte (HTTP 429). Nouvelle tentative dans $delay secondes. Tentative $retries/$maxRetries", 'WARNING');
                sleep($delay);
                continue;
            } elseif ($statusCode >= 400) {
                logMessage("Erreur HTTP $statusCode lors de la requête SIRI: $statusLine", 'ERROR');
                return null;
            }
            
            // Vérifier que la réponse n'est pas vide
            if ($response === false || empty($response)) {
                throw new Exception("Réponse SIRI vide ou erreur de récupération");
            }
            
            // Analyser la réponse XML
            libxml_use_internal_errors(true);
            $xml = simplexml_load_string($response);
            
            if ($xml === false) {
                $errors = libxml_get_errors();
                $errorMessage = "Erreur d'analyse XML: ";
                foreach ($errors as $error) {
                    $errorMessage .= "Ligne {$error->line}: {$error->message}; ";
                }
                libxml_clear_errors();
                throw new Exception($errorMessage);
            }
            
            // Enregistrer le succès et retourner les données
            logMessage("Données SIRI récupérées avec succès", 'INFO');
            return $xml;
            
        } catch (Exception $e) {
            $retries++;
            if ($retries > $maxRetries) {
                logMessage("Échec définitif après $maxRetries tentatives: " . $e->getMessage(), 'ERROR');
                return null;
            }
            
            $delay = $config['retry_delay'] * $retries;
            logMessage("Erreur lors de la tentative $retries/$maxRetries: " . $e->getMessage() . ". Nouvelle tentative dans $delay secondes", 'WARNING');
            sleep($delay);
        }
    }
    
    return null;
}

/**
 * Construit la requête SIRI pour les positions des véhicules
 * 
 * @return string Requête SIRI au format XML
 */
function buildSiriRequest() {
    // Définir le fuseau horaire pour les timestamps
    global $config;
    $originalTz = date_default_timezone_get();
    date_default_timezone_set($config['agency_timezone']);
    
    $timestamp = gmdate('Y-m-d\TH:i:s\Z');
    $messageId = 'VP_' . uniqid();
    
    // Restaurer le fuseau horaire original
    date_default_timezone_set($originalTz);
    
    return <<<XML
<Siri xmlns="http://www.siri.org.uk/siri" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="2.0">
    <ServiceRequest>
        <RequestTimestamp>{$timestamp}</RequestTimestamp>
        <RequestorRef>{$config['siri_api_key']}</RequestorRef>
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
    // Gérer les espaces de noms XML correctement
    $namespaces = $siriData->getNamespaces(true);
    $siri_ns = $namespaces[''] ?? 'http://www.siri.org.uk/siri';
    
    // Enregistrer les espaces de noms pour les requêtes XPath
    $siriData->registerXPathNamespace('siri', $siri_ns);
    
    $feed = new FeedMessage();
    
    $header = new FeedHeader();
    $header->setGtfsRealtimeVersion('2.0');
    $header->setTimestamp(time());
    $feed->setHeader($header);
    
    // Récupérer les activités de véhicule via XPath pour une meilleure gestion des espaces de noms
    $vehicleActivities = $siriData->xpath('//siri:VehicleActivity');
    
    if (empty($vehicleActivities)) {
        logMessage("Aucune activité de véhicule trouvée dans les données SIRI", 'WARNING');
    }
    
    $entityId = 1;
    foreach ($vehicleActivities as $activity) {
        try {
            $entity = new FeedEntity();
            $entity->setId((string)$entityId++);
            
            $vehiclePosition = new VehiclePosition();
            
            // Récupérer la position du véhicule
            $location = $activity->xpath('./siri:VehicleLocation');
            if (!empty($location) && isset($location[0])) {
                $position = new Position();
                
                // Longitude
                $longitude = $location[0]->xpath('./siri:Longitude');
                if (!empty($longitude) && isset($longitude[0])) {
                    $longitudeValue = (string)$longitude[0];
                    if (is_numeric($longitudeValue)) {
                        $position->setLongitude(floatval($longitudeValue));
                    }
                }
                
                // Latitude
                $latitude = $location[0]->xpath('./siri:Latitude');
                if (!empty($latitude) && isset($latitude[0])) {
                    $latitudeValue = (string)$latitude[0];
                    if (is_numeric($latitudeValue)) {
                        $position->setLatitude(floatval($latitudeValue));
                    }
                }
                
                // Bearing (cap)
                $bearing = $location[0]->xpath('./siri:Bearing');
                if (!empty($bearing) && isset($bearing[0])) {
                    $bearingValue = (string)$bearing[0];
                    if (is_numeric($bearingValue)) {
                        $position->setBearing(floatval($bearingValue));
                    }
                }
                
                // Speed (vitesse)
                $speed = $location[0]->xpath('./siri:Speed');
                if (!empty($speed) && isset($speed[0])) {
                    $speedValue = (string)$speed[0];
                    if (is_numeric($speedValue)) {
                        $position->setSpeed(floatval($speedValue));
                    }
                }
                
                $vehiclePosition->setPosition($position);
            }
            
            // Timestamp
            $recordedAtTime = $activity->xpath('./siri:RecordedAtTime');
            if (!empty($recordedAtTime) && isset($recordedAtTime[0])) {
                $timestampStr = (string)$recordedAtTime[0];
                if (!empty($timestampStr)) {
                    $timestamp = strtotime($timestampStr);
                    if ($timestamp !== false) {
                        $vehiclePosition->setTimestamp($timestamp);
                    }
                }
            }
            
            // Monitored Vehicle Journey (trajet de véhicule surveillé)
            $mvj = $activity->xpath('./siri:MonitoredVehicleJourney');
            if (!empty($mvj) && isset($mvj[0])) {
                
                // Descripteur de véhicule
                $vehicleRef = $mvj[0]->xpath('./siri:VehicleRef');
                if (!empty($vehicleRef) && isset($vehicleRef[0])) {
                    $vehicleDesc = new VehicleDescriptor();
                    $vehicleDesc->setId((string)$vehicleRef[0]);
                    
                    $lineName = $mvj[0]->xpath('./siri:PublishedLineName');
                    if (!empty($lineName) && isset($lineName[0])) {
                        $vehicleDesc->setLabel((string)$lineName[0]);
                    }
                    
                    $vehiclePosition->setVehicle($vehicleDesc);
                }
                
                // Descripteur de trajet
                $tripDescriptor = new TripDescriptor();
                
                $lineRef = $mvj[0]->xpath('./siri:LineRef');
                if (!empty($lineRef) && isset($lineRef[0])) {
                    $tripDescriptor->setRouteId((string)$lineRef[0]);
                }
                
                $journeyRef = $mvj[0]->xpath('./siri:FramedVehicleJourneyRef/siri:DatedVehicleJourneyRef');
                if (!empty($journeyRef) && isset($journeyRef[0])) {
                    $tripDescriptor->setTripId((string)$journeyRef[0]);
                }
                
                $directionRef = $mvj[0]->xpath('./siri:DirectionRef');
                if (!empty($directionRef) && isset($directionRef[0])) {
                    $directionValue = (string)$directionRef[0];
                    if (is_numeric($directionValue)) {
                        $tripDescriptor->setDirectionId(intval($directionValue));
                    }
                }
                
                $vehiclePosition->setTrip($tripDescriptor);
                
                // Statut du véhicule
                $vehicleStatus = $mvj[0]->xpath('./siri:VehicleStatus');
                if (!empty($vehicleStatus) && isset($vehicleStatus[0])) {
                    $status = (string)$vehicleStatus[0];
                    switch ($status) {
                        case 'atStop':
                            $vehiclePosition->setCurrentStatus(VehiclePosition\VehicleStopStatus::STOPPED_AT);
                            break;
                        case 'inProgress':
                        default:
                            $vehiclePosition->setCurrentStatus(VehiclePosition\VehicleStopStatus::IN_TRANSIT_TO);
                            break;
                    }
                }
                
                // Congestion
                $inCongestion = $mvj[0]->xpath('./siri:InCongestion');
                if (!empty($inCongestion) && isset($inCongestion[0]) && strtolower((string)$inCongestion[0]) === 'true') {
                    $vehiclePosition->setCongestionLevel(VehiclePosition\CongestionLevel::CONGESTION);
                }
                
                // Arrêt moniteur
                $stopPointRef = $mvj[0]->xpath('./siri:MonitoredCall/siri:StopPointRef');
                if (!empty($stopPointRef) && isset($stopPointRef[0])) {
                    $vehiclePosition->setStopId((string)$stopPointRef[0]);
                }
            }
            
            $entity->setVehicle($vehiclePosition);
            $feed->addEntity($entity);
            
        } catch (Exception $e) {
            logMessage("Erreur lors du traitement d'une activité de véhicule: " . $e->getMessage(), 'ERROR');
            // Continuer avec le prochain véhicule
        }
    }
    
    return $feed;
}

// Point d'entrée principal
try {
    // Définir le mode de développement (changer en production)
    define('DEVELOPMENT_MODE', false);
    
    // Récupérer les données SIRI
    $siriData = fetchSiriData();
    
    if ($siriData === null) {
        throw new Exception("Impossible de récupérer les données SIRI après plusieurs tentatives");
    }
    
    // Convertir en GTFS-RT
    $gtfsRtFeed = convertSiriToGtfsRtVehiclePositions($siriData);
    
    // Vérifier si nous avons des entités
    $entityCount = count($gtfsRtFeed->getEntity());
    logMessage("Conversion réussie: $entityCount entités générées", 'INFO');
    
    if ($entityCount === 0) {
        // Si aucune entité n'a été générée, renvoyer une réponse vide mais valide
        logMessage("Aucune entité générée. Envoi d'un flux GTFS-RT vide", 'WARNING');
    }
    
    // Définir l'en-tête Content-Type approprié et envoyer la réponse
    header('Content-Type: application/x-protobuf');
    echo $gtfsRtFeed->serializeToString();
    
} catch (Exception $e) {
    // Journaliser l'erreur
    logMessage("Erreur critique: " . $e->getMessage(), 'ERROR');
    
    // Envoyer une réponse d'erreur HTTP
    header('HTTP/1.1 500 Internal Server Error');
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
}
<?php
/**
 * Endpoint pour récupérer tous les trips (lignes) d'un jour
 * Retourne les trips du jour triés par heure, avec les horaires de début et fin
 * 
 * Paramètres:
 * - network: le réseau (ex: palmbus)
 * - serviceId (optionnel): le service_id du jour (par défaut: aujourd'hui)
 */

@ini_set('memory_limit', '4096M');
set_time_limit(180);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, HEAD, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

function jsonError($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

$network = isset($_GET['network']) ? preg_replace('/[^a-z0-9_-]/i', '', $_GET['network']) : '';

if (!$network) {
    jsonError('Paramètre network requis', 400);
}

// Charger l'index des réseaux
$indexPath = realpath(__DIR__ . '/../../networks-index.json');
if (!$indexPath || !file_exists($indexPath)) {
    jsonError('Index des réseaux introuvable', 500);
}

$index = json_decode(file_get_contents($indexPath), true);
if (!$index || !isset($index['groups'])) {
    jsonError('Format de l\'index invalide', 500);
}

// Trouver le réseau
$entry = null;
foreach ($index['groups'] as $group) {
    foreach (($group['networks'] ?? []) as $networkEntry) {
        if (($networkEntry['id'] ?? '') === $network) {
            $entry = $networkEntry;
            break 2;
        }
    }
}

if (!$entry) {
    jsonError('Réseau non trouvé: ' . $network, 404);
}

// Chemins des fichiers en cache
$cacheDir = __DIR__ . '/cache/' . $network;
$extractDir = $cacheDir . '/extracted';
$stopTimesFile = $extractDir . '/stop_times.txt';
$routesFile = $extractDir . '/routes.txt';
$tripsFile = $extractDir . '/trips.txt';
$calendarFile = $extractDir . '/calendar.txt';
$calendarDatesFile = $extractDir . '/calendar_dates.txt';

// Vérifier que les fichiers existent
if (!file_exists($stopTimesFile) || !file_exists($tripsFile) || !file_exists($routesFile)) {
    jsonError('Données GTFS non disponibles pour ce réseau', 503);
}

// Déterminer le service_id du jour
$dayOfWeek = strtolower(date('l')); // 'Monday', 'Tuesday', etc.
$dayMap = ['monday' => 'monday', 'tuesday' => 'tuesday', 'wednesday' => 'wednesday', 
           'thursday' => 'thursday', 'friday' => 'friday', 'saturday' => 'saturday', 'sunday' => 'sunday'];
$serviceId = null;

// Chercher le service_id pour aujourd'hui
if (file_exists($calendarFile) && ($fh = fopen($calendarFile, 'r')) !== false) {
    $headers = fgetcsv($fh);
    $headerMap = array_flip($headers);
    
    while (($row = fgetcsv($fh)) !== false) {
        $sId = $row[$headerMap['service_id']] ?? null;
        $dayField = $dayMap[$dayOfWeek] ?? 'monday';
        $dayValue = $row[$headerMap[$dayField]] ?? '0';
        
        if ($sId && $dayValue === '1') {
            $serviceId = $sId;
            break;
        }
    }
    fclose($fh);
}

// Charger les routes
$routes = [];
if (($fh = fopen($routesFile, 'r')) !== false) {
    $headers = fgetcsv($fh);
    $headerMap = array_flip($headers);
    
    while (($row = fgetcsv($fh)) !== false) {
        $routeId = $row[$headerMap['route_id']] ?? null;
        if ($routeId) {
            $routes[$routeId] = [
                'short_name' => $row[$headerMap['route_short_name']] ?? '',
                'long_name' => $row[$headerMap['route_long_name']] ?? '',
                'color' => $row[$headerMap['route_color']] ?? 'CCCCCC'
            ];
        }
    }
    fclose($fh);
}

// Charger les trips pour le service_id d'aujourd'hui
$trips = [];
if (($fh = fopen($tripsFile, 'r')) !== false) {
    $headers = fgetcsv($fh);
    $headerMap = array_flip($headers);
    
    while (($row = fgetcsv($fh)) !== false) {
        $tripId = $row[$headerMap['trip_id']] ?? null;
        $sId = $row[$headerMap['service_id']] ?? null;
        
        if ($tripId && (!$serviceId || $sId === $serviceId)) {
            $trips[$tripId] = [
                'route_id' => $row[$headerMap['route_id']] ?? '',
                'service_id' => $sId,
                'headsign' => $row[$headerMap['trip_headsign']] ?? '',
                'direction_id' => $row[$headerMap['direction_id']] ?? 0
            ];
        }
    }
    fclose($fh);
}

if (count($trips) === 0) {
    echo json_encode([
        'success' => true,
        'trips' => [],
        'message' => 'Aucun trip trouvé pour aujourd\'hui',
        'dayOfWeek' => $dayOfWeek,
        'serviceId' => $serviceId
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Charger les stop times pour ces trips
$tripSchedules = [];
if (($fh = fopen($stopTimesFile, 'r')) !== false) {
    $headers = fgetcsv($fh);
    $headerMap = array_flip($headers);
    
    while (($row = fgetcsv($fh)) !== false) {
        $tripId = $row[$headerMap['trip_id']] ?? null;
        
        if ($tripId && isset($trips[$tripId])) {
            $stopSequence = $row[$headerMap['stop_sequence']] ?? 0;
            $arrivalTime = $row[$headerMap['arrival_time']] ?? '';
            $departureTime = $row[$headerMap['departure_time']] ?? '';
            
            if (!isset($tripSchedules[$tripId])) {
                $tripSchedules[$tripId] = [
                    'stops' => [],
                    'firstTime' => null,
                    'lastTime' => null
                ];
            }
            
            $useTime = $departureTime ?: $arrivalTime;
            
            if ($useTime) {
                if ($tripSchedules[$tripId]['firstTime'] === null) {
                    $tripSchedules[$tripId]['firstTime'] = $useTime;
                }
                $tripSchedules[$tripId]['lastTime'] = $useTime;
                
                $tripSchedules[$tripId]['stops'][] = [
                    'sequence' => $stopSequence,
                    'arrival' => $arrivalTime,
                    'departure' => $departureTime
                ];
            }
        }
    }
    fclose($fh);
}

// Construire la réponse avec les trips du jour
$result = [];

foreach ($trips as $tripId => $tripData) {
    $schedule = $tripSchedules[$tripId] ?? null;
    
    if ($schedule && $schedule['firstTime']) {
        $route = $routes[$tripData['route_id']] ?? [
            'short_name' => 'N/A',
            'long_name' => 'Ligne inconnue',
            'color' => 'CCCCCC'
        ];
        
        $result[] = [
            'tripId' => $tripId,
            'routeId' => $tripData['route_id'],
            'routeName' => $route['short_name'] ?: $route['long_name'],
            'routeColor' => $route['color'],
            'headsign' => $tripData['headsign'],
            'startTime' => $schedule['firstTime'],
            'endTime' => $schedule['lastTime'],
            'stopCount' => count($schedule['stops'])
        ];
    }
}

// Trier par heure de début
usort($result, function($a, $b) {
    return strcmp($a['startTime'], $b['startTime']);
});

echo json_encode([
    'success' => true,
    'trips' => array_slice($result, 0, 100), // Limiter à 100 trips pour performance
    'totalTrips' => count($result),
    'dayOfWeek' => $dayOfWeek,
    'serviceId' => $serviceId
], JSON_UNESCAPED_UNICODE);
exit;
?>

<?php
@ini_set('memory_limit', '4096M');
set_time_limit(180);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, HEAD, OPTIONS");
header("Access-Control-Allow-Headers: X-Content-Only-Header");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$url = 'https://www.data.gouv.fr/api/1/datasets/r/52216d2f-072e-4b7d-af0c-15d8d4e98b09';
$cacheDir = __DIR__ . '/cache';
$extractDir = $cacheDir . '/extracted';
$coreCacheFile = $cacheDir . '/gtfs_core.json';
$tripIndexFile = $cacheDir . '/trip_index.json';
$zipCacheFile = $cacheDir . '/gtfs.zip';
$cacheMarkerFile = $cacheDir . '/cache_created.txt';
$cacheTTL = 4 * 24 * 60 * 60; 

$optimizedCoreFile = $cacheDir . '/gtfs_core_optimized.json.gz';
$optimizedRoutesFile = $cacheDir . '/gtfs_routes_optimized.json.gz';
$optimizedStopsFile = $cacheDir . '/gtfs_stops_optimized.json.gz';

$debug = isset($_GET['debug']);

if (!is_dir($cacheDir)) mkdir($cacheDir, 0755, true);
if (!is_dir($extractDir)) mkdir($extractDir, 0755, true);

function checkAndCleanExpiredCache($cacheDir, $cacheMarkerFile, $cacheTTL) {
    if (!file_exists($cacheMarkerFile)) {
        file_put_contents($cacheMarkerFile, time());
        return;
    }
    
    $cacheCreationTime = (int)file_get_contents($cacheMarkerFile);
    $cacheAge = time() - $cacheCreationTime;
    
    if ($cacheAge > $cacheTTL) {
        $files = glob($cacheDir . '/*.{json,gz}', GLOB_BRACE);
        foreach ($files as $file) {
            if (is_file($file)) unlink($file);
        }
        
        $extractDir = $cacheDir . '/extracted';
        if (is_dir($extractDir)) {
            $extractedFiles = glob($extractDir . '/*.txt');
            foreach ($extractedFiles as $file) {
                if (is_file($file)) unlink($file);
            }
        }

        if (is_dir($extractDir . '/../shards')) {
            $shardFiles = glob($extractDir . '/../shards/*.json.gz');
            foreach ($shardFiles as $file) {
                unlink($file);
            }
        }
        
        file_put_contents($cacheMarkerFile, time());
    }
}

checkAndCleanExpiredCache($cacheDir, $cacheMarkerFile, $cacheTTL);

function parseCSVStream($filepath, $callback, $maxRows = null) {
    if (!file_exists($filepath)) return 0;
    
    $fh = fopen($filepath, 'r');
    if (!$fh) return 0;
    
    $headers = fgetcsv($fh);
    if (!$headers) {
        fclose($fh);
        return 0;
    }
    
    $count = 0;
    while (($row = fgetcsv($fh)) !== false) {
        if ($maxRows && $count >= $maxRows) break;
        
        $item = [];
        foreach ($headers as $i => $header) {
            $item[trim($header)] = isset($row[$i]) ? trim($row[$i]) : '';
        }
        
        $callback($item);
        $count++;
        
        if ($count % 1000 === 0) {
            gc_collect_cycles();
        }
    }
    fclose($fh);
    
    return $count;
}

function createOptimizedRoutes($extractDir, $outputFile) {
    $routes = [];
    
    parseCSVStream($extractDir . '/routes.txt', function($item) use (&$routes) {
        $routeId = $item['route_id'] ?? '';
        if ($routeId) {
            $routes[$routeId] = [
                's' => $item['route_short_name'] ?? '',
                'l' => $item['route_long_name'] ?? '',
                'c' => $item['route_color'] ?? 'FFFFFF',
                't' => $item['route_text_color'] ?? '000000'
            ];
        }
    });
    
    $json = json_encode($routes);
    $compressed = gzencode($json, 9);
    file_put_contents($outputFile, $compressed);
    
    unset($routes, $json);
    gc_collect_cycles();
    
    return true;
}

function createOptimizedStops($extractDir, $outputFile) {
    $stops = [];
    
    parseCSVStream($extractDir . '/stops.txt', function($item) use (&$stops) {
        $stopId = $item['stop_id'] ?? '';
        if ($stopId) {
            $stops[$stopId] = [
                'n' => $item['stop_name'] ?? '',
                'lat' => $item['stop_lat'] ?? '',
                'lon' => $item['stop_lon'] ?? '' 
            ];
        }
    });
    
    $json = json_encode($stops);
    $compressed = gzencode($json, 9);
    file_put_contents($outputFile, $compressed);
    
    unset($stops, $json);
    gc_collect_cycles();
    
    return true;
}

function createOptimizedCore($extractDir, $routesFile, $stopsFile, $outputFile) {
    $routesCompressed = file_get_contents($routesFile);
    $routesJson = gzdecode($routesCompressed);
    $routes = json_decode($routesJson, true);
    
    $stopsCompressed = file_get_contents($stopsFile);
    $stopsJson = gzdecode($stopsCompressed);
    $stops = json_decode($stopsJson, true);
    
    $routesExpanded = [];
    foreach ($routes as $id => $r) {
        $routesExpanded[$id] = [
            's' => $r['s'],
            'l' => $r['l'],
            'c' => $r['c'],
            't' => $r['t']
        ];
    }
    
    $stopsExpanded = [];
    foreach ($stops as $id => $s) {
        $stopsExpanded[$id] = [
            'n' => $s['n'],
            'lat' => $s['lat'],
            'lon' => $s['lon']
        ];
    }
    
    $parseCSV = function($filepath) {
        if (!file_exists($filepath)) return [];
        
        $result = [];
        $fh = fopen($filepath, 'r');
        if (!$fh) return [];
        
        $headers = fgetcsv($fh);
        if (!$headers) {
            fclose($fh);
            return [];
        }
        
        while (($row = fgetcsv($fh)) !== false) {
            $item = [];
            foreach ($headers as $i => $header) {
                $item[trim($header)] = isset($row[$i]) ? trim($row[$i]) : '';
            }
            $result[] = $item;
        }
        fclose($fh);
        
        return $result;
    };
    
    $calendarArray = $parseCSV($extractDir . '/calendar.txt');
    $calendarById = [];
    foreach ($calendarArray as $item) {
        $serviceId = $item['service_id'] ?? '';
        if ($serviceId) {
            $calendarById[$serviceId] = $item;
        }
    }
    
    $calendarDatesArray = $parseCSV($extractDir . '/calendar_dates.txt');
    $calendarDatesByDate = [];
    foreach ($calendarDatesArray as $cd) {
        $date = $cd['date'] ?? '';
        if (empty($date)) continue;
        
        if (!isset($calendarDatesByDate[$date])) {
            $calendarDatesByDate[$date] = ['added' => [], 'removed' => []];
        }
        
        if (($cd['exception_type'] ?? '') === '1') {
            $calendarDatesByDate[$date]['added'][] = $cd['service_id'] ?? '';
        } else {
            $calendarDatesByDate[$date]['removed'][] = $cd['service_id'] ?? '';
        }
    }
    
    if (empty($calendarById)) {
        $calendarById = new stdClass();
    }
    
    $core = [
        'routes' => $routesExpanded,
        'stops' => $stopsExpanded,
        'calendar' => $calendarById,
        'calendarDates' => $calendarDatesByDate,
        'generated' => time()
    ];

    $json = json_encode($core);
    $compressed = gzencode($json, 9);
    file_put_contents($outputFile, $compressed);
    
    unset($routes, $stops, $routesExpanded, $stopsExpanded, $core, $json);
    gc_collect_cycles();
    
    return true;
}

// Construction index trip->route
function buildTripIndex($extractDir, $tripIndexFile) {
    $tripsFile = $extractDir . '/trips.txt';
    if (!file_exists($tripsFile)) {
        error_log('Warning: trips.txt non trouvé pour buildTripIndex');
        return;
    }
    
    $tripToRoute = [];
    $fh = fopen($tripsFile, 'r');
    $headers = fgetcsv($fh);
    $tripIdIdx = array_search('trip_id', $headers);
    $routeIdIdx = array_search('route_id', $headers);
    
    while (($row = fgetcsv($fh)) !== false) {
        $tripId = $row[$tripIdIdx] ?? '';
        $routeId = $row[$routeIdIdx] ?? '';
        if ($tripId && $routeId) {
            $tripToRoute[$tripId] = $routeId;
        }
    }
    fclose($fh);
    
    file_put_contents($tripIndexFile, json_encode($tripToRoute));
    return $tripToRoute;
}

function buildStopTimesIndex($extractDir, $outputFile) {
    $stopTimesFile = $extractDir . '/stop_times.txt';
    if (!file_exists($stopTimesFile)) return;

    $index = [];
    $fh = fopen($stopTimesFile, 'r');
    $headers = fgetcsv($fh);
    $tripIdIdx    = array_search('trip_id',        $headers);
    $stopIdIdx    = array_search('stop_id',         $headers);
    $arrivalIdx   = array_search('arrival_time',    $headers);
    $departureIdx = array_search('departure_time',  $headers);

    $count = 0;
    while (($row = fgetcsv($fh)) !== false) {
        $tripId  = $row[$tripIdIdx]  ?? '';
        $stopId  = $row[$stopIdIdx]  ?? '';
        if (!$tripId || !$stopId) continue;

        $index[$tripId][$stopId] = [
            'a' => $row[$arrivalIdx]   ?? '', 
            'd' => $row[$departureIdx] ?? ''  
        ];

        $count++;
        if ($count % 10000 === 0) gc_collect_cycles();
    }
    fclose($fh);

    $compressed = gzencode(json_encode($index), 6); 
    file_put_contents($outputFile, $compressed);

    unset($index);
    gc_collect_cycles();
}

function buildStopTimesShards($extractDir, $shardDir) {
    if (!is_dir($shardDir)) mkdir($shardDir, 0755, true);

    $stopTimesFile = $extractDir . '/stop_times.txt';
    if (!file_exists($stopTimesFile)) return;

    $shards = [];
    $fh = fopen($stopTimesFile, 'r');
    $headers     = fgetcsv($fh);
    $tripIdIdx   = array_search('trip_id',       $headers);
    $stopIdIdx   = array_search('stop_id',        $headers);
    $arrivalIdx  = array_search('arrival_time',   $headers);
    $departIdx   = array_search('departure_time', $headers);

    while (($row = fgetcsv($fh)) !== false) {
        $tripId = $row[$tripIdIdx] ?? '';
        $stopId = $row[$stopIdIdx] ?? '';
        if (!$tripId || !$stopId) continue;

        $shardKey = substr(md5($tripId), 0, 2); 
        $shards[$shardKey][$tripId][$stopId] = [
            'a' => $row[$arrivalIdx] ?? '',
            'd' => $row[$departIdx]  ?? ''
        ];
    }
    fclose($fh);

    foreach ($shards as $shardKey => $data) {
        file_put_contents(
            $shardDir . '/' . $shardKey . '.json.gz',
            gzencode(json_encode($data), 6)
        );
    }

    file_put_contents($shardDir . '/.built', time());

    unset($shards);
    gc_collect_cycles();
}

function extractAndOptimizeGTFS($zipCacheFile, $extractDir, $cacheDir, $coreCacheFile, $optimizedCoreFile, $optimizedRoutesFile, $optimizedStopsFile, $tripIndexFile) {    $zip = new ZipArchive();
    if ($zip->open($zipCacheFile) !== TRUE) {
        throw new Exception('Impossible ouvrir ZIP');
    }
    
    $filesToExtract = ['routes.txt', 'stops.txt', 'calendar.txt', 'calendar_dates.txt', 'trips.txt', 'stop_times.txt'];
    foreach ($filesToExtract as $file) {
        if ($zip->locateName($file) !== false) {
            $zip->extractTo($extractDir, $file);
        }
    }
    $zip->close();
    
    // Créer fichiers optimisés compressés
    createOptimizedRoutes($extractDir, $optimizedRoutesFile);
    createOptimizedStops($extractDir, $optimizedStopsFile);
    createOptimizedCore($extractDir, $optimizedRoutesFile, $optimizedStopsFile, $optimizedCoreFile);
    
    // Créer aussi fichier JSON classique pour compatibilité
    $compressed = file_get_contents($optimizedCoreFile);
    $coreData = json_decode(gzdecode($compressed), true);
    file_put_contents($coreCacheFile, json_encode($coreData));
    
    // Créer index trip->route
    buildTripIndex($extractDir, $tripIndexFile);
    buildStopTimesIndex($extractDir, $cacheDir . '/stop_times_index.json.gz');
    $shardDir = $cacheDir . '/shards';
    buildStopTimesShards($extractDir, $shardDir);
    
    return true;
}

// Endpoint JSON
if (isset($_GET['action'])) {
    $action = $_GET['action'];
    
    // Log pour debug
    error_log("Action demandée: " . $action);
    
    try {
        $shardDir = $cacheDir . '/shards';

    $needsOptimization = !file_exists($optimizedCoreFile) || 
                            !file_exists($optimizedRoutesFile) || 
                            !file_exists($optimizedStopsFile) ||
                            !file_exists($shardDir . '/.built');
        
        error_log("Needs optimization: " . ($needsOptimization ? 'OUI' : 'NON'));
        
        if ($needsOptimization || $debug) {
            error_log("Début de l'optimisation...");
            
            // Télécharger le ZIP si nécessaire
            if (!file_exists($zipCacheFile) || (time() - filemtime($zipCacheFile) > $cacheTTL)) {
                error_log("Téléchargement du ZIP...");
                $zipData = @file_get_contents($url);
                if ($zipData === false) throw new Exception('Impossible telecharger ZIP');
                file_put_contents($zipCacheFile, $zipData);
                unset($zipData);
                error_log("ZIP téléchargé: " . filesize($zipCacheFile) . " bytes");
            }
            
            // Extraction et optimisation
            error_log("Extraction et optimisation...");
            extractAndOptimizeGTFS($zipCacheFile, $extractDir, $cacheDir, $coreCacheFile, $optimizedCoreFile, $optimizedRoutesFile, $optimizedStopsFile, $tripIndexFile);
            error_log("Optimisation terminée");
        }
        
        switch ($action) {
            case 'core':
                if (!file_exists($optimizedCoreFile)) {
                    throw new Exception("Fichier core non trouvé");
                }
                header("Content-Type: application/json");
                header("Content-Encoding: gzip");
                error_log("Envoi du fichier core: " . filesize($optimizedCoreFile) . " bytes");
                readfile($optimizedCoreFile);
                break;
                
            case 'routes':
                if (!file_exists($optimizedRoutesFile)) {
                    throw new Exception("Fichier routes non trouvé: " . $optimizedRoutesFile);
                }
                header("Content-Type: application/json");
                header("Content-Encoding: gzip");
                error_log("Envoi du fichier routes: " . filesize($optimizedRoutesFile) . " bytes");
                readfile($optimizedRoutesFile);
                break;
                
            case 'stops':
                if (!file_exists($optimizedStopsFile)) {
                    throw new Exception("Fichier stops non trouvé");
                }
                header("Content-Type: application/json");
                header("Content-Encoding: gzip");
                error_log("Envoi du fichier stops: " . filesize($optimizedStopsFile) . " bytes");
                readfile($optimizedStopsFile);
                break;

            case 'stop_times':
                $stopTimesIndex = $cacheDir . '/stop_times_index.json.gz';
                
                if (!file_exists($stopTimesIndex)) {
                    // Générer à la demande si pas encore fait
                    if (!file_exists($extractDir . '/stop_times.txt')) {
                        $zip = new ZipArchive();
                        if ($zip->open($zipCacheFile) === TRUE) {
                            $zip->extractTo($extractDir, 'stop_times.txt');
                            $zip->close();
                        }
                    }
                    buildStopTimesIndex($extractDir, $stopTimesIndex);
                }
                
                if (!file_exists($stopTimesIndex)) {
                    http_response_code(500);
                    echo json_encode(['error' => 'stop_times index introuvable']);
                    exit;
                }
                
                header("Content-Type: application/json");
                header("Content-Encoding: gzip");
                readfile($stopTimesIndex);
            break;
                
            case 'info':
                header("Content-Type: application/json");
                
                $info = [
                    'core_exists' => file_exists($optimizedCoreFile),
                    'routes_exists' => file_exists($optimizedRoutesFile),
                    'stops_exists' => file_exists($optimizedStopsFile),
                    'core_size' => file_exists($optimizedCoreFile) ? filesize($optimizedCoreFile) : 0,
                    'routes_size' => file_exists($optimizedRoutesFile) ? filesize($optimizedRoutesFile) : 0,
                    'stops_size' => file_exists($optimizedStopsFile) ? filesize($optimizedStopsFile) : 0,
                    'total_size' => 0,
                    'cache_age_hours' => 0,
                    'cache_dir' => $cacheDir,
                    'extract_dir' => $extractDir
                ];
                
                $info['total_size'] = $info['core_size'] + $info['routes_size'] + $info['stops_size'];
                $shardDir = $cacheDir . '/shards';
                $info['shards_exists'] = is_dir($shardDir);
                $info['shards_count']  = is_dir($shardDir) ? count(glob($shardDir . '/*.json.gz')) : 0;
                
                if (file_exists($cacheMarkerFile)) {
                    $cacheTime = (int)file_get_contents($cacheMarkerFile);
                    $info['cache_age_hours'] = round((time() - $cacheTime) / 3600, 1);
                }
                
                echo json_encode($info, JSON_PRETTY_PRINT);
                break;

                case 'stop_times_by_trips':
                    $tripIdsParam = $_POST['trip_ids'] ?? $_GET['trip_ids'] ?? '';
                    if (!$tripIdsParam) {
                        http_response_code(400);
                        echo json_encode(['error' => 'trip_ids manquant']);
                        exit;
                    }

                    $shardDir = $cacheDir . '/shards';
                    
                    if (!is_dir($shardDir) || count(glob($shardDir . '/*.json.gz')) === 0) {
                        if (!file_exists($extractDir . '/stop_times.txt')) {
                            $zip = new ZipArchive();
                            if ($zip->open($zipCacheFile) === TRUE) {
                                $zip->extractTo($extractDir, 'stop_times.txt');
                                $zip->close();
                            }
                        }
                        buildStopTimesShards($extractDir, $shardDir);
                    }

                    $requestedTrips = array_flip(explode(',', $tripIdsParam));
                    $result = [];
                    static $shardCache = [];

                    foreach ($requestedTrips as $tripId => $_) {
                        $shardKey  = substr(md5($tripId), 0, 2);
                        $shardFile = $shardDir . '/' . $shardKey . '.json.gz';
                        
                        if (!isset($shardCache[$shardKey]) && file_exists($shardFile)) {
                            $shardCache[$shardKey] = json_decode(
                                gzdecode(file_get_contents($shardFile)), true
                            );
                        }
                        
                        if (isset($shardCache[$shardKey][$tripId])) {
                            $result[$tripId] = $shardCache[$shardKey][$tripId];
                        }
                    }

                    header("Content-Type: application/json");
                    header("Content-Encoding: gzip");
                    echo gzencode(json_encode($result), 1);
                    break;

            case 'route':
                $routeId = $_GET['route_id'] ?? null;
                if (!$routeId) {
                    http_response_code(400);
                    echo json_encode(['error' => 'route_id manquant']);
                    exit;
                }
                
                $routeCacheFile = $cacheDir . '/route_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $routeId) . '.json';
                
                if (file_exists($routeCacheFile)) {
                    echo file_get_contents($routeCacheFile);
                } else {
                    if (!file_exists($extractDir . '/trips.txt') || !file_exists($extractDir . '/stop_times.txt')) {
                        $zip = new ZipArchive();
                        if ($zip->open($zipCacheFile) !== TRUE) {
                            throw new Exception('Impossible ouvrir ZIP');
                        }
                        
                        $filesToExtract = ['trips.txt', 'stop_times.txt'];
                        foreach ($filesToExtract as $file) {
                            if ($zip->locateName($file) !== false) {
                                $zip->extractTo($extractDir, $file);
                            }
                        }
                        $zip->close();
                    }
                    
                    // Charger trips pour cette route
                    $trips = [];
                    $tripIds = [];
                    
                    $tripsFile = $extractDir . '/trips.txt';
                    $fh = fopen($tripsFile, 'r');
                    $headers = fgetcsv($fh);
                    $tripIdIdx = array_search('trip_id', $headers);
                    $routeIdIdx = array_search('route_id', $headers);
                    $serviceIdIdx = array_search('service_id', $headers);
                    
                    while (($row = fgetcsv($fh)) !== false) {
                        if (($row[$routeIdIdx] ?? '') === $routeId) {
                            $tripId = $row[$tripIdIdx] ?? '';
                            $trips[] = [
                                'trip_id' => $tripId,
                                'route_id' => $routeId,
                                'service_id' => $row[$serviceIdIdx] ?? ''
                            ];
                            $tripIds[$tripId] = true;
                        }
                    }
                    fclose($fh);
                    
                    if (empty($trips)) {
                        $empty = json_encode(['trips' => [], 'stopTimes' => []]);
                        file_put_contents($routeCacheFile, $empty);
                        echo $empty;
                        break;
                    }
                    
                    // Charger stop_times
                    $stopTimesFile = $extractDir . '/stop_times.txt';
                    $fh = fopen($stopTimesFile, 'r');
                    $headers = fgetcsv($fh);
                    $tripIdIdx = array_search('trip_id', $headers);
                    $stopIdIdx = array_search('stop_id', $headers);
                    $arrivalIdx = array_search('arrival_time', $headers);
                    $sequenceIdx = array_search('stop_sequence', $headers);
                    
                    $stopTimesByTrip = [];
                    
                    while (($row = fgetcsv($fh)) !== false) {
                        $tripId = $row[$tripIdIdx] ?? '';
                        
                        if (!isset($tripIds[$tripId])) continue;
                        
                        if (!isset($stopTimesByTrip[$tripId])) {
                            $stopTimesByTrip[$tripId] = [];
                        }
                        
                        $arrivalTime = $row[$arrivalIdx] ?? '';
                        $stopTimesByTrip[$tripId][] = [
                            'stop_id' => $row[$stopIdIdx] ?? '',
                            'arrival_time' => $arrivalTime,
                            'departure_time' => $arrivalTime,
                            'stop_sequence' => (int)($row[$sequenceIdx] ?? 0)
                        ];
                    }
                    fclose($fh);
                    
                    // Trier par séquence
                    foreach ($stopTimesByTrip as $tid => &$times) {
                        usort($times, function($a, $b) {
                            return $a['stop_sequence'] - $b['stop_sequence'];
                        });
                    }
                    
                    $routeData = [
                        'trips' => $trips,
                        'stopTimes' => $stopTimesByTrip
                    ];
                    
                    $json = json_encode($routeData);
                    file_put_contents($routeCacheFile, $json);
                    echo $json;
                }
                break;
                
            default:
                error_log("Action invalide: " . $action);
                header("Content-Type: application/json");
                http_response_code(400);
                echo json_encode([
                    'error' => 'Action invalide',
                    'action_received' => $action,
                    'valid_actions' => ['core', 'routes', 'stops', 'info']
                ]);
        }
        
    } catch (Exception $e) {
        error_log("ERREUR: " . $e->getMessage());
        header("Content-Type: application/json");
        http_response_code(500);
        echo json_encode([
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]);
    }
    
    exit;
}

// Fallback ZIP (pour compatibilité)
if (isset($_SERVER['HTTP_X_CONTENT_ONLY_HEADER'])) {
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => 'Range: bytes=0-51200'
        ]
    ]);
    $data = file_get_contents($url, false, $context);
} else {
    $data = file_get_contents($url);
}

header("Content-Type: application/zip");
echo $data;
?>

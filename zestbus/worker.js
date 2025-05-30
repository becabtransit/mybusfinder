const TIME_FORMAT_OPTIONS = { hour: '2-digit', minute: '2-digit' };
const UNKNOWN_TIME = "Heure inconnue";
const UNKNOWN_STOP = "Inconnu";

// Caches optimisés avec limite de taille pour éviter les fuites mémoire
const MAX_CACHE_SIZE = 10000;
const timestampCache = new Map();
const stopIdCache = new Map();
const tripCache = new Map();

let sharedBufferEnabled = false;
try {
    if (typeof SharedArrayBuffer !== 'undefined') {
        sharedBufferEnabled = true;
    }
} catch (e) {
    console.warn('SharedArrayBuffer non disponible');
}

// Gestion du cache avec éviction LRU simple
function manageCacheSize(cache, maxSize) {
    if (cache.size > maxSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
    }
}

self.onmessage = ({ data }) => {
    const startTime = performance.now();
    
    try {
        const result = processTripUpdates(data);
        const processingTime = performance.now() - startTime;
        
        self.postMessage({
            tripUpdates: result,
            metrics: {
                processingTime,
                entitiesCount: data?.entity?.length || 0,
                cacheStats: {
                    timestampCacheSize: timestampCache.size,
                    stopIdCacheSize: stopIdCache.size,
                    tripCacheSize: tripCache.size
                }
            },
            status: 'success'
        });
    } catch (error) {
        console.error('Erreur lors du traitement GTFS-RT:', error);
        self.postMessage({
            tripUpdates: {},
            metrics: {
                processingTime: performance.now() - startTime,
                entitiesCount: 0,
                error: error.message
            },
            status: 'error'
        });
    }
};

function formatTime(timestamp, cache) {
    // Debug: log du timestamp reçu
    console.log('formatTime called with:', timestamp, 'type:', typeof timestamp);
    
    if (!timestamp) {
        console.log('formatTime: timestamp vide ou null');
        return UNKNOWN_TIME;
    }
    
    // Conversion du timestamp en nombre si c'est une chaîne
    let numericTimestamp;
    if (typeof timestamp === 'string') {
        numericTimestamp = parseInt(timestamp, 10);
        console.log('formatTime: conversion string vers number:', numericTimestamp);
    } else {
        numericTimestamp = Number(timestamp);
        console.log('formatTime: conversion vers number:', numericTimestamp);
    }
    
    // Validation du timestamp
    if (isNaN(numericTimestamp) || numericTimestamp <= 0) {
        console.log('formatTime: timestamp invalide:', numericTimestamp);
        return UNKNOWN_TIME;
    }
    
    const cacheKey = Math.floor(numericTimestamp);
    let cached = cache.get(cacheKey);
    if (cached) {
        console.log('formatTime: cache hit:', cached);
        return cached;
    }
    
    try {
        const date = new Date(numericTimestamp * 1000);
        console.log('formatTime: date créée:', date, 'ISO:', date.toISOString());
        
        // Vérification si la date est valide
        if (isNaN(date.getTime())) {
            console.log('formatTime: date invalide');
            return UNKNOWN_TIME;
        }
        
        // Essai de plusieurs méthodes de formatage
        let cached;
        try {
            cached = date.toLocaleTimeString([], TIME_FORMAT_OPTIONS);
            console.log('formatTime: toLocaleTimeString réussi:', cached);
        } catch (localeError) {
            console.warn('toLocaleTimeString échoué, utilisation manuelle:', localeError);
            // Formatage manuel si toLocaleTimeString échoue
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            cached = `${hours}:${minutes}`;
            console.log('formatTime: formatage manuel:', cached);
        }
        
        cache.set(cacheKey, cached);
        manageCacheSize(cache, MAX_CACHE_SIZE);
        return cached;
    } catch (error) {
        console.warn('Erreur formatage time:', error, 'Timestamp:', timestamp);
        return UNKNOWN_TIME;
    }
}

function normalizeStopId(stopId) {
    if (!stopId) return UNKNOWN_STOP;
    
    // Cache pour éviter les opérations répétitives
    let normalized = stopIdCache.get(stopId);
    if (normalized) return normalized;
    
    // Normalisation du stopId (supprime préfixes communs)
    normalized = String(stopId).replace(/^(0:|stop_|station_)/i, "");
    stopIdCache.set(stopId, normalized);
    manageCacheSize(stopIdCache, MAX_CACHE_SIZE);
    
    return normalized;
}

function processStop(stop, now) {
    if (!stop) return null;
    
    const stopId = normalizeStopId(stop.stopId || stop.stop_id);
    
    // Gestion flexible des timestamps avec conversion string vers number
    let arrivalTime = stop.arrival?.time || stop.arrival?.timestamp || 
                     stop.arrivalTime || stop.arrival_time || null;
    let departureTime = stop.departure?.time || stop.departure?.timestamp || 
                       stop.departureTime || stop.departure_time || null;
    
    // Conversion en nombres si nécessaire
    if (arrivalTime && typeof arrivalTime === 'string') {
        arrivalTime = parseInt(arrivalTime, 10);
    }
    if (departureTime && typeof departureTime === 'string') {
        departureTime = parseInt(departureTime, 10);
    }
    
    const scheduleRelationship = stop.scheduleRelationship || stop.schedule_relationship;
    
    // Calcul du délai (en secondes)
    let delay = null;
    if (arrivalTime && arrivalTime > 0) {
        delay = Math.floor(arrivalTime - now);
    } else if (departureTime && departureTime > 0) {
        delay = Math.floor(departureTime - now);
    }
    
    // Gestion des délais d'arrivée/départ séparés
    const arrivalDelay = stop.arrival?.delay || stop.arrivalDelay || 0;
    const departureDelay = stop.departure?.delay || stop.departureDelay || 0;
    
    return {
        stopId,
        arrivalTime: formatTime(arrivalTime, timestampCache),
        departureTime: formatTime(departureTime, timestampCache),
        unifiedTime: formatTime(arrivalTime || departureTime, timestampCache),
        delay,
        arrivalDelay,
        departureDelay,
        scheduleRelationship,
        stopSequence: stop.stopSequence || stop.stop_sequence || 0,
        // Informations additionnelles utiles
        platformCode: stop.platformCode || stop.platform_code,
        stopHeadsign: stop.stopHeadsign || stop.stop_headsign,
        // Timestamp brut pour debug
        rawArrivalTime: arrivalTime,
        rawDepartureTime: departureTime
    };
}

function extractTripInfo(tripUpdate) {
    if (!tripUpdate) return null;
    
    const trip = tripUpdate.trip;
    if (!trip) return null;
    
    // Gestion flexible des identifiants de trip
    const tripId = trip.tripId || trip.trip_id;
    if (!tripId) return null;
    
    return {
        tripId,
        routeId: trip.routeId || trip.route_id,
        directionId: trip.directionId || trip.direction_id,
        startTime: trip.startTime || trip.start_time,
        startDate: trip.startDate || trip.start_date,
        scheduleRelationship: trip.scheduleRelationship || trip.schedule_relationship
    };
}

function processTripUpdates(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Données GTFS-RT invalides');
    }
    
    const tripUpdates = {};
    const now = Date.now() / 1000;
    
    // Gestion flexible de la structure des données
    const entities = data.entity || data.entities || [];
    if (!Array.isArray(entities)) {
        console.warn('Format entities non supporté:', typeof entities);
        return tripUpdates;
    }
    
    const entitiesLength = entities.length;
    let processedCount = 0;
    let errorCount = 0;
    
    for (let j = 0; j < entitiesLength; j++) {
        try {
            const entity = entities[j];
            if (!entity) continue;
            
            // Gestion flexible du tripUpdate
            const tripUpdate = entity.tripUpdate || entity.trip_update || entity.update;
            if (!tripUpdate) continue;
            
            const tripInfo = extractTripInfo(tripUpdate);
            if (!tripInfo) continue;
            
            // Gestion flexible des stopTimeUpdate
            const stopTimeUpdates = tripUpdate.stopTimeUpdate || 
                                  tripUpdate.stop_time_update || 
                                  tripUpdate.stopUpdates || 
                                  tripUpdate.stops || [];
            
            if (!Array.isArray(stopTimeUpdates) || stopTimeUpdates.length === 0) {
                continue;
            }
            
            const stopsLength = stopTimeUpdates.length;
            const processedStops = [];
            const arrivalDelays = {};
            const departureDelays = {};
            
            // Traitement des arrêts avec gestion d'erreurs robuste
            for (let i = 0; i < stopsLength; i++) {
                const processedStop = processStop(stopTimeUpdates[i], now);
                if (!processedStop) continue;
                
                processedStops.push(processedStop);
                
                // Collection des délais pour analyse
                if (processedStop.delay !== null) {
                    arrivalDelays[processedStop.stopId] = processedStop.delay;
                }
                if (processedStop.arrivalDelay !== 0) {
                    arrivalDelays[processedStop.stopId] = processedStop.arrivalDelay;
                }
                if (processedStop.departureDelay !== 0) {
                    departureDelays[processedStop.stopId] = processedStop.departureDelay;
                }
            }
            
            if (processedStops.length === 0) continue;
            
            // Tri des arrêts par séquence si disponible
            processedStops.sort((a, b) => (a.stopSequence || 0) - (b.stopSequence || 0));
            
            const lastStopId = processedStops.length > 0 ?
                (processedStops[processedStops.length - 1]?.stopId || UNKNOWN_STOP) :
                UNKNOWN_STOP;
            
            // Identification des prochains arrêts (ceux avec délai positif ou futur)
            const nextStops = processedStops.filter(stop => 
                stop.delay === null || stop.delay > -300 // Arrêts pas encore passés (marge de 5 min)
            );
            
            // Stockage avec informations enrichies
            tripUpdates[tripInfo.tripId] = {
                tripInfo,
                stopUpdates: processedStops,
                lastStopId,
                nextStops,
                arrivalDelays,
                departureDelays,
                timestamp: now,
                totalStops: processedStops.length,
                // Statistiques utiles
                averageDelay: Object.values(arrivalDelays).length > 0 ?
                    Object.values(arrivalDelays).reduce((a, b) => a + b, 0) / Object.values(arrivalDelays).length : 0
            };
            
            processedCount++;
            
        } catch (error) {
            errorCount++;
            console.warn(`Erreur traitement entité ${j}:`, error);
            continue;
        }
    }
    
    // Nettoyage périodique des caches
    if (processedCount % 100 === 0) {
        if (timestampCache.size > MAX_CACHE_SIZE) timestampCache.clear();
        if (stopIdCache.size > MAX_CACHE_SIZE) stopIdCache.clear();
        if (tripCache.size > MAX_CACHE_SIZE) tripCache.clear();
    }
    
    console.log(`Traitement terminé: ${processedCount} trips traités, ${errorCount} erreurs`);
    return tripUpdates;
}

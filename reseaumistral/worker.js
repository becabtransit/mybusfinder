const TIME_FORMAT_OPTIONS = { hour: '2-digit', minute: '2-digit' };
const UNKNOWN_TIME = "Heure inconnue";
const UNKNOWN_STOP = "Inconnu";

// Préallouer les caches avec une taille estimée pour éviter le redimensionnement
const timestampCache = new Map();
const stopIdCache = new Map();

// Détection des capacités du navigateur
const sharedBufferEnabled = (function() {
    try {
        return typeof SharedArrayBuffer !== 'undefined';
    } catch (e) {
        console.warn('SharedArrayBuffer non disponible');
        return false;
    }
})();

// Optimisation des transferts de données avec transferables quand possible
self.onmessage = ({ data }) => {
    const startTime = performance.now();
    
    // Traiter les données par lots pour éviter le blocage du thread trop longtemps
    const result = processLargeTripUpdates(data);
    
    const processingTime = performance.now() - startTime;
    
    // Tenter de transférer plutôt que copier les données volumineuses
    let transferables = [];
    if (result.buffer && result.buffer instanceof ArrayBuffer) {
        transferables.push(result.buffer);
    }
    
    self.postMessage({
        tripUpdates: result,
        metrics: {
            processingTime,
            entitiesCount: data.entity?.length || 0,
            timestampCacheSize: timestampCache.size,
            stopIdCacheSize: stopIdCache.size,
            sharedBufferEnabled
        }
    }, transferables);
};

// Utiliser une fonction memoïsée avec une taille de cache optimisée
const formatTime = (function() {
    // Limiter la taille du cache pour éviter les fuites mémoire
    const MAX_CACHE_SIZE = 1000;
    
    return function(timestamp, cache) {
        if (!timestamp) return UNKNOWN_TIME;
        
        const cacheKey = Math.floor(timestamp);
        let cached = cache.get(cacheKey);
        if (cached) return cached;
        
        // Nettoyage du cache si nécessaire
        if (cache.size > MAX_CACHE_SIZE) {
            // Supprimer les entrées les plus anciennes (20% du cache)
            const keysToDelete = Array.from(cache.keys()).slice(0, MAX_CACHE_SIZE * 0.2);
            keysToDelete.forEach(key => cache.delete(key));
        }
        
        const date = new Date(timestamp * 1000);
        cached = date.toLocaleTimeString([], TIME_FORMAT_OPTIONS);
        cache.set(cacheKey, cached);
        return cached;
    };
})();

// Optimiser le traitement des arrêts avec une approche plus directe
function processStop(stop, now) {
    // Utilisation d'une valeur par défaut pour éviter les conditions
    let stopId = stopIdCache.get(stop.stopId);
    if (!stopId) {
        stopId = stop.stopId.replace("0:", "");
        stopIdCache.set(stop.stopId, stopId);
    }
    
    const arrivalTime = stop.arrival?.time ?? null;
    const departureTime = stop.departure?.time ?? null;
    const effectiveTime = arrivalTime || departureTime;
    
    return {
        stopId,
        arrivalTime: formatTime(arrivalTime, timestampCache),
        departureTime: formatTime(departureTime, timestampCache),
        unifiedTime: formatTime(effectiveTime, timestampCache),
        delay: arrivalTime ? Math.floor(arrivalTime - now) : null
    };
}

// Traitement par lots pour gérer les gros fichiers
function processLargeTripUpdates(data) {
    const BATCH_SIZE = 500; // Ajuster selon les besoins
    const entities = data.entity || [];
    const entitiesLength = entities.length;
    const tripUpdates = {};
    
    // Préallouer pour éviter les réallocations
    const now = Date.now() / 1000;
    
    // Traiter par lots
    for (let batchStart = 0; batchStart < entitiesLength; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, entitiesLength);
        processBatch(entities, batchStart, batchEnd, tripUpdates, now);
        
        // Permettre au navigateur de répondre entre les lots si nécessaire
        if (batchEnd < entitiesLength && batchStart > 0 && batchStart % (BATCH_SIZE * 5) === 0) {
            setTimeout(() => {}, 0);
        }
    }
    
    return tripUpdates;
}

function processBatch(entities, start, end, tripUpdates, now) {
    for (let j = start; j < end; j++) {
        const entity = entities[j];
        const tripUpdate = entity.tripUpdate;
        
        if (!tripUpdate?.stopTimeUpdate?.length) continue;

        const trip = tripUpdate.trip;
        const stops = tripUpdate.stopTimeUpdate;
        const stopsLength = stops.length;
        
        // Préallouer avec la bonne taille
        const processedStops = new Array(stopsLength);
        const arrivalDelays = Object.create(null); // Plus rapide qu'un objet standard
        
        // Boucle optimisée pour le traitement des arrêts
        for (let i = 0; i < stopsLength; i++) {
            const processedStop = processStop(stops[i], now);
            processedStops[i] = processedStop;
            
            if (processedStop.delay !== null) {
                arrivalDelays[processedStop.stopId] = processedStop.delay;
            }
        }

        const lastStopId = stopsLength > 0 ? 
            (processedStops[stopsLength - 1]?.stopId || UNKNOWN_STOP) : 
            UNKNOWN_STOP;

        // Utiliser une référence directe plutôt qu'une copie pour nextStops
        tripUpdates[trip.tripId] = {
            stopUpdates: processedStops,
            lastStopId,
            nextStops: processedStops, // Même référence que stopUpdates pour économiser de la mémoire
            arrivalDelays
        };
    }
}

// Ajout d'une fonction pour nettoyer périodiquement les caches
function cleanupCaches() {
    // Nettoyer les caches si plus de 10000 entrées
    if (timestampCache.size > 10000) {
        const now = Date.now() / 1000;
        // Supprimer les timestamps qui sont trop vieux (plus de 2 heures)
        timestampCache.forEach((value, key) => {
            if (now - key > 7200) {
                timestampCache.delete(key);
            }
        });
    }
    
    // Programmer le prochain nettoyage
    setTimeout(cleanupCaches, 60000); // Nettoyer toutes les minutes
}

// Démarrer le nettoyage périodique
cleanupCaches();
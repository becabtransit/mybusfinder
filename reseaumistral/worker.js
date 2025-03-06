// Configuration des options de formatage de l'heure une seule fois
const TIME_FORMAT_OPTIONS = { hour: '2-digit', minute: '2-digit' };
const UNKNOWN_TIME = "Heure inconnue";
const UNKNOWN_STOP = "Inconnu";

// Variables globales pour réduire les allocations mémoire
const localCache = {
    timestampCache: new Map(),
    stopIdCache: new Map()
};

self.onmessage = ({ data }) => {
    self.postMessage(processTripUpdates(data));
};

function formatTime(timestamp, cache) {
    if (!timestamp) return UNKNOWN_TIME;
    
    let cached = cache.get(timestamp);
    if (cached) return cached;
    
    // Utilisation de constantes pour éviter la création d'objets
    cached = new Date(timestamp * 1000).toLocaleTimeString([], TIME_FORMAT_OPTIONS);
    cache.set(timestamp, cached);
    return cached;
}

function processStop(stop, now, localCache) {
    const stopId = stop.stopId.replace("0:", "");
    localCache.stopIdCache.set(stop.stopId, stopId);
    
    const arrivalTime = stop.arrival?.time ?? null;
    const departureTime = stop.departure?.time ?? null;
    
    return {
        stopId,
        arrivalTime: formatTime(arrivalTime, localCache.timestampCache),
        departureTime: formatTime(departureTime, localCache.timestampCache),
        unifiedTime: formatTime(arrivalTime || departureTime, localCache.timestampCache),
        delay: arrivalTime ? arrivalTime - now : null
    };
}

function processTripUpdates(data) {
    const tripUpdates = Object.create(null);
    const now = Date.now() / 1000;
    const entities = data.entity;
    
    // Utilisation de for...of pour une meilleure lisibilité et performance similaire
    for (const entity of entities) {
        const { tripUpdate } = entity;
        if (!tripUpdate?.stopTimeUpdate?.length) continue;

        const { trip, stopTimeUpdate: stops } = tripUpdate;
        const processedStops = new Array(stops.length);
        const arrivalDelays = Object.create(null);
        
        // Traitement des arrêts en une seule passe
        for (let i = 0; i < stops.length; i++) {
            const processedStop = processStop(stops[i], now, localCache);
            processedStops[i] = processedStop;
            
            if (processedStop.delay !== null) {
                arrivalDelays[processedStop.stopId] = processedStop.delay;
            }
        }

        const lastStopId = processedStops[processedStops.length - 1]?.stopId ?? UNKNOWN_STOP;

        tripUpdates[trip.tripId] = {
            stopUpdates: processedStops,
            lastStopId,
            nextStops: processedStops,
            arrivalDelays
        };
    }

    return tripUpdates;
}
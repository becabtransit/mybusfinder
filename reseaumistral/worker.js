const TIME_FORMAT_OPTIONS = { hour: '2-digit', minute: '2-digit' };
const UNKNOWN_TIME = "Heure inconnue";
const UNKNOWN_STOP = "Inconnu";

const timestampCache = new Map();
const stopIdCache = new Map();

let sharedBufferEnabled = false;
try {
    sharedBufferEnabled = typeof SharedArrayBuffer !== 'undefined';
} catch (e) {
    console.warn('SharedArrayBuffer non disponible');
}

self.onmessage = ({ data }) => {
    const startTime = performance.now();
    const result = processTripUpdates(data);
    
    self.postMessage({
        tripUpdates: result,
        metrics: {
            processingTime: performance.now() - startTime,
            entitiesCount: data.entity?.length || 0
        }
    });
};

function formatTime(timestamp, cache) {
    if (!timestamp) return UNKNOWN_TIME;
    
    const cacheKey = Math.floor(timestamp);
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    const date = new Date(timestamp * 1000);
    const formatted = date.toLocaleTimeString([], TIME_FORMAT_OPTIONS);
    cache.set(cacheKey, formatted);
    return formatted;
}

function processStop(stop, now) {
    let stopId = stopIdCache.get(stop.stopId);
    if (!stopId) {
        stopId = stop.stopId.replace("0:", "");
        stopIdCache.set(stop.stopId, stopId);
    }
    
    const arrivalTime = stop.arrival?.time ?? null;
    const departureTime = stop.departure?.time ?? null;
    
    return {
        stopId,
        arrivalTime: arrivalTime ? formatTime(arrivalTime, timestampCache) : UNKNOWN_TIME,
        departureTime: departureTime ? formatTime(departureTime, timestampCache) : UNKNOWN_TIME,
        unifiedTime: formatTime(arrivalTime || departureTime, timestampCache),
        delay: arrivalTime ? Math.floor(arrivalTime - now) : null
    };
}

function processTripUpdates(data) {
    const tripUpdates = {};
    const now = Date.now() / 1000;
    
    const entities = data.entity || [];
    
    for (let j = 0, entitiesLength = entities.length; j < entitiesLength; j++) {
        const entity = entities[j];
        const tripUpdate = entity.tripUpdate;
        
        if (!tripUpdate?.stopTimeUpdate?.length) continue;

        const trip = tripUpdate.trip;
        const stops = tripUpdate.stopTimeUpdate;
        const stopsLength = stops.length;
        
        const processedStops = new Array(stopsLength);
        const arrivalDelays = {};
        
        for (let i = 0; i < stopsLength; i++) {
            const processedStop = processStop(stops[i], now);
            processedStops[i] = processedStop;
            
            if (processedStop.delay !== null) {
                arrivalDelays[processedStop.stopId] = processedStop.delay;
            }
        }

        const lastStopId = stopsLength > 0 && processedStops[stopsLength - 1]?.stopId || UNKNOWN_STOP;

        tripUpdates[trip.tripId] = {
            stopUpdates: processedStops,
            lastStopId,
            nextStops: processedStops,
            arrivalDelays
        };
    }

    return tripUpdates;
}
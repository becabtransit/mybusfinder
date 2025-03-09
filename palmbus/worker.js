const TIME_FORMAT_OPTIONS = { hour: '2-digit', minute: '2-digit' };
const UNKNOWN_TIME = "Heure inconnue";
const UNKNOWN_STOP = "Inconnu";

const timestampCache = new Map();
const stopIdCache = new Map();

let sharedBufferEnabled = false;
try {
    if (typeof SharedArrayBuffer !== 'undefined') {
        sharedBufferEnabled = true;
    }
} catch (e) {
    console.warn('SharedArrayBuffer non disponible');
}

self.onmessage = ({ data }) => {
    const startTime = performance.now();
    const result = processTripUpdates(data);
    const processingTime = performance.now() - startTime;
    
    self.postMessage({
        tripUpdates: result,
        metrics: {
            processingTime,
            entitiesCount: data.entity?.length || 0
        }
    });
};

function formatTime(timestamp, cache) {
    if (!timestamp) return UNKNOWN_TIME;
    
    const cacheKey = Math.floor(timestamp);
    let cached = cache.get(cacheKey);
    if (cached) return cached;
    
    const date = new Date(timestamp * 1000);
    cached = date.toLocaleTimeString([], TIME_FORMAT_OPTIONS);
    cache.set(cacheKey, cached);
    return cached;
}

function processStop(stop, now) {
    const stopId = stopIdCache.get(stop.stopId) || 
                   (stopIdCache.set(stop.stopId, stop.stopId.replace("0:", "")), 
                   stopIdCache.get(stop.stopId));
    
    const arrivalTime = stop.arrival?.time ?? null;
    const departureTime = stop.departure?.time ?? null;
    
    return {
        stopId,
        arrivalTime: formatTime(arrivalTime, timestampCache),
        departureTime: formatTime(departureTime, timestampCache),
        unifiedTime: formatTime(arrivalTime || departureTime, timestampCache),
        delay: arrivalTime ? Math.floor(arrivalTime - now) : null
    };
}

function processTripUpdates(data) {
    const tripUpdates = {};
    const now = Date.now() / 1000;
    
    const entities = data.entity || [];
    const entitiesLength = entities.length;
    
    for (let j = 0; j < entitiesLength; j++) {
        const entity = entities[j];
        const tripUpdate = entity.tripUpdate;
        
        if (!tripUpdate || !tripUpdate.stopTimeUpdate || !tripUpdate.stopTimeUpdate.length) continue;

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

        const lastStopId = stopsLength > 0 ? 
            (processedStops[stopsLength - 1]?.stopId || UNKNOWN_STOP) : 
            UNKNOWN_STOP;

        tripUpdates[trip.tripId] = {
            stopUpdates: processedStops,
            lastStopId,
            nextStops: processedStops,
            arrivalDelays
        };
    }

    return tripUpdates;
}
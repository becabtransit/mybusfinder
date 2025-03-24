const TIME_FORMAT_OPTIONS = { hour: '2-digit', minute: '2-digit' };
const UNKNOWN_TIME = "Heure inconnue";
const UNKNOWN_STOP = "Inconnu";

const timestampCache = {};
const stopIdCache = {};

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

function formatTime(timestamp) {
    if (!timestamp) return UNKNOWN_TIME;
    
    const cacheKey = Math.floor(timestamp);
    if (timestampCache[cacheKey]) return timestampCache[cacheKey];
    
    const date = new Date(timestamp * 1000);
    const formattedTime = date.toLocaleTimeString([], TIME_FORMAT_OPTIONS);
    timestampCache[cacheKey] = formattedTime;
    return formattedTime;
}

function processStop(stop, now) {
    let stopId = stopIdCache[stop.stopId];
    if (!stopId) {
        stopId = stop.stopId.replace("0:", "");
        stopIdCache[stop.stopId] = stopId;
    }
    
    const arrivalTime = stop.arrival?.time ?? null;
    const departureTime = stop.departure?.time ?? null;
    const unifiedTime = formatTime(arrivalTime || departureTime);
    const delay = arrivalTime ? Math.floor(arrivalTime - now) : null;
    
    return {
        stopId,
        arrivalTime: formatTime(arrivalTime),
        departureTime: formatTime(departureTime),
        unifiedTime,
        delay
    };
}

function processTripUpdates(data) {
    const tripUpdates = {};
    const now = Date.now() / 1000;
    
    const entities = data.entity || [];
    for (const entity of entities) {
        const tripUpdate = entity.tripUpdate;
        
        if (!tripUpdate || !tripUpdate.stopTimeUpdate || !tripUpdate.stopTimeUpdate.length) continue;

        const trip = tripUpdate.trip;
        const stops = tripUpdate.stopTimeUpdate;
        
        const processedStops = stops.map(stop => processStop(stop, now));
        const arrivalDelays = {};
        
        for (const processedStop of processedStops) {
            if (processedStop.delay !== null) {
                arrivalDelays[processedStop.stopId] = processedStop.delay;
            }
        }

        const lastStopId = processedStops.length > 0 ? 
            (processedStops[processedStops.length - 1]?.stopId || UNKNOWN_STOP) : 
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
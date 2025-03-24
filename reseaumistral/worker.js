// Constants
const TIME_FORMAT_OPTIONS = { hour: '2-digit', minute: '2-digit' };
const UNKNOWN_TIME = "Heure inconnue";
const UNKNOWN_STOP = "Inconnu";
const STOP_PREFIX = "0:";
const STOP_PREFIX_LENGTH = STOP_PREFIX.length;

// Pre-calculated values
const NOW_DIVISOR = 1000;
const TIMESTAMP_MULTIPLIER = 1000;

// Caches
const timestampCache = new Map();
const stopIdCache = new Map();
const processedStopsCache = new Map();

// Initialize time formatter once
const timeFormatter = new Intl.DateTimeFormat([], TIME_FORMAT_OPTIONS);
const dateObj = new Date();

function formatTime(timestamp) {
    if (!timestamp) return UNKNOWN_TIME;
    
    const cacheKey = timestamp | 0; // Math.floor via bitwise OR
    const cached = timestampCache.get(cacheKey);
    if (cached) return cached;
    
    dateObj.setTime(timestamp * TIMESTAMP_MULTIPLIER);
    const formatted = timeFormatter.format(dateObj);
    timestampCache.set(cacheKey, formatted);
    return formatted;
}

function getStopId(rawStopId) {
    let stopId = stopIdCache.get(rawStopId);
    if (!stopId) {
        stopId = rawStopId.startsWith(STOP_PREFIX) ? 
            rawStopId.slice(STOP_PREFIX_LENGTH) : 
            rawStopId;
        stopIdCache.set(rawStopId, stopId);
    }
    return stopId;
}

function processStop(stop, now) {
    const stopId = getStopId(stop.stopId);
    const arrivalTime = stop.arrival?.time ?? null;
    const departureTime = stop.departure?.time ?? null;
    
    // Calculate unified time only once
    const unifiedTime = formatTime(arrivalTime || departureTime);
    
    return {
        stopId,
        arrivalTime: arrivalTime ? formatTime(arrivalTime) : UNKNOWN_TIME,
        departureTime: departureTime ? formatTime(departureTime) : UNKNOWN_TIME,
        unifiedTime,
        delay: arrivalTime ? ((arrivalTime - now) | 0) : null // Math.floor via bitwise OR
    };
}

function processTripUpdates(data) {
    const tripUpdates = Object.create(null); // Faster than {}
    const now = Date.now() / NOW_DIVISOR;
    
    const entities = data.entity;
    if (!entities) return tripUpdates;
    
    const entitiesLength = entities.length;
    
    for (let j = 0; j < entitiesLength; j++) {
        const tripUpdate = entities[j].tripUpdate;
        if (!tripUpdate?.stopTimeUpdate?.length) continue;

        const trip = tripUpdate.trip;
        const stops = tripUpdate.stopTimeUpdate;
        const stopsLength = stops.length;
        
        // Pre-allocate arrays with exact size
        const processedStops = new Array(stopsLength);
        const arrivalDelays = Object.create(null);
        
        // Process stops in batch
        for (let i = 0; i < stopsLength; i++) {
            const stop = stops[i];
            const cacheKey = `${stop.stopId}-${stop.arrival?.time}-${stop.departure?.time}`;
            let processedStop = processedStopsCache.get(cacheKey);
            
            if (!processedStop) {
                processedStop = processStop(stop, now);
                processedStopsCache.set(cacheKey, processedStop);
            }
            
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

// Clear caches periodically to prevent memory bloat
setInterval(() => {
    timestampCache.clear();
    processedStopsCache.clear();
}, 300000); // Clear every 5 minutes

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
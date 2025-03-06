const TIME_FORMAT = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
};

const timeCache = new Map();
const stopIdCache = new Map();


function formatTimeWithCache(timestamp) {
    if (!timestamp) return "Heure inconnue";
    
    const cached = timeCache.get(timestamp);
    if (cached) return cached;
    
    const formatted = new Date(timestamp * 1000).toLocaleTimeString([], TIME_FORMAT);
    timeCache.set(timestamp, formatted);
    
    if (timeCache.size > 1000) {
        const firstKey = timeCache.keys().next().value;
        timeCache.delete(firstKey);
    }
    
    return formatted;
}


function cleanStopId(rawStopId) {
    if (!rawStopId) return "Inconnu";
    
    const cached = stopIdCache.get(rawStopId);
    if (cached) return cached;
    
    const cleaned = rawStopId.replace(/^0:/, "");
    stopIdCache.set(rawStopId, cleaned);
    return cleaned;
}


function processStop(stop, now) {
    const stopId = cleanStopId(stop.stopId);
    const arrival = stop.arrival?.time;
    const departure = stop.departure?.time;
    
    const relevantTime = arrival || departure;
    const delay = arrival ? arrival - now : null;
    
    return {
        stopId,
        arrivalTime: formatTimeWithCache(arrival),
        departureTime: formatTimeWithCache(departure),
        unifiedTime: formatTimeWithCache(relevantTime),
        delay,
        timestamp: relevantTime
    };
}


function processTripUpdates(data) {
    const now = Math.floor(Date.now() / 1000);
    const processedUpdates = new Map();
    
    const entities = data.entity;
    const entitiesLength = entities.length;
    
    for (let i = 0; i < entitiesLength; i++) {
        const { tripUpdate } = entities[i];
        if (!tripUpdate?.stopTimeUpdate?.length) continue;
        
        const { trip, stopTimeUpdate } = tripUpdate;
        const tripId = trip.tripId;
        
        const stopsLength = stopTimeUpdate.length;
        const processedStops = new Array(stopsLength);
        const arrivalDelays = new Map();
        
        let validStopsCount = 0;
        for (let j = 0; j < stopsLength; j++) {
            const stop = stopTimeUpdate[j];
            if (!stop) continue;
            
            const processedStop = processStop(stop, now);
            if (processedStop.timestamp && processedStop.timestamp >= now) {
                processedStops[validStopsCount++] = processedStop;
                
                if (processedStop.delay !== null) {
                    arrivalDelays.set(processedStop.stopId, processedStop.delay);
                }
            }
        }
        
        if (validStopsCount < stopsLength) {
            processedStops.length = validStopsCount;
        }
        
        if (validStopsCount > 1) {
            processedStops.sort((a, b) => a.timestamp - b.timestamp);
        }
        
        const lastStopId = processedStops[validStopsCount - 1]?.stopId ?? "Inconnu";
        
        processedUpdates.set(tripId, {
            stopUpdates: processedStops,
            lastStopId,
            nextStops: processedStops,
            arrivalDelays: Object.fromEntries(arrivalDelays)
        });
    }
    
    return Object.fromEntries(processedUpdates);
}

setInterval(() => {
    const now = Date.now() / 1000;
    for (const [timestamp] of timeCache) {
        if (timestamp < now - 3600) {
            timeCache.delete(timestamp);
        }
    }
}, 300000);

self.onmessage = function(e) {
    const startTime = performance.now();
    const result = processTripUpdates(e.data);
    const processTime = performance.now() - startTime;
    
    self.postMessage({
        tripUpdates: result,
        processTime: processTime
    });
};
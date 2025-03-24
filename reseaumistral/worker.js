importScripts('protobuf.min.js'); 

const TIME_FORMAT_OPTIONS = { hour: '2-digit', minute: '2-digit' };
const UNKNOWN_TIME = "Heure inconnue";
const UNKNOWN_STOP = "Inconnu";

const timestampCache = new Map();
const stopIdCache = new Map();

const FETCH_TIMEOUT = 5000;

let sharedBufferEnabled = false;
try {
    if (typeof SharedArrayBuffer !== 'undefined') {
        sharedBufferEnabled = true;
    }
} catch (e) {
    console.warn('SharedArrayBuffer non disponible');
}

self.onmessage = async ({ data: command }) => {
    if (command.action === 'fetchTripUpdates') {
        try {
            const startTime = performance.now();
            const tripUpdates = await fetchAndProcessTripUpdates();
            
            self.postMessage({
                type: 'tripUpdatesResult',
                tripUpdates,
                metrics: {
                    totalTime: performance.now() - startTime
                }
            });
        } catch (error) {
            self.postMessage({
                type: 'error',
                error: error.message
            });
        }
    } 
    else if (command.data) {
        const startTime = performance.now();
        const result = processTripUpdates(command.data);
        const processingTime = performance.now() - startTime;
        
        self.postMessage({
            type: 'tripUpdatesResult',
            tripUpdates: result,
            metrics: {
                processingTime,
                entitiesCount: command.data.entity?.length || 0
            }
        });
    }
};

async function fetchAndProcessTripUpdates() {
    const fetchStartTime = performance.now();
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
        
        const response = await fetch('../proxy-cors/proxy_tripupdate.php', {
            signal: controller.signal,
            cache: 'no-store' 
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const buffer = await response.arrayBuffer();
        const data = await decodeProtobuf(buffer);
        
        const fetchTime = performance.now() - fetchStartTime;
        console.debug(`Worker: Téléchargement gtfs en ${fetchTime.toFixed(2)}ms`);
        
        const result = processTripUpdates(data);
        const totalTime = performance.now() - fetchStartTime;
        
        return result;
    } catch (error) {
        console.error('Worker: Erreur récupération trip updates:', error);
        throw error;
    }
}

async function decodeProtobuf(buffer) {
    const root = await protobuf.load('../gtfs-realtime.proto');
    const FeedMessage = root.lookupType('transit_realtime.FeedMessage');
    const message = FeedMessage.decode(new Uint8Array(buffer));
    return FeedMessage.toObject(message, { longs: String });
}

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
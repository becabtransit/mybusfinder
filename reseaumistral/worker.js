// Constantes en mémoire partagée pour éviter les copies
const SHARED = {
    TIME_FORMAT: new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' }),
    DATE_OBJ: new Date(),
    UNKNOWN_TIME: "Heure inconnue",
    UNKNOWN_STOP: "Inconnu",
    STOP_PREFIX: "0:",
    CACHE_DURATION: 300000, // 5 minutes
    BUFFER_SIZE: 10000
};

// Utilisation de TypedArrays pour les timestamps
const timestampBuffer = new Float64Array(SHARED.BUFFER_SIZE);
const timestampKeys = new Int32Array(SHARED.BUFFER_SIZE);
let timestampIndex = 0;

// Cache optimisé avec TypedArrays
class OptimizedCache {
    constructor(size) {
        this.keys = new Int32Array(size);
        this.values = new Array(size);
        this.size = 0;
        this.maxSize = size;
    }

    get(key) {
        const index = this.keys.indexOf(key);
        return index !== -1 ? this.values[index] : undefined;
    }

    set(key, value) {
        const index = this.keys.indexOf(key);
        if (index !== -1) {
            this.values[index] = value;
            return;
        }
        
        if (this.size >= this.maxSize) {
            // Politique LRU simplifiée
            this.keys.copyWithin(0, 1);
            this.values.copyWithin(0, 1);
            this.size--;
        }
        
        this.keys[this.size] = key;
        this.values[this.size] = value;
        this.size++;
    }

    clear() {
        this.size = 0;
    }
}

// Caches optimisés
const timestampCache = new OptimizedCache(SHARED.BUFFER_SIZE);
const stopIdCache = new OptimizedCache(SHARED.BUFFER_SIZE);
const processedStopsCache = new OptimizedCache(SHARED.BUFFER_SIZE);

// Pool de Dates pré-allouées pour le formatage
const datePool = Array.from({ length: 10 }, () => new Date());
let datePoolIndex = 0;

// Fonction optimisée de formatage du temps
const formatTime = (() => {
    const timeStringPool = new Array(60).fill().map((_, i) => 
        SHARED.TIME_FORMAT.format(new Date(2025, 0, 1, Math.floor(i/60), i%60)));

    return (timestamp) => {
        if (!timestamp) return SHARED.UNKNOWN_TIME;
        
        const cacheKey = timestamp | 0;
        let cached = timestampCache.get(cacheKey);
        if (cached) return cached;

        const date = datePool[datePoolIndex];
        datePoolIndex = (datePoolIndex + 1) % 10;
        date.setTime(timestamp * 1000);
        
        // Optimisation pour les heures communes (00:00-23:59)
        const hours = date.getHours();
        const minutes = date.getMinutes();
        if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
            cached = timeStringPool[hours * 60 + minutes];
        } else {
            cached = SHARED.TIME_FORMAT.format(date);
        }
        
        timestampCache.set(cacheKey, cached);
        return cached;
    };
})();

// Fonction optimisée de traitement des arrêts
const processStop = (() => {
    const stopResults = new Array(SHARED.BUFFER_SIZE);
    let stopResultIndex = 0;

    return (stop, now) => {
        const stopId = stop.stopId.startsWith(SHARED.STOP_PREFIX) ? 
            stop.stopId.slice(2) : stop.stopId;
        
        const arrivalTime = stop.arrival?.time ?? null;
        const departureTime = stop.departure?.time ?? null;
        const unifiedTime = formatTime(arrivalTime || departureTime);
        
        // Réutilisation des objets
        let result = stopResults[stopResultIndex];
        if (!result) {
            result = {
                stopId: '',
                arrivalTime: '',
                departureTime: '',
                unifiedTime: '',
                delay: null
            };
            stopResults[stopResultIndex] = result;
        }
        
        result.stopId = stopId;
        result.arrivalTime = arrivalTime ? formatTime(arrivalTime) : SHARED.UNKNOWN_TIME;
        result.departureTime = departureTime ? formatTime(departureTime) : SHARED.UNKNOWN_TIME;
        result.unifiedTime = unifiedTime;
        result.delay = arrivalTime ? ((arrivalTime - now) | 0) : null;
        
        stopResultIndex = (stopResultIndex + 1) % SHARED.BUFFER_SIZE;
        return result;
    };
})();

// Traitement optimisé des mises à jour
function processTripUpdates(data) {
    const tripUpdates = Object.create(null);
    const now = (Date.now() / 1000) | 0;
    
    if (!data.entity) return tripUpdates;
    
    const entities = data.entity;
    const entitiesLength = entities.length;
    const processedStopsArray = new Array(entitiesLength);
    
    // Pré-allocation pour éviter les réallocations
    for (let i = 0; i < entitiesLength; i++) {
        processedStopsArray[i] = [];
    }

    // Traitement en batch
    for (let j = 0; j < entitiesLength; j++) {
        const tripUpdate = entities[j].tripUpdate;
        if (!tripUpdate?.stopTimeUpdate?.length) continue;

        const stops = tripUpdate.stopTimeUpdate;
        const stopsLength = stops.length;
        const processedStops = processedStopsArray[j];
        const arrivalDelays = Object.create(null);
        
        // Traitement optimisé des arrêts
        for (let i = 0; i < stopsLength; i++) {
            const stop = stops[i];
            const cacheKey = `${stop.stopId}:${stop.arrival?.time}:${stop.departure?.time}`;
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
            (processedStops[stopsLength - 1]?.stopId || SHARED.UNKNOWN_STOP) : 
            SHARED.UNKNOWN_STOP;

        tripUpdates[tripUpdate.trip.tripId] = {
            stopUpdates: processedStops,
            lastStopId,
            nextStops: processedStops,
            arrivalDelays
        };
    }

    return tripUpdates;
}

// Nettoyage périodique des caches avec gestion de la mémoire
const clearCaches = () => {
    timestampCache.clear();
    processedStopsCache.clear();
    stopIdCache.clear();
    timestampIndex = 0;
    datePoolIndex = 0;
    
    // Force garbage collection si possible
    if (typeof global !== 'undefined' && global.gc) {
        global.gc();
    }
};

// Gestion des messages optimisée
self.onmessage = (() => {
    let lastProcessingTime = 0;
    let processingCount = 0;
    
    return ({ data }) => {
        const startTime = performance.now();
        
        // Nettoyage adaptatif des caches basé sur les performances
        if (lastProcessingTime > 400 && processingCount > 100) {
            clearCaches();
            processingCount = 0;
        }
        
        const result = processTripUpdates(data);
        const processingTime = performance.now() - startTime;
        
        lastProcessingTime = processingTime;
        processingCount++;
        
        self.postMessage({
            tripUpdates: result,
            metrics: {
                processingTime,
                entitiesCount: data.entity?.length || 0,
                cacheSize: {
                    timestamp: timestampCache.size,
                    stopId: stopIdCache.size,
                    processedStops: processedStopsCache.size
                }
            }
        });
    };
})();

// Nettoyage périodique avec intervalle adaptatif
setInterval(clearCaches, SHARED.CACHE_DURATION);
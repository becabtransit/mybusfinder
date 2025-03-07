// Configuration des options de formatage de l'heure une seule fois
const TIME_FORMAT_OPTIONS = { hour: '2-digit', minute: '2-digit' };
const UNKNOWN_TIME = "Heure inconnue";
const UNKNOWN_STOP = "Inconnu";

// Initialisation des caches avec des Maps pour de meilleures performances
const timestampCache = new Map();
const stopIdCache = new Map();

// Utilisation de SharedArrayBuffer pour le transfert de données si compatible
let sharedBufferEnabled = false;
try {
    // Vérifier si SharedArrayBuffer est disponible
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
    
    // Envoi des données avec des métriques de performance
    self.postMessage({
        tripUpdates: result,
        metrics: {
            processingTime,
            entitiesCount: data.entity?.length || 0
        }
    });
};

// Fonction optimisée pour le formatage d'heure avec cache
function formatTime(timestamp, cache) {
    if (!timestamp) return UNKNOWN_TIME;
    
    // Transformation de timestamp en clé entière pour meilleure performance de Map
    const cacheKey = Math.floor(timestamp);
    let cached = cache.get(cacheKey);
    if (cached) return cached;
    
    // Création d'une date et formatage
    const date = new Date(timestamp * 1000);
    cached = date.toLocaleTimeString([], TIME_FORMAT_OPTIONS);
    cache.set(cacheKey, cached);
    return cached;
}

// Traitement optimisé d'un arrêt individuel
function processStop(stop, now) {
    // Extraction et cache d'ID d'arrêt avec regex optimisé
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

// Fonction principale de traitement optimisée
function processTripUpdates(data) {
    // Utilisation d'un objet littéral au lieu de Object.create pour petites performances
    const tripUpdates = {};
    const now = Date.now() / 1000;
    
    // Échantillonnage direct de data.entity pour éviter une variable supplémentaire
    const entities = data.entity || [];
    const entitiesLength = entities.length;
    
    // Boucle for classique pour performance maximale
    for (let j = 0; j < entitiesLength; j++) {
        const entity = entities[j];
        const tripUpdate = entity.tripUpdate;
        
        // Vérification rapide de la validité des données
        if (!tripUpdate || !tripUpdate.stopTimeUpdate || !tripUpdate.stopTimeUpdate.length) continue;

        const trip = tripUpdate.trip;
        const stops = tripUpdate.stopTimeUpdate;
        const stopsLength = stops.length;
        
        // Pré-allocation du tableau pour éviter les redimensionnements
        const processedStops = new Array(stopsLength);
        const arrivalDelays = {};
        
        // Traitement des arrêts avec boucle for classique
        for (let i = 0; i < stopsLength; i++) {
            const processedStop = processStop(stops[i], now);
            processedStops[i] = processedStop;
            
            // Ajout conditionnel pour les retards
            if (processedStop.delay !== null) {
                arrivalDelays[processedStop.stopId] = processedStop.delay;
            }
        }

        // Récupération efficace du dernier arrêt
        const lastStopId = stopsLength > 0 ? 
            (processedStops[stopsLength - 1]?.stopId || UNKNOWN_STOP) : 
            UNKNOWN_STOP;

        // Structure finale de données optimisée
        tripUpdates[trip.tripId] = {
            stopUpdates: processedStops,
            lastStopId,
            nextStops: processedStops,
            arrivalDelays
        };
    }

    return tripUpdates;
}
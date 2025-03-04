// worker.js
self.onmessage = ({ data }) => {
    const processedData = processTripUpdates(data);
    self.postMessage(processedData);
};

function processTripUpdates(data) {
    const tripUpdates = Object.create(null);
    const now = Date.now() / 1000;

    // Préallocation pour réduire les allocations mémoire
    const localCache = {
        timestampCache: new Map(),
        stopIdCache: new Map()
    };

    for (let i = 0, len = data.entity.length; i < len; i++) {
        const { tripUpdate } = data.entity[i];
        if (!tripUpdate?.stopTimeUpdate?.length) continue;

        const { trip, stopTimeUpdate: stops } = tripUpdate;
        const tripId = trip.tripId;

        // Traitement optimisé des stops
        const processedStops = [];
        const arrivalDelays = Object.create(null);
        let lastStopId = 'Inconnu';

        for (let j = 0, stopLen = stops.length; j < stopLen; j++) {
            const stop = stops[j];
            const stopId = localCache.stopIdCache.get(stop.stopId) || 
                           localCache.stopIdCache.set(stop.stopId, stop.stopId.replace("0:", "")).get(stop.stopId);
            
            const arrivalTime = stop.arrival?.time ?? null;
            const departureTime = stop.departure?.time ?? null;

            const processedStop = {
                stopId,
                arrivalTime: formatTime(arrivalTime, localCache.timestampCache),
                departureTime: formatTime(departureTime, localCache.timestampCache),
                unifiedTime: formatTime(arrivalTime || departureTime, localCache.timestampCache)
            };

            processedStops.push(processedStop);

            // Calcul des délais
            if (arrivalTime) {
                arrivalDelays[stopId] = arrivalTime - now;
            }

            // Dernier stop
            if (j === stops.length - 1) {
                lastStopId = stopId;
            }
        }

        // Création rapide de l'objet de mise à jour
        tripUpdates[tripId] = {
            stopUpdates: processedStops,
            lastStopId,
            nextStops: processedStops,
            arrivalDelays
        };
    }

    return tripUpdates;
}

// Fonction de formatage avec mise en cache
function formatTime(timestamp, cache) {
    if (!timestamp) return "Heure inconnue";

    // Utilisation d'un cache pour réduire les conversions de date
    if (cache.has(timestamp)) {
        return cache.get(timestamp);
    }

    const formattedTime = new Date(timestamp * 1000).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    cache.set(timestamp, formattedTime);
    return formattedTime;
}
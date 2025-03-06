// Pré-allocation des Maps pour éviter les réallocations
const timestampCache = new Map();
const stopIdCache = new Map();
const timeFormatOptions = { hour: '2-digit', minute: '2-digit' };

self.onmessage = ({ data }) => {
    const processedData = processTripUpdates(data);
    self.postMessage(processedData);
};

function processTripUpdates(data) {
    const tripUpdates = Object.create(null);
    const now = Date.now() / 1000;

    // Pré-allouer la taille du tableau
    const entities = data.entity;
    const len = entities.length;

    for (let i = 0; i < len; i++) {
        const tripUpdate = entities[i].tripUpdate;
        if (!tripUpdate?.stopTimeUpdate?.length) continue;

        const { trip, stopTimeUpdate: stops } = tripUpdate;
        const tripId = trip.tripId;
        const stopsLength = stops.length;
        
        // Pré-allouer les tableaux
        const processedStops = new Array(stopsLength);
        const arrivalDelays = Object.create(null);
        let lastStopId = 'Inconnu';

        for (let j = 0; j < stopsLength; j++) {
            const stop = stops[j];
            // Optimisation de la recherche dans le cache
            let stopId = stopIdCache.get(stop.stopId);
            if (!stopId) {
                stopId = stop.stopId.replace("0:", "");
                stopIdCache.set(stop.stopId, stopId);
            }

            const arrivalTime = stop.arrival?.time ?? null;
            const departureTime = stop.departure?.time ?? null;

            processedStops[j] = {
                stopId,
                arrivalTime: formatTime(arrivalTime),
                departureTime: formatTime(departureTime),
                unifiedTime: formatTime(arrivalTime || departureTime)
            };

            if (arrivalTime) {
                arrivalDelays[stopId] = arrivalTime - now;
            }

            if (j === stopsLength - 1) {
                lastStopId = stopId;
            }
        }

        tripUpdates[tripId] = {
            stopUpdates: processedStops,
            lastStopId,
            nextStops: processedStops,
            arrivalDelays
        };
    }

    return tripUpdates;
}

function formatTime(timestamp) {
    if (!timestamp) return "Heure inconnue";

    let formatted = timestampCache.get(timestamp);
    if (formatted) return formatted;

    formatted = new Date(timestamp * 1000).toLocaleTimeString([], timeFormatOptions);
    timestampCache.set(timestamp, formatted);
    
    return formatted;
}
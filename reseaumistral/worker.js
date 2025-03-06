// worker.js
self.onmessage = ({ data }) => {
    self.postMessage(processTripUpdates(data));
};

function processTripUpdates(data) {
    const tripUpdates = Object.create(null);
    const now = Date.now() / 1000;
    
    // Précalculer l'heure de formatage pour les 24 prochaines heures
    const timeFormatCache = new Map();
    
    // Optimisation du cache de stopId avec une table de hachage plus rapide
    const stopIdCache = Object.create(null);
    
    const entities = data.entity;
    const entityLength = entities.length;
    
    for (let i = 0; i < entityLength; i++) {
        const tripUpdate = entities[i].tripUpdate;
        if (!tripUpdate || !tripUpdate.stopTimeUpdate || !tripUpdate.stopTimeUpdate.length) continue;
        
        const stops = tripUpdate.stopTimeUpdate;
        const tripId = tripUpdate.trip.tripId;
        const stopsLength = stops.length;
        
        const processedStops = new Array(stopsLength);
        const arrivalDelays = Object.create(null);
        
        // Traitement des arrêts en une seule passe
        for (let j = 0; j < stopsLength; j++) {
            const stop = stops[j];
            const rawStopId = stop.stopId;
            
            // Optimisation du remplacement avec mise en cache
            let stopId = stopIdCache[rawStopId];
            if (!stopId) {
                stopId = rawStopId.replace("0:", "");
                stopIdCache[rawStopId] = stopId;
            }
            
            const arrivalTime = stop.arrival?.time ?? null;
            const departureTime = stop.departure?.time ?? null;
            
            processedStops[j] = {
                stopId,
                arrivalTime: getFormattedTime(arrivalTime, timeFormatCache),
                departureTime: getFormattedTime(departureTime, timeFormatCache),
                unifiedTime: getFormattedTime(arrivalTime || departureTime, timeFormatCache)
            };
            
            if (arrivalTime) {
                arrivalDelays[stopId] = arrivalTime - now;
            }
        }
        
        // Détermination directe du dernier arrêt
        const lastStop = stops[stopsLength - 1];
        const lastStopId = stopIdCache[lastStop.stopId] || (stopIdCache[lastStop.stopId] = lastStop.stopId.replace("0:", ""));
        
        tripUpdates[tripId] = {
            stopUpdates: processedStops,
            lastStopId,
            nextStops: processedStops,  // Référence, pas de copie
            arrivalDelays
        };
    }
    
    return tripUpdates;
}

// Fonction optimisée pour formater l'heure
function getFormattedTime(timestamp, cache) {
    if (!timestamp) return "Heure inconnue";
    
    const cachedTime = cache.get(timestamp);
    if (cachedTime) return cachedTime;
    
    // Calcul optimisé des heures et minutes sans utiliser Date
    const totalSeconds = timestamp;
    const date = new Date(totalSeconds * 1000);
    
    // Formatage manuel, plus rapide que toLocaleTimeString
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;
    
    cache.set(timestamp, formattedTime);
    return formattedTime;
}
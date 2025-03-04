// worker.js
self.onmessage = function(e) {
    const processedData = processTripUpdates(e.data);
    self.postMessage(processedData);
};

function processTripUpdates(data) {
    const tripUpdates = {};
    const now = Date.now() / 1000;

    for (const entity of data.entity) {
        const { tripUpdate } = entity;
        if (!tripUpdate?.stopTimeUpdate) continue;

        const { trip, stopTimeUpdate: stopTimeUpdates } = tripUpdate;
        const tripId = trip.tripId;

        const processedStopUpdates = stopTimeUpdates.map(update => {
            const stopId = update.stopId.replace("0:", "");
            const arrivalTime = update.arrival?.time ?? null;
            const departureTime = update.departure?.time ?? null;

            return {
                stopId,
                arrivalTime: formatTime(arrivalTime),
                departureTime: formatTime(departureTime),
                unifiedTime: formatTime(arrivalTime || departureTime),
                arrivalDelay: arrivalTime ? arrivalTime - now : null
            };
        });

        const lastStop = processedStopUpdates[processedStopUpdates.length - 1];
        
        tripUpdates[tripId] = {
            stopUpdates: processedStopUpdates,
            lastStopId: lastStop?.stopId ?? 'Inconnu',
            nextStops: processedStopUpdates,
            arrivalDelays: Object.fromEntries(
                processedStopUpdates
                    .filter(stop => stop.arrivalDelay !== null)
                    .map(stop => [stop.stopId, stop.arrivalDelay])
            )
        };
    }

    return tripUpdates;
}

// Fonction utilitaire pour formater les heures
function formatTime(timestamp) {
    if (!timestamp) return "Heure inconnue";
    return new Date(timestamp * 1000).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}
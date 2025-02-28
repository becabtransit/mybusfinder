// worker.js
onmessage = function(e) {
    const data = e.data;

    const processedData = processTripUpdates(data);

    postMessage(processedData);
};

function processTripUpdates(data) {
    const tripUpdates = {};

    data.entity.forEach(entity => {
        const tripUpdate = entity.tripUpdate;
        if (tripUpdate && tripUpdate.stopTimeUpdate) {
            const tripId = tripUpdate.trip.tripId;
            const stopTimeUpdates = tripUpdate.stopTimeUpdate;

            const lastStopId = stopTimeUpdates.length > 0 ? stopTimeUpdates[stopTimeUpdates.length - 1].stopId.replace("0:", "") : 'Inconnu';

            const nextStops = stopTimeUpdates.map(update => {
                const stopId = update.stopId.replace("0:", "");
                const arrivalTime = update.arrival?.time ?? null; 
                const departureTime = update.departure?.time ?? null;

                const unifiedTime = arrivalTime 
                    ? new Date(arrivalTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                    : departureTime 
                        ? new Date(departureTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                        : "Heure inconnue";

                return {
                    stopId,
                    arrivalTime: arrivalTime ? new Date(arrivalTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
                    departureTime: departureTime ? new Date(departureTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
                    unifiedTime 
                };
            });

            tripUpdates[tripId] = {
                stopUpdates: stopTimeUpdates,
                lastStopId: lastStopId,
                arrivalDelays: {},
                nextStops: nextStops
            };

            stopTimeUpdates.forEach(update => {
                if (update.arrival) {
                    const arrivalDelay = update.arrival.time - Date.now() / 1000; 
                    tripUpdates[tripId].arrivalDelays[update.stopId] = arrivalDelay;
                }
            });
        }
    });

    return tripUpdates; 
}

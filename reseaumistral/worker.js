onmessage = function(e) {
    postMessage(processTripUpdates(e.data));
};

function processTripUpdates(data) {
    const tripUpdates = {};
    const now = Date.now() / 1000;
    const timeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    
    for (let i = 0; i < data.entity.length; i++) {
        const entity = data.entity[i];
        const tripUpdate = entity.tripUpdate;
        
        if (!tripUpdate || !tripUpdate.stopTimeUpdate || !tripUpdate.stopTimeUpdate.length) {
            continue;
        }
        
        const tripId = tripUpdate.trip.tripId;
        const stopTimeUpdates = tripUpdate.stopTimeUpdate;
        const stopUpdatesLength = stopTimeUpdates.length;
        
        const lastStopId = stopUpdatesLength > 0 
            ? stopTimeUpdates[stopUpdatesLength - 1].stopId.replace("0:", "") 
            : 'Inconnu';
        
        const nextStops = [];
        const arrivalDelays = {};
        
        for (let j = 0; j < stopUpdatesLength; j++) {
            const update = stopTimeUpdates[j];
            const stopId = update.stopId.replace("0:", "");
            const arrival = update.arrival;
            const departure = update.departure;
            
            let arrivalTimeStr = null;
            let departureTimeStr = null;
            let unifiedTime = "Heure inconnue";
            
            if (arrival && arrival.time) {
                const arrivalDate = new Date(arrival.time * 1000);
                arrivalTimeStr = arrivalDate.toLocaleTimeString([], timeFormatOptions);
                unifiedTime = arrivalTimeStr;
                
                arrivalDelays[update.stopId] = arrival.time - now;
            }
            
            if (!arrivalTimeStr && departure && departure.time) {
                departureTimeStr = new Date(departure.time * 1000).toLocaleTimeString([], timeFormatOptions);
                unifiedTime = departureTimeStr;
            }
            
            nextStops.push({
                stopId,
                arrivalTime: arrivalTimeStr,
                departureTime: departureTimeStr,
                unifiedTime
            });
        }
        
        tripUpdates[tripId] = {
            stopUpdates: stopTimeUpdates,
            lastStopId: lastStopId,
            arrivalDelays: arrivalDelays,
            nextStops: nextStops
        };
    }
    
    return tripUpdates;
}
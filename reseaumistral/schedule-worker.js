self.onmessage = function(e) {
    const { routeId, stopId, destinationId, dateString, trips, stopTimes, calendar, calendarDates } = e.data;
    
    const selectedDate = new Date(dateString);
    const schedule = calculateSchedule(
        trips,
        stopTimes,
        stopId,
        destinationId,
        selectedDate,
        calendar,
        calendarDates
    );
    
    self.postMessage({
        schedule,
        formattedDate: selectedDate.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    });
};

function calculateSchedule(trips, stopTimes, stopId, destinationId, date, calendar, calendarDates) {
    const activeServiceIds = getActiveServiceIds(date.getDay(), formatDate(date));
    const schedule = [];
    
    // Optimisation : pré-filtrer les trips valides
    const validTrips = trips.filter(trip => activeServiceIds.includes(trip.service_id));
    
    // Utiliser un Set pour les heures uniques
    const uniqueHours = new Set();
    
    validTrips.forEach(trip => {
        const tripStops = stopTimes[trip.trip_id];
        if (!tripStops) return;
        
        let destinationReached = false;
        
        for (const stopTime of tripStops) {
            if (stopTime.stop_id === destinationId) {
                destinationReached = true;
                break;
            }
            if (stopTime.stop_id === stopId && !destinationReached) {
                uniqueHours.add(stopTime.arrival_time);
                break;
            }
        }
    });
    
    return Array.from(uniqueHours).sort();
}
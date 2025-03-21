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
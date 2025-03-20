// stop-times-worker.js
self.addEventListener('message', function(e) {
    const fileContent = e.data.fileContent;
    const result = processStopTimes(fileContent);
    self.postMessage(result);
});

function processStopTimes(fileContent) {
    try {
        if (!fileContent) {
            return {};
        }
        
        const stopTimes = {};
        const lines = fileContent.split('\n');
        
        const headers = lines[0].split(',');
        const stopTripIdIndex = headers.indexOf('trip_id');
        const stopIdIndex = headers.indexOf('stop_id');
        const arrivalTimeIndex = headers.indexOf('arrival_time');
        
        if (stopTripIdIndex === -1 || stopIdIndex === -1 || arrivalTimeIndex === -1) {
            throw new Error('Format de stop_times.txt invalide: colonnes requises manquantes');
        }
        
        lines.slice(1).forEach(line => {
            if (!line.trim()) return;
            const values = line.split(',');
            if (values[stopTripIdIndex]) {
                if (!stopTimes[values[stopTripIdIndex]]) {
                    stopTimes[values[stopTripIdIndex]] = [];
                }
                stopTimes[values[stopTripIdIndex]].push({
                    stop_id: values[stopIdIndex],
                    arrival_time: values[arrivalTimeIndex].split(':').slice(0, 2).join('h'),
                });
            }
        });
        
        return stopTimes;
    } catch (error) {
        self.postMessage({ error: error.message });
        return {};
    }
}
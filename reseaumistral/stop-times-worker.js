// stop-times-worker.js
self.addEventListener('message', function(e) {
    const fileContent = e.data.fileContent;
    const batchSize = 5000; // Traitement par lots
    
    try {
        const lines = fileContent.split('\n');
        const headers = lines[0].split(',');
        const stopTripIdIndex = headers.indexOf('trip_id');
        const stopIdIndex = headers.indexOf('stop_id');
        const arrivalTimeIndex = headers.indexOf('arrival_time');
        
        const stopTimes = {};
        let currentBatch = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            currentBatch.push(line);
            
            if (currentBatch.length >= batchSize || i === lines.length - 1) {
                // Traitement du lot
                processBatch(currentBatch, stopTimes, stopTripIdIndex, stopIdIndex, arrivalTimeIndex);
                currentBatch = [];
                
                // Notification de progression
                self.postMessage({
                    type: 'progress',
                    progress: Math.floor((i / lines.length) * 100)
                });
            }
        }
        
        self.postMessage({
            type: 'complete',
            data: stopTimes
        });
        
    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
});

function processBatch(batch, stopTimes, stopTripIdIndex, stopIdIndex, arrivalTimeIndex) {
    batch.forEach(line => {
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
}
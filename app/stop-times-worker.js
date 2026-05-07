// stop-times-worker.js
self.onmessage = function(e) {
    const fileContent = e.data;
    const stopTimes = {};
    
    try {
      if (!fileContent) {
        self.postMessage({ type: 'warning', message: 'Aucun contenu de fichier stop_times fourni' });
        return;
      }
      
      self.postMessage({ type: 'log', message: 'Début du chargement des stop_times (fichier volumineux ~20Mo)...' });
      
      let newlineChar = '\n';
      if (fileContent.indexOf('\r\n') >= 0 && fileContent.indexOf('\r\n') < fileContent.indexOf('\n', 1)) {
        newlineChar = '\r\n';
      }
      
      const headerEndPos = fileContent.indexOf(newlineChar);
      const headerLine = fileContent.substring(0, headerEndPos);
      
      const headers = parseCSVLine(headerLine);
      
      const stopTripIdIndex = headers.indexOf('trip_id');
      const stopIdIndex = headers.indexOf('stop_id');
      const arrivalTimeIndex = headers.indexOf('arrival_time');
      const departureTimeIndex = headers.indexOf('departure_time');
      const stopSequenceIndex = headers.indexOf('stop_sequence');
      const pickupTypeIndex = headers.indexOf('pickup_type');
      const dropOffTypeIndex = headers.indexOf('drop_off_type');
      
      if (stopTripIdIndex === -1 || stopIdIndex === -1 || arrivalTimeIndex === -1) {
        self.postMessage({ type: 'error', message: 'Format de fichier stop_times.txt invalide, colonnes requises manquantes' });
        return;
      }
      
      const tempStopTimes = new Map();
      let entryCount = 0;
      let warningCount = 0;
      const MAX_WARNINGS = 5;
      
      const fileSize = fileContent.length;
      const onePercentSize = fileSize / 20;
      let lastProgressReport = 0;
      let currentProgress = 0;
      
      const tripIdSet = new Set();
      
      let startPos = headerEndPos + newlineChar.length;
      let endPos, line;
      
      while (startPos < fileContent.length) {
        endPos = fileContent.indexOf(newlineChar, startPos);
        
        if (endPos === -1) {
          line = fileContent.substring(startPos);
          startPos = fileContent.length;
        } else {
          line = fileContent.substring(startPos, endPos);
          startPos = endPos + newlineChar.length;
        }
        
        if (!line.trim()) continue;
        
        currentProgress = startPos;
        if (currentProgress - lastProgressReport > onePercentSize) {
          const percentComplete = Math.floor((currentProgress / fileSize) * 100);
          self.postMessage({ type: 'progress', percent: percentComplete, count: entryCount });
          lastProgressReport = currentProgress;
        }
        
        let values;
        if (line.indexOf('"') === -1) {
          values = line.split(',');
        } else {
          values = parseCSVLine(line);
        }
        
        if (values.length <= Math.max(stopTripIdIndex, stopIdIndex, arrivalTimeIndex)) {
          if (warningCount < MAX_WARNINGS) {
            warningCount++;
            self.postMessage({ type: 'warning', message: `Ligne ignorée - données incomplètes (${warningCount}/${MAX_WARNINGS} avertissements max)` });
          }
          continue;
        }
        
        const tripId = values[stopTripIdIndex];
        if (!tripId) continue;
        
        tripIdSet.add(tripId);
        
        let tripStops = tempStopTimes.get(tripId);
        if (!tripStops) {
          tripStops = [];
          tempStopTimes.set(tripId, tripStops);
        }
        
        const stopEntry = {
          stop_id: values[stopIdIndex],
          stop_sequence: stopSequenceIndex !== -1 && values[stopSequenceIndex] ? 
            parseInt(values[stopSequenceIndex], 10) : 0
        };
        
        if (values[arrivalTimeIndex]) {
          const timeStr = values[arrivalTimeIndex];
          const colonPos = timeStr.indexOf(':');
          if (colonPos !== -1) {
            const hour = timeStr.substring(0, colonPos);
            const minute = timeStr.substring(colonPos + 1, colonPos + 3);
            stopEntry.arrival_time = `${hour}h${minute}`;
          } else {
            stopEntry.arrival_time = timeStr;
          }
        }
        
        if (departureTimeIndex !== -1 && values[departureTimeIndex] && 
            values[departureTimeIndex] !== values[arrivalTimeIndex]) {
          
          const timeStr = values[departureTimeIndex];
          const colonPos = timeStr.indexOf(':');
          if (colonPos !== -1) {
            const hour = timeStr.substring(0, colonPos);
            const minute = timeStr.substring(colonPos + 1, colonPos + 3);
            stopEntry.departure_time = `${hour}h${minute}`;
          } else {
            stopEntry.departure_time = timeStr;
          }
        } else {
          stopEntry.departure_time = stopEntry.arrival_time;
        }
        
        if (pickupTypeIndex !== -1 && values[pickupTypeIndex] && values[pickupTypeIndex] !== '0') {
          stopEntry.pickup_type = parseInt(values[pickupTypeIndex], 10);
        }
        
        if (dropOffTypeIndex !== -1 && values[dropOffTypeIndex] && values[dropOffTypeIndex] !== '0') {
          stopEntry.drop_off_type = parseInt(values[dropOffTypeIndex], 10);
        }
        
        tripStops.push(stopEntry);
        entryCount++;
        
        if (entryCount % 1000000 === 0) {
          self.postMessage({ type: 'log', message: `Traitement intermédiaire: ${entryCount} arrêts traités..` });
          
          const batchResults = {};
          let batchCount = 0;
          
          for (const [batchTripId, stops] of tempStopTimes) {
            stops.sort((a, b) => a.stop_sequence - b.stop_sequence);
            batchResults[batchTripId] = stops;
            tripIdSet.delete(batchTripId);
            batchCount++;
            
            if (batchCount >= 10000) break; 
          }
          
          self.postMessage({ type: 'partial-results', results: batchResults, count: batchCount });
          
          for (const tripId in batchResults) {
            tempStopTimes.delete(tripId);
          }
        }
      }
    
      self.postMessage({ type: 'log', message: `Traitement final: tri et finalisation de ${tempStopTimes.size} trajets..` });
  
      for (const [tripId, stops] of tempStopTimes) {
        stops.sort((a, b) => a.stop_sequence - b.stop_sequence);
        stopTimes[tripId] = stops;
      }
      
      tempStopTimes.clear();
      tripIdSet.clear();
      
      self.postMessage({ 
        type: 'complete', 
        results: stopTimes, 
        tripCount: Object.keys(stopTimes).length, 
        stopCount: entryCount 
      });
  
    } catch (error) {
      self.postMessage({ type: 'error', message: 'Erreur lors du chargement des horaires: ' + error.message });
    }
  };
  
  function parseCSVLine(line) {
    const result = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          currentValue += '"';
          i++; 
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    result.push(currentValue);
    
    return result;
  }

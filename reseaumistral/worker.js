const MAX_CACHE_SIZE = 2000; 
const TIME_FORMAT_OPTIONS = { hour: '2-digit', minute: '2-digit' };
const UNKNOWN_TIME = "Heure inconnue";
const UNKNOWN_STOP = "Inconnu";
const FETCH_TIMEOUT = 5000;

class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.accessOrder = [];
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
    
    return this.cache.get(key);
  }

  set(key, value) {
    if (this.cache.has(key)) {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    } 
    else if (this.cache.size >= this.maxSize) {
      const oldest = this.accessOrder.shift();
      this.cache.delete(oldest);
    }
    
    this.cache.set(key, value);
    this.accessOrder.push(key);
    return value;
  }
  
  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }
}

const timestampCache = new LRUCache(MAX_CACHE_SIZE);
const stopIdCache = new LRUCache(MAX_CACHE_SIZE);

let lastProcessedData = null;
let protoRoot = null;

importScripts('https://cdnjs.cloudflare.com/ajax/libs/protobufjs/6.11.2/protobuf.min.js');

async function preloadProto() {
  try {
    protoRoot = await protobuf.load('gtfs-realtime.proto');
    return true;
  } catch (error) {
    console.error('Erreur préchargement proto:', error);
    return false;
  }
}

preloadProto();

self.onmessage = async ({ data: command }) => {
  try {
    if (command.action === 'fetchTripUpdates') {
      await handleFetchTripUpdates();
    } else if (command.data) {
      handleProcessData(command.data);
    }
  } catch (error) {
    reportError(error);
  }
};

async function handleFetchTripUpdates() {
  performance.mark('fetch-start');
  
  try {
    if (!protoRoot) {
      await preloadProto();
    }
    
    const data = await fetchTripUpdateData();
    performance.mark('fetch-end');
    performance.measure('fetch-time', 'fetch-start', 'fetch-end');
    
    performance.mark('process-start');
    const result = processTripUpdates(data);
    performance.mark('process-end');
    performance.measure('process-time', 'process-start', 'process-end');
    
    const fetchMeasure = performance.getEntriesByName('fetch-time')[0];
    const processMeasure = performance.getEntriesByName('process-time')[0];
    
    self.postMessage({
      type: 'tripUpdatesResult',
      tripUpdates: result,
      metrics: {
        fetchTime: fetchMeasure.duration,
        processTime: processMeasure.duration,
        totalTime: fetchMeasure.duration + processMeasure.duration,
        entitiesCount: data.entity?.length || 0
      }
    });
    
    performance.clearMarks();
    performance.clearMeasures();
    
  } catch (error) {
    reportError(error);
  }
}

function handleProcessData(data) {
  performance.mark('process-start');
  const result = processTripUpdates(data);
  performance.mark('process-end');
  performance.measure('process-time', 'process-start', 'process-end');
  
  const processMeasure = performance.getEntriesByName('process-time')[0];
  
  self.postMessage({
    type: 'tripUpdatesResult',
    tripUpdates: result,
    metrics: {
      processTime: processMeasure.duration,
      entitiesCount: data.entity?.length || 0
    }
  });
  
  performance.clearMarks();
  performance.clearMeasures();
}

function reportError(error) {
  self.postMessage({
    type: 'error',
    error: error.message
  });
}

async function fetchTripUpdateData() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    
    const response = await fetch('proxy-cors/proxy_tripupdate.php', {
      signal: controller.signal,
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    
    const FeedMessage = protoRoot.lookupType('transit_realtime.FeedMessage');
    const message = FeedMessage.decode(new Uint8Array(buffer));
    return FeedMessage.toObject(message, { longs: String });
    
  } catch (error) {
    console.error('Erreur récupération trip updates:', error);
    throw error;
  }
}

function formatTime(timestamp, cache) {
  if (!timestamp) return UNKNOWN_TIME;
  
  const cacheKey = Math.floor(timestamp);
  let cached = cache.get(cacheKey);
  if (cached) return cached;
  
  const date = new Date(timestamp * 1000);
  cached = date.toLocaleTimeString([], TIME_FORMAT_OPTIONS);
  return cache.set(cacheKey, cached);
}

function processStop(stop, now) {
  if (!stop || !stop.stopId) return null;
  
  const stopIdRaw = stop.stopId;
  let stopId = stopIdCache.get(stopIdRaw);
  
  if (!stopId) {
    stopId = stopIdRaw.replace("0:", "");
    stopIdCache.set(stopIdRaw, stopId);
  }
  
  const arrivalTime = stop.arrival?.time ?? null;
  const departureTime = stop.departure?.time ?? null;
  const unifiedTime = arrivalTime || departureTime;
  
  return {
    stopId,
    arrivalTime: formatTime(arrivalTime, timestampCache),
    departureTime: formatTime(departureTime, timestampCache),
    unifiedTime: formatTime(unifiedTime, timestampCache),
    delay: arrivalTime ? Math.floor(arrivalTime - now) : null
  };
}

function processTripUpdates(data) {

  if (lastProcessedData === data) {
    return lastProcessedData.processedResult;
  }
  
  const tripUpdates = Object.create(null); 
  const now = Math.floor(Date.now() / 1000);
  
  const entities = data.entity || [];
  const entitiesLength = entities.length;
  
  const estimatedCapacity = Math.min(entitiesLength, 5000);
  
  const byTripId = new Map();
  
  for (let j = 0; j < entitiesLength; j++) {
    const entity = entities[j];
    const tripUpdate = entity.tripUpdate;
    
    if (!tripUpdate || !tripUpdate.stopTimeUpdate || !tripUpdate.stopTimeUpdate.length) {
      continue;
    }

    const trip = tripUpdate.trip;
    
    if (!trip || !trip.tripId) {
      continue;
    }
    
    byTripId.set(trip.tripId, { trip, stops: tripUpdate.stopTimeUpdate });
  }
  
  for (const [tripId, data] of byTripId) {
    const stops = data.stops;
    const stopsLength = stops.length;
    
    if (stopsLength === 0) continue;
    
    const processedStops = new Array(stopsLength);
    const arrivalDelays = Object.create(null);
    
    for (let i = 0; i < stopsLength; i++) {
      const processedStop = processStop(stops[i], now);
      
      if (!processedStop) continue;
      
      processedStops[i] = processedStop;
      
      if (processedStop.delay !== null) {
        arrivalDelays[processedStop.stopId] = processedStop.delay;
      }
    }

    const lastStop = processedStops[stopsLength - 1];
    const lastStopId = lastStop?.stopId || UNKNOWN_STOP;

    tripUpdates[tripId] = {
      stopUpdates: processedStops,
      lastStopId,
      nextStops: processedStops.filter(Boolean),
      arrivalDelays
    };
  }
  
  const result = tripUpdates;
  data.processedResult = result;
  lastProcessedData = data;
  
  return result;
}

self.postMessage({ type: 'ready' });
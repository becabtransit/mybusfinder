const FAVORITES_KEY = 'bus_stop_favorites';

function getFavorites() {
    const favorites = localStorage.getItem(FAVORITES_KEY);
    return favorites ? JSON.parse(favorites) : [];
}

function saveFavorites(favorites) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function addToFavorites(routeId, stopId, destinationId) {
    const favorites = getFavorites();
    const id = `${routeId}-${stopId}-${destinationId}`;
    
    if (!favorites.some(f => f.id === id)) {
        favorites.push({
            id,
            routeId,
            stopId,
            destinationId,
            routeName: routes[routeId].short_name,
            stopName: stops[stopId].replace(/"/g, ''),
            destinationName: stops[destinationId].replace(/"/g, '')
        });
        saveFavorites(favorites);
    }
}

function removeFromFavorites(id) {
    const favorites = getFavorites();
    const index = favorites.findIndex(f => f.id === id);
    if (index !== -1) {
        favorites.splice(index, 1);
        saveFavorites(favorites);
    }
}

function isFavorite(routeId, stopId, destinationId) {
    const favorites = getFavorites();
    const id = `${routeId}-${stopId}-${destinationId}`;
    return favorites.some(f => f.id === id);
}

function updateFavoritesRealtimeData() {
    const favorites = getFavorites();
    favorites.forEach(favorite => {
        const container = document.querySelector(`[data-favorite-id="${favorite.id}"] .realtime-info`);
        if (container) {
            fetchRealtimeDataForStop(favorite.routeId, favorite.stopId, container);
        }
    });
}

let favoritesUpdateInterval;

function startFavoritesUpdate() {
    updateFavoritesRealtimeData();
    favoritesUpdateInterval = setInterval(updateFavoritesRealtimeData, 30000);
}

function stopFavoritesUpdate() {
    if (favoritesUpdateInterval) {
        clearInterval(favoritesUpdateInterval);
        favoritesUpdateInterval = null;
    }
}

function displayFavorites() {
    const favorites = getFavorites();
    const container = document.getElementById('favorites-container');
    container.innerHTML = '';
    
    if (favorites.length === 0) {
        container.innerHTML = `
            <div class="empty-favorites">
                Vous n'avez pas encore d'arrêts favoris.
                Ajoutez-en en naviguant dans les horaires !
            </div>
        `;
        return;
    }
    
    favorites.forEach(favorite => {
        const favoriteItem = document.createElement('div');
        favoriteItem.className = 'favorite-item';
        favoriteItem.setAttribute('data-favorite-id', favorite.id);
        favoriteItem.style.borderLeft = `4px solid ${routes[favorite.routeId].route_color}`;
        
        favoriteItem.innerHTML = `
            <div class="favorite-info">
                <div class="favorite-line">
                    Ligne ${favorite.routeName} → ${favorite.destinationName}
                </div>
                <div class="favorite-stop">
                    ${favorite.stopName}
                </div>
                <div class="realtime-info"></div>
            </div>
            <div class="favorite-actions">
                <button class="favorite-button" onclick="removeFromFavorites('${favorite.id}'); displayFavorites();">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
                <button class="favorite-button" onclick="showSchedule('${favorite.routeId}', '${favorite.stopId}', '${favorite.destinationId}')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </button>
            </div>
        `;
        
        container.appendChild(favoriteItem);
    });

    startFavoritesUpdate();
}

async function fetchRealtimeDataForStop(routeId, stopId, container) {
    try {
        const response = await fetch('proxy-cors/proxy_tripupdate.php');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        
        const root = await protobuf.load('gtfs-realtime.proto');
        const FeedMessage = root.lookupType('transit_realtime.FeedMessage');
        const message = FeedMessage.decode(new Uint8Array(buffer));
        
        const arrivals = processRealtimeDataForStop(message, routeId, stopId);
        displayRealtimeDataInFavorite(arrivals, container);
        
    } catch (error) {
        console.error('Erreur lors de la récupération des données temps réel:', error);
        container.innerHTML = '<div class="error">Impossible de charger les données en temps réel</div>';
    }
}

function processRealtimeDataForStop(message, routeId, stopId) {
    const currentTime = new Date();
    const arrivals = [];

    message.entity.forEach(entity => {
        if (entity.tripUpdate && matchesRoute(entity.tripUpdate.trip, routeId)) {
            entity.tripUpdate.stopTimeUpdate.forEach(update => {
                if (update.stopId === stopId) {
                    const arrivalTime = new Date(update.arrival?.time * 1000 || update.time * 1000);
                    
                    if (arrivalTime > currentTime && 
                        arrivalTime < new Date(currentTime.getTime() + 24 * 60 * 60 * 1000)) {
                        
                        arrivals.push({
                            time: arrivalTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                            vehicleId: entity.tripUpdate.vehicle?.id || 'inconnu'
                        });
                    }
                }
            });
        }
    });

    return arrivals.sort((a, b) => parseTime(a.time) - parseTime(b.time)).slice(0, 3);
}

function displayRealtimeDataInFavorite(arrivals, container) {
    if (arrivals.length === 0) {
        container.innerHTML = '<div class="no-realtime-data">Pas de passage prévu</div>';
        return;
    }

    container.innerHTML = `
        <div class="favorite-realtime">
            Prochains passages : ${arrivals.map(a => a.time).join(', ')}
        </div>
    `;
}

function matchesRoute(trip, routeId) {
    const routeTrips = trips[routeId] || [];
    return routeTrips.some(rt => rt.trip_id === trip.tripId);
}
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
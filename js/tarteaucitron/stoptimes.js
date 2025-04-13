// Stockage global pour les données des prochains passages
let stopTimesData = {};

// Fonction qui sera appelée lorsqu'un utilisateur clique sur un arrêt de bus
function onBusStopClick(e) {
    // Récupérer les données de l'arrêt cliqué
    const feature = e.target.feature;
    const stopId = feature.properties.stop_id;
    const stopName = feature.properties.stop_name || stopNameMap[stopId] || "Arrêt inconnu";
    
    // Récupérer et afficher les prochains passages pour cet arrêt
    fetchNextDepartures(stopId, stopName);
}

// Ajouter cette fonction dans loadGeoJsonLines() après la création des points d'arrêt
busStops.eachLayer(function(layer) {
    layer.on('click', onBusStopClick);
});

// Fonction pour récupérer les prochains passages à un arrêt spécifique
async function fetchNextDepartures(stopId, stopName) {
    try {
        // Récupération des données en temps réel via le worker
        const tripUpdates = await fetchTripUpdates().catch(() => ({}));
        
        // Récupérer les données GTFS statiques pour cet arrêt
        // Cette fonction devrait récupérer les horaires théoriques des bus pour cet arrêt
        const staticSchedules = await getStaticScheduleForStop(stopId);
        
        // Combiner les données statiques avec les mises à jour en temps réel
        const departures = processScheduleData(stopId, staticSchedules, tripUpdates);
        
        // Stocker les données pour l'arrêt
        stopTimesData[stopId] = {
            stopName: stopName,
            departures: departures
        };
        
        // Afficher la bottom sheet avec les prochains passages
        showStopTimesBottomSheet(stopId);
    } catch (error) {
        console.error("Erreur lors de la récupération des prochains passages", error);
        toastBottomRight.error("Impossible de récupérer les prochains passages");
    }
}

// Fonction pour récupérer les horaires théoriques depuis les données GTFS
async function getStaticScheduleForStop(stopId) {
    // À implémenter selon votre structure GTFS
    // Cette fonction devrait consulter vos données GTFS pour obtenir les horaires théoriques
    
    // Pour l'exemple, je retourne une structure fictive
    return [];
}

// Fonction pour traiter et combiner les données d'horaires statiques et temps réel
function processScheduleData(stopId, staticSchedules, tripUpdates) {
    let departures = [];
    const now = Math.floor(Date.now() / 1000);
    
    // Traiter les mises à jour en temps réel disponibles pour cet arrêt
    Object.entries(tripUpdates || {}).forEach(([tripId, tripData]) => {
        const stopUpdates = tripData.stopUpdates || [];
        
        // Chercher les mises à jour pour cet arrêt spécifique
        const stopUpdate = stopUpdates.find(update => update.stopId === stopId);
        if (stopUpdate) {
            const routeId = tripId.split('_')[0]; // Souvent le format est "route_id_trip_id"
            const routeName = lineName[routeId] || routeId;
            const color = lineColors[routeId] || '#3388ff';
            
            // Calculer le temps d'attente en minutes
            let departureTime = stopUpdate.departureTime || stopUpdate.arrivalTime;
            let departureTimestamp = null;
            let delay = stopUpdate.delay || 0;
            let waitTime = null;
            
            if (departureTime && departureTime !== "inconnue") {
                // Convertir l'heure au format "HH:MM" en timestamp
                const [hours, minutes] = departureTime.split(':').map(Number);
                const date = new Date();
                date.setHours(hours, minutes, 0, 0);
                departureTimestamp = Math.floor(date.getTime() / 1000);
                
                // Ajuster avec le délai
                departureTimestamp += delay;
                
                // Calculer le temps d'attente en minutes
                waitTime = Math.floor((departureTimestamp - now) / 60);
            }
            
            if (waitTime !== null && waitTime >= 0) {
                departures.push({
                    routeId,
                    routeName,
                    color,
                    direction: tripData.lastStopId ? stopNameMap[tripData.lastStopId] || "Direction inconnue" : "Direction inconnue",
                    scheduledTime: departureTime,
                    realTime: waitTime <= 0 ? "Maintenant" : waitTime === 1 ? "1 min" : `${waitTime} min`,
                    delay: delay
                });
            }
        }
    });
    
    // Ajouter les horaires théoriques si nécessaire
    // [Code pour traiter les horaires statiques...]
    
    // Trier par temps d'attente
    departures.sort((a, b) => {
        // Si un des temps est "Maintenant", le placer en premier
        if (a.realTime === "Maintenant") return -1;
        if (b.realTime === "Maintenant") return 1;
        
        // Sinon, comparer les nombres de minutes
        const timeA = parseInt(a.realTime);
        const timeB = parseInt(b.realTime);
        return timeA - timeB;
    });
    
    return departures;
}

// Fonction pour afficher la bottom sheet avec les prochains passages
function showStopTimesBottomSheet(stopId) {
    // Récupérer les données de l'arrêt
    const stopData = stopTimesData[stopId];
    if (!stopData) return;
    
    // Créer une nouvelle bottom sheet ou réutiliser celle existante
    let bottomSheet = document.getElementById('stopTimesBottomSheet');
    if (!bottomSheet) {
        bottomSheet = createStopTimesBottomSheet();
    }
    
    // Mettre à jour le contenu de la bottom sheet
    updateStopTimesBottomSheet(bottomSheet, stopData);
    
    // Afficher la bottom sheet
    openBottomSheet(bottomSheet);
}

// Fonction pour créer la bottom sheet des horaires d'arrêt
function createStopTimesBottomSheet() {
    const bottomSheet = document.createElement('div');
    bottomSheet.id = 'stopTimesBottomSheet';
    bottomSheet.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: rgba(255, 255, 255, 0.95);
        border-top-left-radius: 20px;
        border-top-right-radius: 20px;
        box-shadow: 0 -10px 20px rgba(0, 0, 0, 0.2);
        transform: translateY(100%);
        transition: transform 0.4s cubic-bezier(0.32, 0.64, 0.45, 1);
        z-index: 1100;
        max-height: 80vh;
        overflow-y: auto;
        padding-bottom: 20px;
        touch-action: pan-y;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
    `;

    const dragHandle = document.createElement('div');
    dragHandle.style.cssText = `
        width: 40px;
        height: 5px;
        background-color: rgba(0, 0, 0, 0.3);
        border-radius: 3px;
        margin: 10px auto;
        cursor: grab;
    `;
    bottomSheet.appendChild(dragHandle);

    // Ajout des gestionnaires d'événements pour le drag
    let startY, initialY, currentTranslateY = 0, isDragging = false;
    
    function startDrag(e) {
        if (e.type.includes('touch')) {
            e.preventDefault();
        }
        isDragging = true;
        startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        initialY = startY;
        
        const transform = window.getComputedStyle(bottomSheet).transform;
        const matrix = new DOMMatrix(transform);
        currentTranslateY = matrix.m42;
        
        bottomSheet.style.transition = 'none';
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        const currentY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        const deltaY = currentY - startY;
        const newTranslateY = Math.max(0, currentTranslateY + deltaY);
        
        const maxTranslate = bottomSheet.offsetHeight;
        const boundedTranslateY = Math.min(maxTranslate, newTranslateY);
        
        bottomSheet.style.transform = `translateY(${boundedTranslateY}px)`;
    }

    function stopDrag(e) {
        if (!isDragging) return;
        isDragging = false;
        
        const finalY = e.type.includes('mouse') ? e.clientY : e.changedTouches[0].clientY;
        const deltaY = finalY - initialY;
        const currentTranslate = getTranslateY(bottomSheet);
        const sheetHeight = bottomSheet.offsetHeight;
        
        bottomSheet.style.transition = 'transform 0.3s ease-out';
        
        const percentageMoved = (currentTranslate / sheetHeight) * 100;
        
        if (deltaY > 50 || percentageMoved > 50) {
            closeStopTimesBottomSheet();
        } else {
            bottomSheet.style.transform = 'translateY(0)';
        }
    }
    
    function getTranslateY(element) {
        const style = window.getComputedStyle(element);
        const matrix = new DOMMatrix(style.transform);
        return matrix.m42;
    }

    // Ajout des écouteurs d'événements
    bottomSheet.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);

    bottomSheet.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', stopDrag);

    // Ajouter la bottom sheet au DOM
    document.body.appendChild(bottomSheet);
    
    return bottomSheet;
}

// Fonction pour mettre à jour le contenu de la bottom sheet
function updateStopTimesBottomSheet(bottomSheet, stopData) {
    // Vider la bottom sheet sauf le drag handle
    while (bottomSheet.childNodes.length > 1) {
        bottomSheet.removeChild(bottomSheet.lastChild);
    }
    
    // Ajouter le nom de l'arrêt
    const stopNameElem = document.createElement('div');
    stopNameElem.style.cssText = `
        font-size: 22px;
        font-weight: bold;
        text-align: center;
        padding: 10px 20px;
        color: #333;
    `;
    stopNameElem.textContent = stopData.stopName;
    bottomSheet.appendChild(stopNameElem);
    
    // Séparateur
    const separator = document.createElement('div');
    separator.style.cssText = `
        height: 1px;
        background-color: #ddd;
        margin: 5px 0 10px;
    `;
    bottomSheet.appendChild(separator);
    
    // Conteneur des passages
    const departuresContainer = document.createElement('div');
    departuresContainer.style.cssText = `
        padding: 0 15px;
    `;
    
    if (stopData.departures.length === 0) {
        const noDataElem = document.createElement('div');
        noDataElem.style.cssText = `
            text-align: center;
            padding: 20px;
            color: #666;
        `;
        noDataElem.textContent = "Aucun passage prévu prochainement";
        departuresContainer.appendChild(noDataElem);
    } else {
        // Ajouter chaque passage
        stopData.departures.forEach((departure, index) => {
            const departureItem = createDepartureItem(departure);
            departuresContainer.appendChild(departureItem);
            
            // Ajouter un séparateur entre les éléments sauf le dernier
            if (index < stopData.departures.length - 1) {
                const itemSeparator = document.createElement('div');
                itemSeparator.style.cssText = `
                    height: 1px;
                    background-color: #eee;
                    margin: 5px 0;
                `;
                departuresContainer.appendChild(itemSeparator);
            }
        });
    }
    
    bottomSheet.appendChild(departuresContainer);
    
    // Footer avec info de mise à jour
    const footer = document.createElement('div');
    footer.style.cssText = `
        text-align: center;
        padding: 15px;
        font-size: 12px;
        color: #999;
    `;
    footer.textContent = `Dernière mise à jour: ${new Date().toLocaleTimeString()}`;
    bottomSheet.appendChild(footer);
    
    // Bouton de rafraîchissement
    const refreshButton = document.createElement('button');
    refreshButton.style.cssText = `
        display: block;
        margin: 0 auto;
        padding: 8px 15px;
        background-color: #f0f0f0;
        border: none;
        border-radius: 15px;
        font-size: 14px;
        color: #333;
        cursor: pointer;
    `;
    refreshButton.textContent = "Rafraîchir";
    refreshButton.onclick = () => {
        // Récupérer l'ID de l'arrêt actuel
        const stopId = Object.keys(stopTimesData).find(id => stopTimesData[id] === stopData);
        if (stopId) {
            fetchNextDepartures(stopId, stopData.stopName);
        }
    };
    bottomSheet.appendChild(refreshButton);
}

// Fonction pour créer un élément de ligne de passage
function createDepartureItem(departure) {
    const item = document.createElement('div');
    item.style.cssText = `
        display: flex;
        align-items: center;
        padding: 10px 0;
    `;
    
    // Indicateur de ligne (numéro + couleur)
    const lineIndicator = document.createElement('div');
    lineIndicator.style.cssText = `
        width: 50px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 5px;
        font-weight: bold;
        color: white;
        margin-right: 15px;
        background-color: ${departure.color};
    `;
    lineIndicator.textContent = departure.routeName;
    item.appendChild(lineIndicator);
    
    // Informations sur le passage (direction + heures)
    const departureInfo = document.createElement('div');
    departureInfo.style.cssText = `
        flex-grow: 1;
    `;
    
    // Direction
    const direction = document.createElement('div');
    direction.style.cssText = `
        font-size: 16px;
        color: #333;
    `;
    direction.textContent = departure.direction;
    departureInfo.appendChild(direction);
    
    // Horaire planifié si disponible
    if (departure.scheduledTime) {
        const scheduledTime = document.createElement('div');
        scheduledTime.style.cssText = `
            font-size: 12px;
            color: #666;
        `;
        scheduledTime.textContent = `Prévu: ${departure.scheduledTime}`;
        departureInfo.appendChild(scheduledTime);
    }
    
    item.appendChild(departureInfo);
    
    // Temps d'attente
    const waitTime = document.createElement('div');
    waitTime.style.cssText = `
        font-size: 18px;
        font-weight: bold;
        color: #333;
        text-align: right;
        min-width: 60px;
    `;
    waitTime.textContent = departure.realTime;
    
    // Si le passage a un retard, l'indiquer
    if (departure.delay && departure.delay > 60) {
        const delayIndicator = document.createElement('div');
        delayIndicator.style.cssText = `
            font-size: 12px;
            color: ${departure.delay > 180 ? '#cc0000' : '#ff6600'};
            text-align: right;
        `;
        const delayMinutes = Math.floor(departure.delay / 60);
        delayIndicator.textContent = `Retard: ${delayMinutes} min`;
        
        const waitTimeContainer = document.createElement('div');
        waitTimeContainer.appendChild(waitTime);
        waitTimeContainer.appendChild(delayIndicator);
        item.appendChild(waitTimeContainer);
    } else {
        item.appendChild(waitTime);
    }
    
    return item;
}

// Fonction pour ouvrir la bottom sheet
function openBottomSheet(bottomSheet) {
    bottomSheet.style.transform = 'translateY(0)';
}

// Fonction pour fermer la bottom sheet
function closeStopTimesBottomSheet() {
    const bottomSheet = document.getElementById('stopTimesBottomSheet');
    if (bottomSheet) {
        bottomSheet.style.transform = 'translateY(100%)';
    }
}

// Fonction pour fermer la bottom sheet lorsqu'on clique en dehors
document.addEventListener('click', function(event) {
    const bottomSheet = document.getElementById('stopTimesBottomSheet');
    if (bottomSheet && 
        !bottomSheet.contains(event.target) && 
        bottomSheet.style.transform === 'translateY(0px)') {
        closeStopTimesBottomSheet();
    }
});

// Fonction principale pour afficher les informations de l'arrêt de bus
function showStopInfo(stopId, stopName) {
    // Fermer toute bottomsheet existante
    if (window.currentBottomSheet) {
        window.currentBottomSheet.style.transform = 'translateY(100%)';
        setTimeout(() => {
            if (window.currentBottomSheet) {
                document.body.removeChild(window.currentBottomSheet);
                window.currentBottomSheet = null;
            }
        }, 300);
    }
    
    // Créer la nouvelle bottomsheet
    const bottomSheet = document.createElement('div');
    bottomSheet.id = 'stopInfoSheet';
    bottomSheet.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: rgba(255, 255, 255, 0.97);
        border-top-left-radius: 20px;
        border-top-right-radius: 20px;
        box-shadow: 0 -10px 20px rgba(0, 0, 0, 0.2);
        transform: translateY(100%);
        transition: transform 0.4s cubic-bezier(0.32, 0.64, 0.45, 1);
        z-index: 1000;
        max-height: 80vh;
        overflow-y: auto;
        padding-bottom: 20px;
        touch-action: pan-y;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
    `;
    
    // Drag handle
    const dragHandle = document.createElement('div');
    dragHandle.style.cssText = `
        width: 40px;
        height: 5px;
        background-color: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
        margin: 10px auto;
        cursor: grab;
    `;
    bottomSheet.appendChild(dragHandle);
    
    // Header (stop name)
    const header = document.createElement('div');
    header.style.cssText = `
        background-color: #1a73e8;
        color: white;
        font-size: 22px;
        font-weight: 500;
        padding: 16px 20px;
        margin-top: -3px;
        display: flex;
        align-items: center;
    `;
    
    // Bouton retour
    const backButton = document.createElement('div');
    backButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"></path>
        </svg>
    `;
    backButton.style.cssText = `
        margin-right: 15px;
        cursor: pointer;
    `;
    backButton.onclick = () => {
        closeBottomSheet(bottomSheet);
    };
    
    const stopNameElement = document.createElement('div');
    stopNameElement.textContent = stopName || `Arrêt ${stopId}`;
    
    header.appendChild(backButton);
    header.appendChild(stopNameElement);
    bottomSheet.appendChild(header);
    
    // Loading spinner
    const loadingContainer = document.createElement('div');
    loadingContainer.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 30px;
    `;
    
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-left-color: #1a73e8;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    loadingContainer.appendChild(spinner);
    bottomSheet.appendChild(loadingContainer);
    
    // Ajouter la bottomsheet au DOM
    document.body.appendChild(bottomSheet);
    window.currentBottomSheet = bottomSheet;
    
    // Animation d'ouverture
    setTimeout(() => {
        bottomSheet.style.transform = 'translateY(0)';
    }, 10);
    
    // Charger les données de passages
    fetchStopTimes(stopId, bottomSheet, loadingContainer);
    
    setupDragBehavior(bottomSheet);
    
    return bottomSheet;
}

// Fonction pour charger les temps de passage
async function fetchStopTimes(stopId, bottomSheet, loadingElement) {
    try {
        // Récupérer les données GTFS-RT (temps réel)
        const tripUpdates = window.tripUpdates || {};
        
        // Trouver tous les arrêts concernant ce stopId
        const relevantStops = [];
        
        // Parcourir tous les trip updates disponibles
        for (const tripId in tripUpdates) {
            const trip = tripUpdates[tripId];
            
            if (trip.stopUpdates) {
                for (const stopUpdate of trip.stopUpdates) {
                    if (stopUpdate.stopId === stopId) {
                        // Reconstruire les données pertinentes
                        const routeId = tripId.split('.')[0]; // Extraction de l'ID de ligne à partir de tripId
                        
                        relevantStops.push({
                            tripId: tripId,
                            routeId: routeId,
                            lineName: window.lineName[routeId] || routeId,
                            lineColor: window.lineColors[routeId] || '#1a73e8',
                            departureTime: stopUpdate.departureTime || stopUpdate.arrivalTime,
                            delay: stopUpdate.delay,
                            realTime: true,
                            destination: window.stopNameMap[trip.lastStopId] || trip.lastStopId
                        });
                    }
                }
            }
        }
        
        // Trier par heure de départ
        relevantStops.sort((a, b) => {
            // Si on a des heures au format "HH:MM", on les compare
            if (a.departureTime.includes(':') && b.departureTime.includes(':')) {
                return a.departureTime.localeCompare(b.departureTime);
            }
            
            // Sinon comparer en considérant que ce sont des minutes
            const timeA = parseTimeToMinutes(a.departureTime);
            const timeB = parseTimeToMinutes(b.departureTime);
            return timeA - timeB;
        });
        
        // Remplacer le spinner par les résultats
        displayStopTimes(relevantStops, bottomSheet, loadingElement, stopId);
        
    } catch (error) {
        console.error('Erreur lors de la récupération des temps de passage:', error);
        
        // Afficher un message d'erreur
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p style="color: #d93025;">Impossible de charger les horaires de passage</p>
                    <button style="margin-top: 10px; padding: 8px 16px; background-color: #1a73e8; color: white; border: none; border-radius: 4px;">
                        Réessayer
                    </button>
                </div>
            `;
            
            // Ajouter un événement au bouton réessayer
            const retryButton = loadingElement.querySelector('button');
            if (retryButton) {
                retryButton.addEventListener('click', () => {
                    loadingElement.innerHTML = '';
                    loadingElement.appendChild(spinner.cloneNode(true));
                    fetchStopTimes(stopId, bottomSheet, loadingElement);
                });
            }
        }
    }
}

// Fonction pour afficher les temps de passage dans la bottomSheet
function displayStopTimes(stopTimes, bottomSheet, loadingElement, stopId) {
    // Supprimer le spinner
    if (loadingElement && loadingElement.parentNode) {
        loadingElement.parentNode.removeChild(loadingElement);
    }
    
    // Conteneur pour les passages
    const departuresContainer = document.createElement('div');
    departuresContainer.style.cssText = `
        padding: 0;
    `;
    
    // S'il n'y a pas de passages
    if (!stopTimes || stopTimes.length === 0) {
        const noDataMessage = document.createElement('div');
        noDataMessage.style.cssText = `
            text-align: center;
            padding: 30px 20px;
            color: #5f6368;
        `;
        noDataMessage.innerHTML = `
            <p>Aucun passage prévu pour le moment</p>
            <p style="font-size: 14px; margin-top: 10px;">Les données peuvent être temporairement indisponibles ou il n'y a pas de service actif.</p>
        `;
        departuresContainer.appendChild(noDataMessage);
    } else {
        // Afficher chaque passage
        let lastTime = null;
        
        stopTimes.forEach((stop, index) => {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            
            // Déterminer si c'est une nouvelle section temporelle
            let showTimeSeparator = false;
            let timeCategory = getTimeCategory(stop.departureTime, currentTime);
            
            if (lastTime === null || timeCategory !== lastTime) {
                showTimeSeparator = true;
                lastTime = timeCategory;
            }
            
            // Ajouter un séparateur temporel si nécessaire
            if (showTimeSeparator) {
                const timeSeparator = document.createElement('div');
                timeSeparator.style.cssText = `
                    padding: 10px 20px;
                    font-size: 12px;
                    color: #5f6368;
                    background-color: #f8f9fa;
                `;
                
                let separatorText = '';
                switch(timeCategory) {
                    case 'immediate':
                        separatorText = 'Départs imminents';
                        break;
                    case 'soon':
                        separatorText = 'Prochains départs';
                        break;
                    case 'later':
                        separatorText = 'Plus tard';
                        break;
                    case 'scheduled':
                        separatorText = 'Selon horaires';
                        break;
                }
                
                timeSeparator.textContent = separatorText;
                departuresContainer.appendChild(timeSeparator);
            }
            
            // Créer l'élément de ligne
            const departureItem = document.createElement('div');
            departureItem.style.cssText = `
                display: flex;
                align-items: center;
                padding: 12px 20px;
                border-bottom: 1px solid #e8eaed;
            `;
            
            // Indicateur de ligne (avec couleur)
            const lineIndicator = document.createElement('div');
            lineIndicator.style.cssText = `
                display: flex;
                justify-content: center;
                align-items: center;
                min-width: 42px;
                height: 30px;
                background-color: ${stop.lineColor};
                color: ${getContrastColor(stop.lineColor)};
                border-radius: 5px;
                font-weight: bold;
                margin-right: 15px;
            `;
            lineIndicator.textContent = stop.lineName;
            
            // Destination
            const destination = document.createElement('div');
            destination.style.cssText = `
                flex-grow: 1;
                font-size: 16px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            `;
            destination.textContent = stop.destination;
            
            // Temps de passage
            const time = document.createElement('div');
            time.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                margin-left: 10px;
            `;
            
            const timeValue = document.createElement('div');
            timeValue.style.cssText = `
                font-size: 18px;
                font-weight: 500;
                color: ${getTimeColor(stop.departureTime, currentTime)};
            `;
            
            // Formater l'affichage du temps
            if (stop.departureTime === "inconnue") {
                timeValue.textContent = "?";
            } else if (stop.departureTime.includes(':')) {
                // C'est une heure au format HH:MM
                timeValue.textContent = stop.departureTime;
            } else {
                const minutesLeft = parseTimeToMinutes(stop.departureTime) - currentTime;
                if (minutesLeft <= 0) {
                    timeValue.textContent = "À l'arrêt";
                } else if (minutesLeft < 60) {
                    timeValue.textContent = `${minutesLeft} min`;
                } else {
                    timeValue.textContent = stop.departureTime;
                }
            }
            
            // Indicateur temps réel si disponible
            if (stop.realTime) {
                const realTimeIndicator = document.createElement('div');
                realTimeIndicator.style.cssText = `
                    font-size: 12px;
                    color: #1a73e8;
                    display: flex;
                    align-items: center;
                `;
                realTimeIndicator.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#1a73e8" style="margin-right: 4px;">
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                    </svg>
                    Temps réel
                `;
                time.appendChild(realTimeIndicator);
            }
            
            time.appendChild(timeValue);
            
            // Assembler l'élément
            departureItem.appendChild(lineIndicator);
            departureItem.appendChild(destination);
            departureItem.appendChild(time);
            
            departuresContainer.appendChild(departureItem);
        });
    }
    
    // Ajouter un bouton pour voir tous les horaires
    const viewAllSchedules = document.createElement('div');
    viewAllSchedules.style.cssText = `
        padding: 15px 20px;
        text-align: center;
        color: #1a73e8;
        font-weight: 500;
        cursor: pointer;
        border-top: 1px solid #e8eaed;
        margin-top: 10px;
    `;
    viewAllSchedules.textContent = "Voir tous les horaires";
    viewAllSchedules.onclick = () => {
        // Function to show all schedules - could be implemented later
        alert("Fonctionnalité à venir: Voir tous les horaires");
    };
    
    bottomSheet.appendChild(departuresContainer);
    bottomSheet.appendChild(viewAllSchedules);
}

// Utilitaires
function parseTimeToMinutes(timeStr) {
    if (!timeStr || timeStr === "inconnue") return Infinity;
    
    // Si c'est déjà en minutes
    if (timeStr.endsWith(' min')) {
        return parseInt(timeStr.replace(' min', ''));
    }
    
    // Si format HH:MM
    if (timeStr.includes(':')) {
        const [hours, minutes] = timeStr.split(':').map(num => parseInt(num));
        return hours * 60 + minutes;
    }
    
    return Infinity;
}

function getTimeCategory(departureTime, currentTime) {
    if (departureTime === "inconnue") return 'scheduled';
    
    const minutes = parseTimeToMinutes(departureTime) - currentTime;
    
    if (minutes <= 5) return 'immediate';
    if (minutes <= 30) return 'soon';
    if (minutes <= 120) return 'later';
    return 'scheduled';
}

function getTimeColor(departureTime, currentTime) {
    if (departureTime === "inconnue") return '#5f6368';
    
    const minutes = parseTimeToMinutes(departureTime) - currentTime;
    
    if (minutes <= 5) return '#d93025'; // Rouge pour imminent
    if (minutes <= 15) return '#1a73e8'; // Bleu pour bientôt
    return '#202124'; // Noir pour plus tard
}

function getContrastColor(hexColor) {
    // Si la couleur n'est pas définie ou invalide
    if (!hexColor || typeof hexColor !== 'string') return '#ffffff';
    
    // Convertir la couleur hex en RGB
    let rgb;
    
    // Format #RGB ou #RRGGBB
    if (hexColor.startsWith('#')) {
        hexColor = hexColor.slice(1);
    }
    
    if (hexColor.length === 3) {
        rgb = hexColor.split('').map(char => parseInt(char + char, 16));
    } else if (hexColor.length === 6) {
        rgb = [
            parseInt(hexColor.slice(0, 2), 16),
            parseInt(hexColor.slice(2, 4), 16),
            parseInt(hexColor.slice(4, 6), 16)
        ];
    } else {
        return '#ffffff'; // Couleur par défaut si format invalide
    }
    
    // Calculer la luminance (formule simplifiée)
    const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    
    // Retourner blanc ou noir selon la luminance
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

function closeBottomSheet(bottomSheet) {
    bottomSheet.style.transform = 'translateY(100%)';
    setTimeout(() => {
        if (bottomSheet.parentNode) {
            bottomSheet.parentNode.removeChild(bottomSheet);
        }
        if (window.currentBottomSheet === bottomSheet) {
            window.currentBottomSheet = null;
        }
    }, 300);
}

function setupDragBehavior(bottomSheet) {
    const SNAP_POINTS = {
        CLOSED: 100,  // 100% of height (fully closed)
        PEEK: 60,    // 60% of height (partially open)
        OPEN: 0      // 0% (fully open)
    };
    
    let startY, initialY, currentTranslateY, isDragging = false;
    
    function startDrag(e) {
        e.preventDefault();
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
        
        if (deltaY > 0) { // Glissement vers le bas
            if (percentageMoved > 50) {
                closeBottomSheet(bottomSheet);
            } else if (percentageMoved > 30) {
                bottomSheet.style.transform = `translateY(${sheetHeight * (SNAP_POINTS.PEEK/100)}px)`;
            } else {
                bottomSheet.style.transform = 'translateY(0)';
            }
        } else { // Glissement vers le haut
            if (percentageMoved < 30) {
                bottomSheet.style.transform = 'translateY(0)';
            } else if (percentageMoved < 70) {
                bottomSheet.style.transform = `translateY(${sheetHeight * (SNAP_POINTS.PEEK/100)}px)`;
            } else {
                closeBottomSheet(bottomSheet);
            }
        }
    }
    
    function getTranslateY(element) {
        const style = window.getComputedStyle(element);
        const matrix = new DOMMatrix(style.transform);
        return matrix.m42;
    }
    
    // Ajouter les événements
    const dragHandle = bottomSheet.querySelector('div:first-child');
    
    dragHandle.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    
    dragHandle.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', stopDrag);
}

// Fonction pour intégrer avec la carte et les arrêts de bus existants
function initBusStopClickHandlers() {
    // S'assurer que busStopLayers est disponible
    if (!window.busStopLayers || !Array.isArray(window.busStopLayers)) {
        console.warn('busStopLayers n\'est pas disponible, impossible d\'ajouter les handlers de clic');
        return;
    }
    
    // Ajouter les événements de clic à chaque arrêt de bus
    window.busStopLayers.forEach(layer => {
        // Vérifier que la couche existe et a des propriétés
        if (!layer || !layer.feature || !layer.feature.properties) return;
        
        // Extraire les propriétés de l'arrêt
        const properties = layer.feature.properties;
        const stopId = properties.stop_id || '';
        const stopName = properties.stop_name || window.stopNameMap[stopId] || `Arrêt ${stopId}`;
        
        // Ajouter un popup avec le nom de l'arrêt
        if (layer.bindPopup) {
            layer.bindPopup(`<div style="font-weight:bold">${stopName}</div>`);
        }
        
        // Ajouter l'événement de clic pour afficher les horaires
        layer.on('click', () => {
            showStopInfo(stopId, stopName);
        });
    });
}

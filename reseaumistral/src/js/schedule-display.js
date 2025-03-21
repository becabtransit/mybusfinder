// Nouveau système optimisé d'affichage des horaires
class ScheduleManager {
    constructor() {
        this.virtualDOM = new Map();
        this.renderQueue = new Set();
        this.isRendering = false;
    }

    async displaySchedule(validTrips, stopId, destinationId, container) {
        const scheduleData = this.preprocessScheduleData(validTrips, stopId, destinationId);
        await this.renderScheduleEfficiently(scheduleData, container);
    }

    preprocessScheduleData(validTrips, stopId, destinationId) {
        const schedule = new Map();
        
        // Pré-traitement optimisé des données
        validTrips.forEach(trip => {
            const tripStops = stopTimes[trip.trip_id];
            if (!tripStops) return;

            let destinationReached = false;
            for (const stopTime of tripStops) {
                if (stopTime.stop_id === destinationId) {
                    destinationReached = true;
                    break;
                }
                if (stopTime.stop_id === stopId) {
                    const [hours, minutes] = stopTime.arrival_time.split('h').map(Number);
                    const normalizedHour = hours >= 24 ? hours - 24 : hours;
                    
                    if (!schedule.has(normalizedHour)) {
                        schedule.set(normalizedHour, new Set());
                    }
                    schedule.get(normalizedHour).add(minutes);
                }
            }
        });

        return schedule;
    }

    async renderScheduleEfficiently(scheduleData, container) {
        // Utilisation d'un DocumentFragment pour optimiser les manipulations DOM
        const fragment = document.createDocumentFragment();
        const sortedHours = Array.from(scheduleData.entries()).sort(([a], [b]) => a - b);

        // Création d'un worker dédié pour le rendu
        if (window.Worker) {
            const renderWorker = new Worker('schedule-render-worker.js');
            
            renderWorker.onmessage = (e) => {
                const { html } = e.data;
                const div = document.createElement('div');
                div.innerHTML = html;
                fragment.appendChild(div);
                
                if (fragment.childNodes.length === scheduleData.size) {
                    container.appendChild(fragment);
                    this.attachEventListeners(container);
                }
            };

            sortedHours.forEach(([hour, minutes]) => {
                renderWorker.postMessage({ hour, minutes: Array.from(minutes) });
            });
        } else {
            // Fallback pour les navigateurs sans support des Workers
            this.renderTraditionally(sortedHours, fragment);
            container.appendChild(fragment);
            this.attachEventListeners(container);
        }
    }

    attachEventListeners(container) {
        // Gestion optimisée des événements avec la délégation
        const handler = (e) => {
            const row = e.target.closest('.schedule-row');
            if (row) {
                this.handleRowInteraction(row, e);
            }
        };

        container.addEventListener('click', handler, { passive: true });
        container.addEventListener('touchstart', handler, { passive: true });
    }

    handleRowInteraction(row, event) {
        // Implémentation de la logique d'interaction
        if (!this.renderQueue.has(row)) {
            this.renderQueue.add(row);
            requestAnimationFrame(() => this.updateRow(row));
        }
    }

    updateRow(row) {
        this.renderQueue.delete(row);
        // Logique de mise à jour spécifique
    }
}
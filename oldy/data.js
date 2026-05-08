let map = L.map('map').setView([43.558, 7.016], 13);
let markers = {};

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

async function loadProto() {
    const response = await fetch('gtfs-realtime.proto'); // Remplace par le chemin correct
    const protoText = await response.text();
    return protobuf.parse(protoText).root;
}

async function decodeProtobuf(buffer) {
    const root = await loadProto();
    const FeedMessage = root.lookupType('transit_realtime.FeedMessage');
    return FeedMessage.decode(new Uint8Array(buffer));
}

async function fetchVehiclePositions() {
    try {
        const response = await fetch('https://proxy.transport.data.gouv.fr/resource/palmbus-cannes-gtfs-rt-vehicle-position');
        const buffer = await response.arrayBuffer();
        const data = await decodeProtobuf(buffer);

        data.entity.forEach(entity => {
            const vehicle = entity.vehicle;
            const id = vehicle.vehicle.id;

            // Vérifie si le marqueur existe déjà
            if (markers[id]) {
                // Met à jour la position
                markers[id].setLatLng([vehicle.position.latitude, vehicle.position.longitude]);
            } else {
                // Crée un nouveau marqueur
                const marker = L.marker([vehicle.position.latitude, vehicle.position.longitude]).addTo(map);
                markers[id] = marker; // Ajoute le marqueur au tableau
            }

            // Supprime le marqueur précédent si le véhicule est déjà sur la carte
            if (markers[id] && (markers[id].getLatLng().lat !== vehicle.position.latitude || markers[id].getLatLng().lng !== vehicle.position.longitude)) {
                map.removeLayer(markers[id]);
                markers[id] = L.marker([vehicle.position.latitude, vehicle.position.longitude]).addTo(map);
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des données :', error);
    }
}

// Appelle fetchVehiclePositions toutes les 10 secondes
setInterval(fetchVehiclePositions, 10000);

/**
 * Interaktiv Xarita - Leaflet.js
 * YANGILANGAN: Yo'l tarmog'i ko'rsatish
 */

// Xarita o'zgaruvchilari
let map = null;
let vehicleMarkers = {};
let signalMarkers = {};
let congestionLayer = null;
let roadsLayer = null;
let emergencyRoute = null;

// Toshkent markazi
const CITY_CENTER = [41.2995, 69.2401];
const DEFAULT_ZOOM = 14;

// Grid parametrlari (backend bilan sinxron)
const GRID_ROWS = 8;
const GRID_COLS = 10;
const LAT_STEP = 0.003;
const LNG_STEP = 0.004;

// Ko'cha nomlari
const NS_STREETS = [
    "Amir Temur", "Mirzo Ulug'bek", "Shota Rustaveli",
    "Bobur", "Alisher Navoiy", "Mustaqillik",
    "Bunyodkor", "Chilonzor", "Sergeli", "Yunusobod"
];
const EW_STREETS = [
    "Afrosiyob", "Beruniy", "Furqat", "Muqimiy",
    "Nukus", "Oybek", "Pushkin", "Samarkand"
];

// Marker ikonlari
const vehicleIcons = {
    car: createIcon('🚗', '#4361ee'),
    bus: createIcon('🚌', '#7209b7'),
    truck: createIcon('🚚', '#3a0ca3'),
    ambulance: createIcon('🚑', '#ff3366'),
    fire_truck: createIcon('🚒', '#ff6b35'),
    police: createIcon('🚔', '#0077b6')
};

const signalIcons = {
    ns_green: createIcon('🚦', '#00ff88'),
    ew_green: createIcon('🚦', '#00ff88'),
    all_red: createIcon('🚦', '#ff3366'),
    emergency: createIcon('🚨', '#ff3366')
};

// Ikonka yaratish
function createIcon(emoji, bgColor) {
    return L.divIcon({
        html: `<div style="
            background: ${bgColor}22;
            border: 2px solid ${bgColor};
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        ">${emoji}</div>`,
        className: 'custom-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });
}

// Xaritani ishga tushirish
function initMap() {
    // Xarita yaratish
    map = L.map('map', {
        center: CITY_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
        attributionControl: false
    });

    // Dark theme tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);

    // Qatlamlar yaratish
    roadsLayer = L.layerGroup().addTo(map);
    congestionLayer = L.layerGroup().addTo(map);

    // Yo'l tarmog'ini chizish
    drawRoadNetwork();

    // Chorrahalar
    drawIntersections();

    console.log('🗺️ Xarita va yo'l tarmog'i tayyor');
}

/**
 * Yo'l tarmog'ini chizish
 */
function drawRoadNetwork() {
    // Gorizontal yo'llar (G'arb-Sharq)
    for (let row = 0; row < GRID_ROWS; row++) {
        const lat = CITY_CENTER[0] + (row - GRID_ROWS / 2) * LAT_STEP;
        const streetName = EW_STREETS[row] || `Ko'cha ${row + 1}`;

        const startLng = CITY_CENTER[1] - (GRID_COLS / 2) * LNG_STEP;
        const endLng = CITY_CENTER[1] + (GRID_COLS / 2 - 1) * LNG_STEP;

        // Yo'l chizig'i
        const road = L.polyline([
            [lat, startLng],
            [lat, endLng]
        ], {
            color: '#3a86ff',
            weight: 4,
            opacity: 0.7,
            dashArray: null
        }).addTo(roadsLayer);

        road.bindTooltip(streetName + ' ko\'chasi', {
            permanent: false,
            direction: 'center',
            className: 'road-tooltip'
        });
    }

    // Vertikal yo'llar (Shimol-Janub)
    for (let col = 0; col < GRID_COLS; col++) {
        const lng = CITY_CENTER[1] + (col - GRID_COLS / 2) * LNG_STEP;
        const streetName = NS_STREETS[col] || `Prospekt ${col + 1}`;

        const startLat = CITY_CENTER[0] - (GRID_ROWS / 2) * LAT_STEP;
        const endLat = CITY_CENTER[0] + (GRID_ROWS / 2 - 1) * LAT_STEP;

        // Yo'l chizig'i
        const road = L.polyline([
            [startLat, lng],
            [endLat, lng]
        ], {
            color: '#8338ec',
            weight: 4,
            opacity: 0.7,
            dashArray: null
        }).addTo(roadsLayer);

        road.bindTooltip(streetName + ' ko\'chasi', {
            permanent: false,
            direction: 'center',
            className: 'road-tooltip'
        });
    }
}

/**
 * Chorrahalar va svetoforlar
 */
function drawIntersections() {
    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            const lat = CITY_CENTER[0] + (row - GRID_ROWS / 2) * LAT_STEP;
            const lng = CITY_CENTER[1] + (col - GRID_COLS / 2) * LNG_STEP;
            const id = `N-${row.toString().padStart(2, '0')}-${col.toString().padStart(2, '0')}`;

            // Svetofor markeri
            const marker = L.marker([lat, lng], {
                icon: signalIcons.ns_green
            }).addTo(map);

            const nsStreet = NS_STREETS[col] || `Prospekt ${col + 1}`;
            const ewStreet = EW_STREETS[row] || `Ko'cha ${row + 1}`;

            marker.bindPopup(`
                <b>🚦 Chorraha</b><br>
                ${nsStreet} × ${ewStreet}<br>
                <small>ID: ${id}</small>
            `);

            signalMarkers[id] = marker;
        }
    }
}

// Tirbandlik rangi
function getCongestionColor(level) {
    if (level < 25) return '#00ff88';
    if (level < 50) return '#ffee00';
    if (level < 75) return '#ff9500';
    return '#ff3366';
}

// Transport vositalarini xaritada yangilash
function updateVehiclesOnMap() {
    const vehicles = window.simulationData?.vehicles || [];

    vehicles.forEach(vehicle => {
        const { id, lat, lng, speed, type, emergency, road } = vehicle;

        if (!lat || !lng) return;

        if (vehicleMarkers[id]) {
            // Mavjud markerni yangilash
            vehicleMarkers[id].setLatLng([lat, lng]);

            // Popup yangilash
            vehicleMarkers[id].setPopupContent(`
                <b>${id}</b><br>
                Tezlik: ${speed?.toFixed(1) || 0} km/h<br>
                Ko'cha: ${road || '-'}<br>
                Turi: ${type || 'car'}
            `);
        } else {
            // Yangi marker yaratish
            const iconType = emergency ? 'ambulance' : (type || 'car');
            const icon = vehicleIcons[iconType] || vehicleIcons.car;

            const marker = L.marker([lat, lng], { icon })
                .addTo(map);

            marker.bindPopup(`
                <b>${id}</b><br>
                Tezlik: ${speed?.toFixed(1) || 0} km/h<br>
                Ko'cha: ${road || '-'}<br>
                Turi: ${type || 'car'}
            `);

            vehicleMarkers[id] = marker;
        }
    });
}

// Transport ko'rinishini boshqarish
function updateVehiclesVisibility(visible) {
    Object.values(vehicleMarkers).forEach(marker => {
        if (visible) {
            marker.addTo(map);
        } else {
            marker.remove();
        }
    });
}

// Tirbandlik xaritasini yangilash
function updateHeatmapOnMap() {
    const segments = window.simulationData?.segments || [];

    congestionLayer.clearLayers();

    segments.forEach(segment => {
        const { segment_id, congestion_level, color } = segment;

        // Segment ID dan koordinatalarni olish
        const match = segment_id.match(/SEG-(\d+)-(\d+)/);
        if (!match) return;

        const i = parseInt(match[1]);
        const j = parseInt(match[2]);

        const lat = CITY_CENTER[0] + (i - GRID_ROWS / 2) * LAT_STEP;
        const lng = CITY_CENTER[1] + (j - GRID_COLS / 2) * LNG_STEP;

        L.rectangle([
            [lat - LAT_STEP / 2, lng - LNG_STEP / 2],
            [lat + LAT_STEP / 2, lng + LNG_STEP / 2]
        ], {
            color: color || getCongestionColor(congestion_level),
            fillColor: color || getCongestionColor(congestion_level),
            fillOpacity: 0.3,
            weight: 1
        }).addTo(congestionLayer);
    });
}

// Tirbandlik ko'rinishini boshqarish
function updateHeatmapVisibility(visible) {
    if (visible) {
        congestionLayer.addTo(map);
    } else {
        congestionLayer.remove();
    }
}

// Yo'llar ko'rinishini boshqarish
function updateRoadsVisibility(visible) {
    if (visible) {
        roadsLayer.addTo(map);
    } else {
        roadsLayer.remove();
    }
}

// Favqulodda marshrut
function showEmergencyRoute(routePoints) {
    if (emergencyRoute) {
        emergencyRoute.remove();
    }

    if (!routePoints || routePoints.length < 2) return;

    const latlngs = routePoints.map(p => [p.lat, p.lng]);

    emergencyRoute = L.polyline(latlngs, {
        color: '#ff3366',
        weight: 8,
        opacity: 0.9,
        dashArray: '15, 10',
        className: 'emergency-route'
    }).addTo(map);

    // Animatsiya
    let dashOffset = 0;
    setInterval(() => {
        dashOffset -= 3;
        emergencyRoute.setStyle({ dashOffset: dashOffset.toString() });
    }, 50);

    // Xaritani markazlashtirish
    map.fitBounds(emergencyRoute.getBounds(), { padding: [50, 50] });
}

// Bitta transport yangilanishi
function updateVehicleOnMap(data) {
    const { vehicle_id, latitude, longitude, speed, vehicle_type, is_emergency, current_road } = data;

    if (vehicleMarkers[vehicle_id]) {
        vehicleMarkers[vehicle_id].setLatLng([latitude, longitude]);
    } else {
        const iconType = is_emergency ? 'ambulance' : (vehicle_type || 'car');
        const icon = vehicleIcons[iconType] || vehicleIcons.car;

        const marker = L.marker([latitude, longitude], { icon }).addTo(map);
        marker.bindPopup(`
            <b>${vehicle_id}</b><br>
            Ko'cha: ${current_road || '-'}
        `);
        vehicleMarkers[vehicle_id] = marker;
    }
}

// Export
window.initMap = initMap;
window.updateVehiclesOnMap = updateVehiclesOnMap;
window.updateVehiclesVisibility = updateVehiclesVisibility;
window.updateHeatmapOnMap = updateHeatmapOnMap;
window.updateHeatmapVisibility = updateHeatmapVisibility;
window.updateRoadsVisibility = updateRoadsVisibility;
window.showEmergencyRoute = showEmergencyRoute;
window.updateVehicleOnMap = updateVehicleOnMap;

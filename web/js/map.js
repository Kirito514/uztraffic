/**
 * Real-road map module (Leaflet + Overpass)
 */

let map = null;
let vehicleMarkers = {};
let signalMarkers = {};
let congestionLayer = null;
let roadsLayer = null;
let emergencyRoute = null;
let selectedRoad = null;
let cachedRoadElements = null;
let roadReloadTimer = null;
let signalAnimationTimer = null;
let selectedSignalMarker = null;
let lastRoadFetchCenter = null;
let lastRoadFetchZoom = null;
let roadSnapSegments = [];
const CITY_CENTER = [52.3676, 4.9041]; // Amsterdam
const DEFAULT_ZOOM = 14;
const ENABLE_ROAD_OVERLAY = true;
const SHOW_CUSTOM_ROAD_LINES = false;
const USE_SIMULATION_SIGNALS = true;
const OVERPASS_TIMEOUT_MS = 18000;
const MAX_WAYS = 2800;
const MAX_RENDERED_ROADS = 1400;
const MAX_SIGNALS = 90;
const ROAD_FETCH_MIN_ZOOM = 13;
const ROAD_RELOAD_DEBOUNCE_MS = 900;
const ROAD_FETCH_MOVE_THRESHOLD_METERS = 1200;
const SNAP_SEARCH_RADIUS_METERS = 45;
const ENABLE_VEHICLE_ROAD_SNAP = false;

const vehicleIcons = {
    car: createIcon('C', '#4361ee'),
    bus: createIcon('B', '#7209b7'),
    truck: createIcon('T', '#3a0ca3'),
    ambulance: createIcon('A', '#ff3366'),
    fire_truck: createIcon('F', '#ff6b35'),
    police: createIcon('P', '#0077b6')
};

const signalIcons = {
    ns_green: createSignalIcon('#00ff88'),
    ew_green: createSignalIcon('#00ff88'),
    yellow: createSignalIcon('#ffd84d'),
    all_red: createSignalIcon('#ff3366'),
    emergency: createSignalIcon('#ff3366')
};

function createIcon(label, bgColor) {
    if (typeof L === 'undefined') return null;

    return L.divIcon({
        html: `<div style="
            background: ${bgColor}22;
            border: 2px solid ${bgColor};
            border-radius: 50%;
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #fff;
            font-weight: 700;
            box-shadow: 0 0 8px ${bgColor};
        ">${label}</div>`,
        className: 'custom-marker',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });
}

function createSignalIcon(color) {
    if (typeof L === 'undefined') return null;

    return L.divIcon({
        html: `<div style="
            width: 16px;
            height: 34px;
            border-radius: 8px;
            background: #101318;
            border: 1px solid #2a2f37;
            padding: 2px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 0 8px ${color}88;
        ">
            <span style="width:8px;height:8px;border-radius:50%;background:#ff4d4f;opacity:.9;"></span>
            <span style="width:8px;height:8px;border-radius:50%;background:#ffd84d;opacity:.9;"></span>
            <span style="width:8px;height:8px;border-radius:50%;background:#00d47a;opacity:.95;"></span>
        </div>`,
        className: 'custom-signal-marker',
        iconSize: [16, 34],
        iconAnchor: [8, 17]
    });
}

function initMap() {
    if (typeof L === 'undefined') {
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.innerHTML = '<div style="padding:16px;color:#fff;">Leaflet yuklanmadi. Internetni tekshiring va sahifani yangilang.</div>';
        }
        return;
    }

    map = L.map('map', {
        center: CITY_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true
    });

    const lightTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap, &copy; CARTO'
    });

    lightTiles.on('tileerror', () => {
        if (map._tileFallbackApplied) return;
        map._tileFallbackApplied = true;
        lightTiles.remove();
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
    });

    lightTiles.addTo(map);

    roadsLayer = L.layerGroup().addTo(map);
    congestionLayer = L.layerGroup().addTo(map);

    map.on('click', clearSelectedRoad);

    if (ENABLE_ROAD_OVERLAY) {
        loadRealRoadNetwork();

        map.on('moveend', () => {
            if (roadReloadTimer) clearTimeout(roadReloadTimer);
            roadReloadTimer = setTimeout(() => {
                loadRealRoadNetwork();
            }, ROAD_RELOAD_DEBOUNCE_MS);
        });
    }
}

function shouldFetchRoadData() {
    if (!map) return true;

    const zoom = map.getZoom();
    if (zoom < ROAD_FETCH_MIN_ZOOM) return false;

    if (!lastRoadFetchCenter || lastRoadFetchZoom == null) return true;

    if (Math.abs(zoom - lastRoadFetchZoom) >= 1) return true;

    const center = map.getCenter();
    const moved = map.distance(center, lastRoadFetchCenter);
    return moved >= ROAD_FETCH_MOVE_THRESHOLD_METERS;
}

function clearSignalMarkers() {
    Object.values(signalMarkers).forEach((marker) => marker.remove());
    signalMarkers = {};
    selectedSignalMarker = null;
}
async function loadRealRoadNetwork() {
    if (!ENABLE_ROAD_OVERLAY) {
        roadsLayer.clearLayers();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/roads`);
        if (!response.ok) return;

        const data = await response.json();
        if (!data.edges) return;

        roadsLayer.clearLayers();
        roadSnapSegments = [];

        // Build roads
        data.edges.forEach(edge => {
            if (SHOW_CUSTOM_ROAD_LINES) {
                const road = L.polyline(edge.coords, getRoadBaseStyle(edge.highway)).addTo(roadsLayer);
                road.roadMeta = {
                    id: edge.id,
                    type: edge.highway,
                    name: edge.name,
                    lanes: edge.lanes,
                    maxspeed: edge.speed,
                    lengthKm: edge.length_m / 1000
                };
                wireRoadInteractions(road);
            }

            // Add to snap segments
            if (edge.coords.length > 1) {
                for (let i = 1; i < edge.coords.length; i++) {
                    const a = edge.coords[i-1];
                    const b = edge.coords[i];
                    roadSnapSegments.push({
                        aLat: a[0], aLng: a[1],
                        bLat: b[0], bLng: b[1],
                        minLat: Math.min(a[0], b[0]),
                        maxLat: Math.max(a[0], b[0]),
                        minLng: Math.min(a[1], b[1]),
                        maxLng: Math.max(a[1], b[1])
                    });
                }
            }
        });

        // Set map view to city center if needed
        if (data.center && map.getZoom() === DEFAULT_ZOOM) {
            map.setView(data.center, DEFAULT_ZOOM);
        }

    } catch (e) {
        console.warn("Failed to load OSM roads:", e);
    }
}

function fetchWithTimeout(url, options, timeoutMs) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('timeout')), timeoutMs);
        fetch(url, options)
            .then((res) => {
                clearTimeout(timeout);
                resolve(res);
            })
            .catch((err) => {
                clearTimeout(timeout);
                reject(err);
            });
    });
}

function buildRoadSnapIndex(elements) {
    const ways = elements
        .filter((el) => el.type === 'way' && Array.isArray(el.geometry) && el.geometry.length > 1)
        .slice(0, MAX_WAYS);

    const segments = [];
    ways.forEach((way) => {
        const pts = way.geometry;
        for (let i = 1; i < pts.length; i += 1) {
            const a = pts[i - 1];
            const b = pts[i];
            if (!a || !b) continue;

            const minLat = Math.min(a.lat, b.lat);
            const maxLat = Math.max(a.lat, b.lat);
            const minLng = Math.min(a.lon, b.lon);
            const maxLng = Math.max(a.lon, b.lon);

            segments.push({
                aLat: a.lat,
                aLng: a.lon,
                bLat: b.lat,
                bLng: b.lon,
                minLat,
                maxLat,
                minLng,
                maxLng
            });
        }
    });

    roadSnapSegments = segments;
}

function snapVehicleToRoad(lat, lng) {
    if (!ENABLE_VEHICLE_ROAD_SNAP) return [lat, lng];
    if (!roadSnapSegments.length) return [lat, lng];

    const lngScale = Math.cos((lat * Math.PI) / 180);
    const degPerM = 1 / 111000;
    const latPad = SNAP_SEARCH_RADIUS_METERS * degPerM;
    const lngPad = latPad / Math.max(0.2, lngScale);

    let bestDist2 = Number.POSITIVE_INFINITY;
    let bestPoint = [lat, lng];

    for (let i = 0; i < roadSnapSegments.length; i += 1) {
        const s = roadSnapSegments[i];
        if (lat < s.minLat - latPad || lat > s.maxLat + latPad || lng < s.minLng - lngPad || lng > s.maxLng + lngPad) {
            continue;
        }

        const ax = s.aLng * lngScale;
        const ay = s.aLat;
        const bx = s.bLng * lngScale;
        const by = s.bLat;
        const px = lng * lngScale;
        const py = lat;

        const abx = bx - ax;
        const aby = by - ay;
        const apx = px - ax;
        const apy = py - ay;
        const ab2 = abx * abx + aby * aby;
        const t = ab2 > 0 ? Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2)) : 0;

        const qx = ax + abx * t;
        const qy = ay + aby * t;
        const dx = px - qx;
        const dy = py - qy;
        const d2 = dx * dx + dy * dy;

        if (d2 < bestDist2) {
            bestDist2 = d2;
            bestPoint = [qy, qx / lngScale];
        }
    }

    const distMeters = Math.sqrt(bestDist2) * 111000;
    if (Number.isFinite(distMeters) && distMeters <= SNAP_SEARCH_RADIUS_METERS) {
        return bestPoint;
    }

    return [lat, lng];
}
function drawRealRoads(elements) {
    roadsLayer.clearLayers();
    clearSelectedRoad();

    const rawWays = elements
        .filter((el) => el.type === 'way' && Array.isArray(el.geometry) && el.geometry.length > 1 && Array.isArray(el.nodes) && el.nodes.length > 1)
        .slice(0, MAX_WAYS);

    const merged = mergeRoadWays(rawWays).slice(0, MAX_RENDERED_ROADS);

    merged.forEach((seg) => {
        const road = L.polyline(seg.coords, getRoadBaseStyle(seg.type)).addTo(roadsLayer);
        road.roadMeta = {
            id: seg.id,
            type: seg.type,
            name: seg.name,
            start: seg.coords[0],
            end: seg.coords[seg.coords.length - 1],
            lengthKm: calculatePolylineLengthKm(seg.coords),
            parts: seg.parts,
            lanes: seg.lanes,
            oneway: seg.oneway,
            maxspeed: seg.maxspeed
        };
        wireRoadInteractions(road);
    });

    if (merged.length === 0) drawFallbackRoadNetwork();
}

function mergeRoadWays(ways) {
    const groups = new Map();

    ways.forEach((way) => {
        const name = normalizeRoadName(way.tags?.name);
        const type = String(way.tags?.highway || 'unknown');
        const key = `${name || `__id_${way.id}`}|${type}`;

        if (!groups.has(key)) groups.set(key, []);

        groups.get(key).push({
            id: way.id,
            name: name || `Road ${way.id}`,
            type,
            coords: way.geometry.map((p) => [p.lat, p.lon]),
            nodes: way.nodes,
            lanes: way.tags?.lanes || '-',
            oneway: way.tags?.oneway || 'no',
            maxspeed: way.tags?.maxspeed || '-'
        });
    });

    const mergedSegments = [];

    groups.forEach((segments, key) => {
        const hasRealName = !key.startsWith('__id_');

        if (!hasRealName || segments.length === 1) {
            segments.forEach((seg) => {
                mergedSegments.push({
                    id: seg.id,
                    name: seg.name,
                    type: seg.type,
                    parts: 1,
                    coords: seg.coords,
                    lanes: seg.lanes,
                    oneway: seg.oneway,
                    maxspeed: seg.maxspeed
                });
            });
            return;
        }

        const chains = stitchConnectedSegments(segments);
        chains.forEach((chain, idx) => {
            mergedSegments.push({
                id: `${segments[0].name}-${idx + 1}`,
                name: segments[0].name,
                type: segments[0].type,
                parts: chain.partCount,
                coords: chain.coords,
                lanes: segments[0].lanes,
                oneway: segments[0].oneway,
                maxspeed: segments[0].maxspeed
            });
        });
    });

    return mergedSegments;
}

function stitchConnectedSegments(segments) {
    const remaining = new Set(segments.map((_, i) => i));
    const result = [];

    while (remaining.size > 0) {
        const first = remaining.values().next().value;
        remaining.delete(first);

        const base = segments[first];
        let chainCoords = [...base.coords];
        let startNode = base.nodes[0];
        let endNode = base.nodes[base.nodes.length - 1];
        let partCount = 1;

        let progress = true;
        while (progress) {
            progress = false;

            for (const idx of Array.from(remaining)) {
                const seg = segments[idx];
                const segStart = seg.nodes[0];
                const segEnd = seg.nodes[seg.nodes.length - 1];

                if (segStart === endNode) {
                    chainCoords = chainCoords.concat(seg.coords.slice(1));
                    endNode = segEnd;
                } else if (segEnd === endNode) {
                    chainCoords = chainCoords.concat([...seg.coords].reverse().slice(1));
                    endNode = segStart;
                } else if (segEnd === startNode) {
                    chainCoords = seg.coords.slice(0, -1).concat(chainCoords);
                    startNode = segStart;
                } else if (segStart === startNode) {
                    chainCoords = [...seg.coords].reverse().slice(0, -1).concat(chainCoords);
                    startNode = segEnd;
                } else {
                    continue;
                }

                remaining.delete(idx);
                partCount += 1;
                progress = true;
            }
        }

        result.push({ coords: chainCoords, partCount });
    }

    return result;
}

function normalizeRoadName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.trim();
}

function drawRealIntersections(elements) {
    clearSignalMarkers();

    if (signalAnimationTimer) {
        clearInterval(signalAnimationTimer);
        signalAnimationTimer = null;
    }

    const realSignals = elements
        .filter((el) => el.type === 'node' && el.tags?.highway === 'traffic_signals')
        .slice(0, MAX_SIGNALS);

    if (realSignals.length > 0) {
        realSignals.forEach((node, i) => {
            const id = `SIG-${String(i + 1).padStart(3, '0')}`;
            const marker = L.marker([node.lat, node.lon], { icon: signalIcons.ns_green }).addTo(map);
            marker.signalId = id;
            marker.signalPhase = 'statik';
            marker.on('click', () => showSignalDetail(marker, 'real'));
            signalMarkers[id] = marker;
        });
        return;
    }

    const nodeCounts = new Map();
    const nodeCoords = new Map();

    const ways = elements.filter((el) => el.type === 'way' && Array.isArray(el.geometry) && Array.isArray(el.nodes));

    ways.forEach((way) => {
        way.nodes.forEach((nodeId, idx) => {
            const point = way.geometry[idx];
            if (!point) return;
            nodeCoords.set(nodeId, [point.lat, point.lon]);
            nodeCounts.set(nodeId, (nodeCounts.get(nodeId) || 0) + 1);
        });
    });

    const intersections = Array.from(nodeCounts.entries())
        .filter(([, count]) => count >= 2)
        .slice(0, MAX_SIGNALS);

    intersections.forEach(([nodeId], i) => {
        const coord = nodeCoords.get(nodeId);
        if (!coord) return;

        const id = `INT-${String(i + 1).padStart(3, '0')}`;
        const marker = L.marker(coord, { icon: signalIcons.ns_green }).addTo(map);
        marker.signalId = id;
        marker.signalPhase = 'statik';
        marker.on('click', () => showSignalDetail(marker, 'estimated'));
        signalMarkers[id] = marker;
    });

}

function startSignalAnimation() {
    return;
}

function getSignalIconByPhase(phase) {
    if (phase === 'ew_green') return signalIcons.ew_green;
    if (phase === 'all_red') return signalIcons.all_red;
    if (phase === 'yellow') return signalIcons.yellow;
    if (phase === 'emergency') return signalIcons.emergency;
    return signalIcons.ns_green;
}

function updateSignalsOnMap() {
    if (!map) return;

    const signals = window.simulationData?.signals || [];
    if (!Array.isArray(signals) || signals.length === 0) return;

    const seen = new Set();

    signals.forEach((signal) => {
        const id = signal.id;
        if (!id || signal.lat == null || signal.lng == null) return;
        seen.add(id);

        const icon = getSignalIconByPhase(signal.phase);
        const queueObj = signal.queue || {};
        const queueStr = `${queueObj.north ?? 0}/${queueObj.south ?? 0}/${queueObj.east ?? 0}/${queueObj.west ?? 0}`;

        if (signalMarkers[id]) {
            const marker = signalMarkers[id];
            marker.setLatLng([signal.lat, signal.lng]);
            marker.setIcon(icon);
            marker.signalPhase = signal.phase || '-';
            marker.signalTimer = signal.timer;
            marker.signalMode = signal.mode || 'adaptive';
            marker.signalQueue = queueStr;
            return;
        }

        const marker = L.marker([signal.lat, signal.lng], { icon }).addTo(map);
        marker.signalId = id;
        marker.signalPhase = signal.phase || '-';
        marker.signalTimer = signal.timer;
        marker.signalMode = signal.mode || 'adaptive';
        marker.signalQueue = queueStr;
        marker.on('click', () => showSignalDetail(marker, 'simulated'));
        signalMarkers[id] = marker;
    });

    Object.keys(signalMarkers).forEach((id) => {
        if (!seen.has(id)) {
            signalMarkers[id].remove();
            delete signalMarkers[id];
        }
    });
}
function showSignalDetail(marker, source) {
    if (selectedSignalMarker && selectedSignalMarker !== marker) {
        selectedSignalMarker.setZIndexOffset(0);
    }
    selectedSignalMarker = marker;
    marker.setZIndexOffset(1000);

    if (typeof window.showMapDetail !== 'function') return;

    const coord = marker.getLatLng();
    window.showMapDetail('signal', {
        id: marker.signalId || '-',
        source: source || 'signal',
        phase: marker.signalPhase || 'ns_green',
        timer: marker.signalTimer,
        mode: marker.signalMode,
        queue: marker.signalQueue,
        coord: `${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`
    });
}

function formatDirection(oneway) {
    const v = String(oneway || '').toLowerCase();
    if (v === 'yes' || v === '1' || v === 'true') return 'bir tomonlama';
    if (v === '-1') return 'bir tomonlama (teskari)';
    if (v === 'no' || v === '0' || v === 'false') return 'ikki tomonlama';
    return 'noma\'lum';
}
function drawFallbackRoadNetwork() {
    roadsLayer.clearLayers();
    clearSelectedRoad();

    const latStep = 0.003;
    const lngStep = 0.004;

    for (let row = -5; row <= 5; row += 1) {
        const lat = CITY_CENTER[0] + row * latStep;
        const coords = [[lat, CITY_CENTER[1] - 0.035], [lat, CITY_CENTER[1] + 0.035]];
        const road = L.polyline(coords, getRoadBaseStyle('fallback')).addTo(roadsLayer);
        road.roadMeta = {
            id: `FH-${row + 6}`,
            type: 'fallback',
            name: `Horizontal ${row + 6}`,
            start: coords[0],
            end: coords[coords.length - 1],
            lengthKm: calculatePolylineLengthKm(coords),
            parts: 1
        };
        wireRoadInteractions(road);
    }

    for (let col = -7; col <= 7; col += 1) {
        const lng = CITY_CENTER[1] + col * lngStep;
        const coords = [[CITY_CENTER[0] - 0.02, lng], [CITY_CENTER[0] + 0.02, lng]];
        const road = L.polyline(coords, getRoadBaseStyle('fallback')).addTo(roadsLayer);
        road.roadMeta = {
            id: `FV-${col + 8}`,
            type: 'fallback',
            name: `Vertical ${col + 8}`,
            start: coords[0],
            end: coords[coords.length - 1],
            lengthKm: calculatePolylineLengthKm(coords),
            parts: 1
        };
        wireRoadInteractions(road);
    }
}

function wireRoadInteractions(road) {
    road.on('click', (event) => {
        L.DomEvent.stopPropagation(event);
        selectRoad(road);
    });
}
function clearSelectedRoad() {
    if (!selectedRoad) return;
    selectedRoad.setStyle(getRoadBaseStyle(selectedRoad.roadMeta?.type));
    selectedRoad.closePopup();
    selectedRoad = null;
}

function selectRoad(road) {
    if (selectedRoad && selectedRoad !== road) {
        selectedRoad.setStyle(getRoadBaseStyle(selectedRoad.roadMeta?.type));
    }

    selectedRoad = road;
    road.setStyle(getRoadSelectedStyle(road.roadMeta?.type));

    if (typeof window.showMapDetail === 'function') {
        const meta = road.roadMeta || {};
        window.showMapDetail('road', {
            id: meta.id || '-',
            name: meta.name || "Yo'l",
            roadType: meta.type || '-',
            direction: formatDirection(meta.oneway),
            lanes: meta.lanes || '-',
            maxspeed: meta.maxspeed || '-',
            start: formatCoord(meta.start),
            end: formatCoord(meta.end),
            length: `${Number(meta.lengthKm || 0).toFixed(2)} km`,
            parts: meta.parts || 1
        });
    }
}

function renderRoadPopup(meta) {
    return `
        <div style="font-size:12px;line-height:1.5;">
            <div style="font-size:13px;font-weight:700;margin-bottom:4px;">${escapeHtml(meta.name || 'Road')}</div>
            <div><b>ID:</b> ${escapeHtml(String(meta.id || '-'))}</div>
            <div><b>Turi:</b> ${escapeHtml(meta.type || 'unknown')}</div>
            <div><b>Yo'nalish:</b> ${escapeHtml(formatDirection(meta.oneway))}</div>
            <div><b>Yo'laklar:</b> ${escapeHtml(String(meta.lanes || '-'))}</div>
            <div><b>Tezlik limiti:</b> ${escapeHtml(String(meta.maxspeed || '-'))}</div>
            <div><b>Boshi:</b> ${formatCoord(meta.start)}</div>
            <div><b>Oxiri:</b> ${formatCoord(meta.end)}</div>
            <div><b>Uzunligi:</b> ${Number(meta.lengthKm || 0).toFixed(2)} km</div>
            <div><b>Segmentlar:</b> ${meta.parts || 1}</div>
        </div>
    `;
}

function formatCoord(coord) {
    if (!coord) return '-';
    return `${coord[0].toFixed(5)}, ${coord[1].toFixed(5)}`;
}

function calculatePolylineLengthKm(coords) {
    let total = 0;
    for (let i = 1; i < coords.length; i += 1) total += haversineKm(coords[i - 1], coords[i]);
    return total;
}

function haversineKm(a, b) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const r = 6371;
    const dLat = toRad(b[0] - a[0]);
    const dLng = toRad(b[1] - a[1]);
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);

    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * r * Math.asin(Math.sqrt(h));
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

function getRoadBaseStyle(highwayType) {
    return { color: '#5c6d7c', weight: getRoadWeight(highwayType), opacity: 0.42, lineCap: 'round', lineJoin: 'round' };
}

function getRoadHoverStyle(highwayType) {
    return { color: '#8ea4b7', weight: Math.max(3.5, getRoadWeight(highwayType) + 1), opacity: 0.86, lineCap: 'round', lineJoin: 'round' };
}

function getRoadSelectedStyle(highwayType) {
    return { color: '#6de6c8', weight: Math.max(4.5, getRoadWeight(highwayType) + 1.5), opacity: 0.95, lineCap: 'round', lineJoin: 'round' };
}

function getRoadWeight(highwayType) {
    if (!highwayType) return 2;
    if (highwayType.includes('motorway') || highwayType.includes('trunk')) return 4;
    if (highwayType.includes('primary')) return 3.4;
    if (highwayType.includes('secondary')) return 2.9;
    if (highwayType.includes('tertiary')) return 2.5;
    return 2;
}

function getCongestionColor(level) {
    if (level < 25) return '#00ff88';
    if (level < 50) return '#ffee00';
    if (level < 75) return '#ff9500';
    return '#ff3366';
}

function updateVehiclesOnMap() {
    if (!map) return;

    const vehicles = window.simulationData?.vehicles || [];

    vehicles.forEach((vehicle) => {
        const { id, lat, lng, speed, type, emergency, road } = vehicle;
        if (lat == null || lng == null) return;

        const [snapLat, snapLng] = snapVehicleToRoad(lat, lng);

        if (vehicleMarkers[id]) {
            vehicleMarkers[id].setLatLng([snapLat, snapLng]);
            vehicleMarkers[id].setPopupContent(`<b>${id}</b><br>Speed: ${(speed ?? 0).toFixed(1)} km/h<br>Road: ${road || '-'}<br>Type: ${type || 'car'}`);
            return;
        }

        const iconType = emergency ? 'ambulance' : (type || 'car');
        const icon = vehicleIcons[iconType] || vehicleIcons.car;
        const marker = L.marker([snapLat, snapLng], { icon }).addTo(map);
        marker.bindPopup(`<b>${id}</b><br>Speed: ${(speed ?? 0).toFixed(1)} km/h<br>Road: ${road || '-'}<br>Type: ${type || 'car'}`);
        vehicleMarkers[id] = marker;
    });
}

function updateVehiclesVisibility(visible) {
    Object.values(vehicleMarkers).forEach((marker) => {
        if (visible) marker.addTo(map);
        else marker.remove();
    });
}

function updateHeatmapOnMap() {
    const segments = window.simulationData?.segments || [];
    congestionLayer.clearLayers();

    segments.forEach((segment) => {
        const match = segment.segment_id?.match(/SEG-(\d+)-(\d+)/);
        if (!match) return;

        const i = Number.parseInt(match[1], 10);
        const j = Number.parseInt(match[2], 10);

        const lat = CITY_CENTER[0] + (i - 2) * 0.005;
        const lng = CITY_CENTER[1] + (j - 2) * 0.006;

        L.circle([lat, lng], {
            radius: 220,
            color: segment.color || getCongestionColor(segment.congestion_level || 0),
            fillColor: segment.color || getCongestionColor(segment.congestion_level || 0),
            fillOpacity: 0.25,
            weight: 1
        }).addTo(congestionLayer);
    });
}

function updateHeatmapVisibility(visible) {
    if (visible) congestionLayer.addTo(map);
    else congestionLayer.remove();
}

function updateRoadsVisibility(visible) {
    if (!ENABLE_ROAD_OVERLAY) {
        roadsLayer.clearLayers();
        return;
    }

    if (visible) roadsLayer.addTo(map);
    else roadsLayer.remove();
}

function showEmergencyRoute(routePoints) {
    if (emergencyRoute) {
        emergencyRoute.remove();
        emergencyRoute = null;
    }

    if (!routePoints || routePoints.length < 2) return;

    const latlngs = routePoints.map((p) => [p.lat, p.lng]);

    emergencyRoute = L.polyline(latlngs, {
        color: '#ff3366',
        weight: 6,
        opacity: 0.95,
        dashArray: '10,8'
    }).addTo(map);

    map.fitBounds(emergencyRoute.getBounds(), { padding: [40, 40] });
}

function updateVehicleOnMap(data) {
    const { vehicle_id, latitude, longitude, speed, vehicle_type, is_emergency, current_road } = data;
    const [snapLat, snapLng] = snapVehicleToRoad(latitude, longitude);

    if (vehicleMarkers[vehicle_id]) {
        vehicleMarkers[vehicle_id].setLatLng([snapLat, snapLng]);
        return;
    }

    const iconType = is_emergency ? 'ambulance' : (vehicle_type || 'car');
    const icon = vehicleIcons[iconType] || vehicleIcons.car;

    const marker = L.marker([snapLat, snapLng], { icon }).addTo(map);
    marker.bindPopup(`<b>${vehicle_id}</b><br>Road: ${current_road || '-'}<br>Speed: ${(speed ?? 0).toFixed(1)} km/h`);
    vehicleMarkers[vehicle_id] = marker;
}

window.initMap = initMap;
window.updateVehiclesOnMap = updateVehiclesOnMap;
window.updateVehiclesVisibility = updateVehiclesVisibility;
window.updateHeatmapOnMap = updateHeatmapOnMap;
window.updateHeatmapVisibility = updateHeatmapVisibility;
window.updateRoadsVisibility = updateRoadsVisibility;
window.showEmergencyRoute = showEmergencyRoute;
window.updateVehicleOnMap = updateVehicleOnMap;
window.updateSignalsOnMap = updateSignalsOnMap;

let aiClustersLayer = null;
let recommendedRouteLayer = null;

function renderClustersOnMap(clusters) {
    if (!map) return;
    
    if (!aiClustersLayer) {
        aiClustersLayer = L.layerGroup().addTo(map);
    }
    
    aiClustersLayer.clearLayers();
    
    clusters.forEach(cluster => {
        if (!cluster.segment_ids) return;
        cluster.segment_ids.forEach(segId => {
            const match = segId.match(/SEG-(\d+)-(\d+)/);
            if (!match) return;
            const i = Number.parseInt(match[1], 10);
            const j = Number.parseInt(match[2], 10);
            const lat = CITY_CENTER[0] + (i - 2) * 0.005;
            const lng = CITY_CENTER[1] + (j - 2) * 0.006;
            
            L.circle([lat, lng], {
                radius: 250,
                color: cluster.color,
                fillColor: cluster.color,
                fillOpacity: 0.4,
                weight: 2
            }).addTo(aiClustersLayer)
            .bindPopup(`<b>AI Klaster: ${cluster.level}</b><br>Segment: ${segId}`);
        });
    });
}

function clearClustersOnMap() {
    if (aiClustersLayer) {
        aiClustersLayer.clearLayers();
    }
}

function drawRecommendationOnMap() {
    if (!map) return;
    
    if (recommendedRouteLayer) {
        recommendedRouteLayer.remove();
    }
    
    const coords = [
        [CITY_CENTER[0] - 0.01, CITY_CENTER[1] - 0.01],
        [CITY_CENTER[0], CITY_CENTER[1]],
        [CITY_CENTER[0] + 0.01, CITY_CENTER[1] + 0.01]
    ];
    
    recommendedRouteLayer = L.polyline(coords, {
        color: '#00FF88',
        weight: 8,
        opacity: 0.8,
        dashArray: '10, 10'
    }).addTo(map);
    
    map.fitBounds(recommendedRouteLayer.getBounds(), { padding: [50, 50] });
    
    setTimeout(() => {
        if (recommendedRouteLayer) {
            recommendedRouteLayer.remove();
            recommendedRouteLayer = null;
        }
    }, 10000);
}

window.renderClustersOnMap = renderClustersOnMap;
window.clearClustersOnMap = clearClustersOnMap;
window.drawRecommendationOnMap = drawRecommendationOnMap;



















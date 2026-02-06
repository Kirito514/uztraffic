/**
 * Aqlli Shahar Trafik Dashboard - Asosiy JavaScript
 */

// API Base URL
const API_BASE = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws/realtime';

// Global state
let websocket = null;
let isConnected = false;
let showVehicles = true;
let showHeatmap = true;
let simulationData = {
    vehicles: [],
    signals: [],
    segments: [],
    stats: {}
};

// DOM Elements
const connectionStatus = document.getElementById('connectionStatus');
const vehicleCount = document.getElementById('vehicleCount');
const avgSpeed = document.getElementById('avgSpeed');
const congestionLevel = document.getElementById('congestionLevel');
const emergencyCount = document.getElementById('emergencyCount');
const eventsList = document.getElementById('eventsList');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateTime();
    setInterval(updateTime, 1000);

    initWebSocket();
    initCharts();
    initMap();

    // Fallback: polling if WebSocket fails
    setInterval(fetchData, 2000);

    addEvent('info', 'Tizim ishga tushdi');
});

// Time update
function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('uz-UZ', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const dateStr = now.toLocaleDateString('uz-UZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    document.getElementById('currentTime').textContent = `${dateStr} | ${timeStr}`;
}

// WebSocket connection
function initWebSocket() {
    try {
        websocket = new WebSocket(WS_URL);

        websocket.onopen = () => {
            isConnected = true;
            connectionStatus.textContent = '🟢 Ulangan';
            connectionStatus.classList.add('connected');
            addEvent('info', 'Server bilan aloqa o\'rnatildi');
        };

        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleMessage(data);
        };

        websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            isConnected = false;
            connectionStatus.textContent = '🔴 Xato';
            connectionStatus.classList.remove('connected');
        };

        websocket.onclose = () => {
            isConnected = false;
            connectionStatus.textContent = '⚪ Uzilgan';
            connectionStatus.classList.remove('connected');

            // Reconnect after 3 seconds
            setTimeout(initWebSocket, 3000);
        };
    } catch (e) {
        console.error('WebSocket init failed:', e);
    }
}

// Handle WebSocket messages
function handleMessage(data) {
    switch (data.type) {
        case 'traffic_update':
            updateDashboard(data.data);
            break;
        case 'emergency_activated':
            showEmergencyAlert(data);
            break;
        case 'vehicle_update':
            updateVehicleOnMap(data.data);
            break;
    }
}

// Fetch data via REST API (fallback)
async function fetchData() {
    if (isConnected) return; // Skip if WebSocket is connected

    try {
        // Get traffic overview
        const overviewRes = await fetch(`${API_BASE}/api/traffic/overview`);
        if (overviewRes.ok) {
            const overview = await overviewRes.json();
            updateStats(overview);
        }

        // Get vehicles
        const vehiclesRes = await fetch(`${API_BASE}/api/vehicles`);
        if (vehiclesRes.ok) {
            const data = await vehiclesRes.json();
            simulationData.vehicles = data.vehicles || [];
            updateVehiclesOnMap();
        }

        // Get congestion
        const congestionRes = await fetch(`${API_BASE}/api/traffic/congestion`);
        if (congestionRes.ok) {
            const data = await congestionRes.json();
            simulationData.segments = data.segments || [];
            updateHeatmapOnMap();
        }

        // Simulation step
        await fetch(`${API_BASE}/api/simulation/step`, { method: 'POST' });

    } catch (e) {
        console.log('API not available, using demo mode');
        generateDemoData();
    }
}

// Update dashboard with real data
function updateDashboard(data) {
    if (data.total_vehicles !== undefined) {
        vehicleCount.textContent = data.total_vehicles;
    }
    if (data.average_speed !== undefined) {
        avgSpeed.textContent = data.average_speed.toFixed(1);
    }
    if (data.average_congestion !== undefined) {
        congestionLevel.textContent = data.average_congestion.toFixed(0) + '%';
        updateCongestionColor(data.average_congestion);
    }
    if (data.segments_by_status) {
        updateStatusBreakdown(data.segments_by_status);
    }

    // Update charts
    addCongestionDataPoint(data.average_congestion || 50);
    addSpeedDataPoint(data.average_speed || 40);
}

// Update stats display
function updateStats(overview) {
    vehicleCount.textContent = overview.total_vehicles || 0;
    avgSpeed.textContent = (overview.average_speed || 0).toFixed(1);
    congestionLevel.textContent = (overview.average_congestion || 0).toFixed(0) + '%';

    updateCongestionColor(overview.average_congestion || 0);

    if (overview.segments_by_status) {
        updateStatusBreakdown(overview.segments_by_status);
    }
}

// Update status breakdown
function updateStatusBreakdown(statusCounts) {
    document.getElementById('freeCount').textContent = statusCounts.FREE || 0;
    document.getElementById('lightCount').textContent = statusCounts.LIGHT || 0;
    document.getElementById('moderateCount').textContent = statusCounts.MODERATE || 0;
    document.getElementById('heavyCount').textContent = statusCounts.HEAVY || 0;
}

// Update congestion level color
function updateCongestionColor(level) {
    const element = congestionLevel;
    element.style.color = getCongestionColor(level);
}

// Get color based on congestion level
function getCongestionColor(level) {
    if (level < 25) return '#00ff88';
    if (level < 50) return '#ffee00';
    if (level < 75) return '#ff9500';
    return '#ff3366';
}

// Add event to list
function addEvent(type, message) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('uz-UZ', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const eventItem = document.createElement('div');
    eventItem.className = `event-item ${type}`;
    eventItem.innerHTML = `
        <span class="event-time">${timeStr}</span>
        <span class="event-text">${message}</span>
    `;

    eventsList.insertBefore(eventItem, eventsList.firstChild);

    // Limit to 50 events
    while (eventsList.children.length > 50) {
        eventsList.removeChild(eventsList.lastChild);
    }
}

// Toggle vehicles visibility
function toggleVehicles() {
    showVehicles = !showVehicles;
    document.getElementById('vehicleToggle').textContent =
        showVehicles ? '🚗 Yashirish' : '🚗 Ko\'rsatish';

    if (typeof updateVehiclesVisibility === 'function') {
        updateVehiclesVisibility(showVehicles);
    }
}

// Toggle heatmap visibility
function toggleHeatmap() {
    showHeatmap = !showHeatmap;
    document.getElementById('heatmapToggle').textContent =
        showHeatmap ? '🌡️ Yashirish' : '🌡️ Ko\'rsatish';

    if (typeof updateHeatmapVisibility === 'function') {
        updateHeatmapVisibility(showHeatmap);
    }
}

// Simulate emergency
async function simulateEmergency() {
    addEvent('emergency', '🚑 Tez yordam chaqirilmoqda...');

    try {
        const response = await fetch(`${API_BASE}/api/emergency/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vehicle_id: 'AMB-001',
                destination_lat: 41.31 + Math.random() * 0.02,
                destination_lng: 69.25 + Math.random() * 0.02
            })
        });

        if (response.ok) {
            showEmergencyAlert({
                vehicle_id: 'AMB-001',
                type: 'ambulance'
            });
        }
    } catch (e) {
        // Demo mode
        showEmergencyAlert({
            vehicle_id: 'AMB-' + Math.floor(Math.random() * 100),
            type: 'Tez yordam'
        });
    }
}

// Show emergency alert modal
function showEmergencyAlert(data) {
    const modal = document.getElementById('emergencyModal');
    document.getElementById('emergencyVehicle').textContent = data.vehicle_id || 'AMB-001';
    document.getElementById('emergencyDirection').textContent = 'Shimol → Janub';
    document.getElementById('emergencyETA').textContent = '~3 daqiqa';

    modal.classList.add('active');

    addEvent('emergency', `🚨 ${data.vehicle_id} favqulodda rejimda!`);
    emergencyCount.textContent = parseInt(emergencyCount.textContent) + 1;

    // Auto close after 5 seconds
    setTimeout(closeEmergencyModal, 5000);
}

// Close emergency modal
function closeEmergencyModal() {
    document.getElementById('emergencyModal').classList.remove('active');
}

// Generate demo data (when not connected to server)
function generateDemoData() {
    const time = Date.now() / 1000;

    // Fluctuating values
    const congestion = 40 + Math.sin(time / 10) * 20 + Math.random() * 10;
    const speed = 50 - congestion * 0.3 + Math.random() * 5;
    const vehicles = 450 + Math.floor(Math.sin(time / 30) * 50);

    vehicleCount.textContent = vehicles;
    avgSpeed.textContent = speed.toFixed(1);
    congestionLevel.textContent = congestion.toFixed(0) + '%';

    updateCongestionColor(congestion);

    // Random status breakdown
    const total = 25;
    const heavy = Math.floor(congestion / 10);
    const moderate = Math.floor(Math.random() * (total - heavy) / 2);
    const light = Math.floor(Math.random() * (total - heavy - moderate) / 2);
    const free = total - heavy - moderate - light;

    document.getElementById('freeCount').textContent = free;
    document.getElementById('lightCount').textContent = light;
    document.getElementById('moderateCount').textContent = moderate;
    document.getElementById('heavyCount').textContent = heavy;

    // Update charts
    addCongestionDataPoint(congestion);
    addSpeedDataPoint(speed);

    // Generate demo vehicles for map
    if (!simulationData.vehicles.length) {
        for (let i = 0; i < vehicles; i++) {
            simulationData.vehicles.push({
                id: `VH-${i.toString().padStart(4, '0')}`,
                lat: 41.2995 + (Math.random() - 0.5) * 0.06,
                lng: 69.2401 + (Math.random() - 0.5) * 0.08,
                speed: 20 + Math.random() * 50,
                type: Math.random() > 0.1 ? 'car' : 'ambulance',
                emergency: Math.random() > 0.95
            });
        }
    } else {
        // Update positions
        simulationData.vehicles.forEach(v => {
            v.lat += (Math.random() - 0.5) * 0.001;
            v.lng += (Math.random() - 0.5) * 0.001;
            v.speed = 20 + Math.random() * 50;
        });
    }

    updateVehiclesOnMap();
}

// Export for other modules
window.simulationData = simulationData;
window.addEvent = addEvent;
window.showEmergencyAlert = showEmergencyAlert;

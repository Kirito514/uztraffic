/**
 * Aqlli Shahar Trafik Dashboard - Asosiy JavaScript
 */

// API Base URL
const API_BASE = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws/realtime';
const ENABLE_SIMULATION = true;

// Global state
let websocket = null;
let isConnected = false;
let showVehicles = true;
let showHeatmap = true;
window.simulationData = {
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

    if (ENABLE_SIMULATION) initWebSocket();
    initMap();

    // Fallback: polling if WebSocket fails
    if (ENABLE_SIMULATION) setInterval(fetchData, 2000);

    // AI tahlilni boshlash
    refreshAI();
    setInterval(refreshAI, 10000); // har 10 soniyada yangilash

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
    const wsUrl = `ws://${location.host}/ws/realtime`;
    console.log('Ulanish:', wsUrl);
    websocket = new WebSocket(wsUrl);

    try {
        websocket.onopen = () => {
            isConnected = true;
            connectionStatus.textContent = '🟢 Ulangan';
            connectionStatus.classList.add('connected');
            addEvent('info', 'Server bilan aloqa o\'rnatildi');
        };

        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type) {
                // Handle old format or specific events
                switch (data.type) {
                    case 'emergency_activated':
                        showEmergencyAlert(data);
                        break;
                    case 'vehicle_update':
                        updateVehicleOnMap(data.data);
                        break;
                }
            } else if (data.vehicles || data.signals || data.segments) {
                // Direct dashboard data
                updateDashboard(data);
            }
        };

        websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            isConnected = false;
            if(connectionStatus) {
                connectionStatus.textContent = '🔴 Xato';
                connectionStatus.classList.remove('connected');
            }
        };

        websocket.onclose = () => {
            isConnected = false;
            if(connectionStatus) {
                connectionStatus.textContent = '⚪ Uzilgan';
                connectionStatus.classList.remove('connected');
            }
            // Reconnect after 3 seconds
            setTimeout(initWebSocket, 3000);
        };
    } catch (e) {
        console.error('WebSocket init failed:', e);
    }
}

// Fetch data via REST API (fallback)
async function fetchData() {
    if (!ENABLE_SIMULATION) return;
    if (isConnected) return;

    try {
        const overviewRes = await fetch(`${API_BASE}/api/traffic/overview`);
        if (overviewRes.ok) {
            const overview = await overviewRes.json();
            updateStats(overview);
        }

        const vehiclesRes = await fetch(`${API_BASE}/api/vehicles`);
        if (vehiclesRes.ok) {
            const data = await vehiclesRes.json();
            window.simulationData.vehicles = (data.vehicles || []).map((v) => ({
                id: v.vehicle_id || v.id,
                lat: v.latitude ?? v.lat,
                lng: v.longitude ?? v.lng,
                speed: v.speed,
                type: v.vehicle_type || v.type,
                emergency: v.is_emergency || v.emergency,
                road: v.current_road || v.road
            }));
            updateVehiclesOnMap();
        }

        const signalsRes = await fetch(`${API_BASE}/api/signals`);
        if (signalsRes.ok) {
            const data = await signalsRes.json();
            window.simulationData.signals = data.signals || [];
            if (typeof updateSignalsOnMap === 'function') updateSignalsOnMap();
        }

        const congestionRes = await fetch(`${API_BASE}/api/traffic/congestion`);
        if (congestionRes.ok) {
            const data = await congestionRes.json();
            window.simulationData.segments = data.segments || [];
            updateHeatmapOnMap();
        }

        await fetch(`${API_BASE}/api/simulation/step`, { method: 'POST' });
        
        if (typeof showClusters !== 'undefined' && showClusters) {
            fetchClusters();
        }

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

    if (Array.isArray(data.vehicles)) {
        window.simulationData.vehicles = data.vehicles;
        if (typeof updateVehiclesOnMap === 'function') updateVehiclesOnMap();
    }

    if (Array.isArray(data.signals)) {
        window.simulationData.signals = data.signals;
        if (typeof updateSignalsOnMap === 'function') updateSignalsOnMap();
    }

    if (Array.isArray(data.segments)) {
        window.simulationData.segments = data.segments;
        if (typeof updateHeatmapOnMap === 'function') updateHeatmapOnMap();
    }

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
    const btn = document.getElementById('btnVehicles');
    if (btn) btn.classList.toggle('active', showVehicles);

    if (typeof updateVehiclesVisibility === 'function') {
        updateVehiclesVisibility(showVehicles);
    }
}

// Toggle heatmap visibility
function toggleHeatmap() {
    showHeatmap = !showHeatmap;
    const btn = document.getElementById('btnHeatmap');
    if (btn) btn.classList.toggle('active', showHeatmap);

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

    modal.style.display = 'flex';

    addEvent('emergency', `🚨 ${data.vehicle_id} favqulodda rejimda!`);
    emergencyCount.textContent = parseInt(emergencyCount.textContent) + 1;

    setTimeout(closeEmergencyModal, 5000);
}

// Close emergency modal
function closeEmergencyModal() {
    document.getElementById('emergencyModal').style.display = 'none';
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

// ===== AI TAHLIL FUNKSIYALARI =====
async function refreshAI() {
    try {
        // 1. Hotspot (eng band zona) ni olish
        const hotRes = await fetch(`${API_BASE}/api/traffic/hotspots?threshold=30`);
        if (hotRes.ok) {
            const hotData = await hotRes.json();
            const spots = hotData.hotspots || [];
            if (spots.length > 0) {
                const top = spots[0];
                const el = document.getElementById('hotspotZone');
                const lvl = document.getElementById('hotspotLevel');
                const sts = document.getElementById('hotspotStatus');
                if (el) el.textContent = top.segment_id;
                if (lvl) lvl.textContent = top.congestion_level.toFixed(1) + '%';
                if (sts) {
                    sts.textContent = top.status;
                    sts.style.color = top.status === 'HEAVY' ? '#ff3366' :
                                      top.status === 'MODERATE' ? '#ff9500' :
                                      top.status === 'LIGHT' ? '#ffcc00' : '#00cc66';
                }
            } else {
                const el = document.getElementById('hotspotZone');
                if (el) el.textContent = 'Tirbandlik yo\'q';
                const lvl = document.getElementById('hotspotLevel');
                if (lvl) lvl.textContent = '0%';
                const sts = document.getElementById('hotspotStatus');
                if (sts) { sts.textContent = 'FREE'; sts.style.color = '#00cc66'; }
            }
        }

        // 2. AI Klasterlarni olish
        const clRes = await fetch(`${API_BASE}/api/traffic/clusters`);
        if (clRes.ok) {
            const clData = await clRes.json();
            const ci = document.getElementById('clusterInfo');
            if (ci) {
                if (clData.status === 'ok') {
                    const clusters = clData.clusters || [];
                    const heavy = clusters.find(c => c.level === 'Heavy');
                    ci.textContent = heavy
                        ? `${heavy.segment_ids.length} ta og'ir zona`
                        : `${clusters.length} ta klaster`;
                } else {
                    ci.textContent = 'Ma\'lumot yetarli emas';
                }
            }
        }
    } catch (e) {
        console.log('AI refresh error:', e.message);
    }
}
window.refreshAI = refreshAI;

function renderDetailRows(rows) {
    return rows.map((r) => `
        <div class="detail-row">
            <span class="label">${r.label}</span>
            <span class="value">${r.value ?? '-'}</span>
        </div>
    `).join('');
}


function showMapDetail(type, payload) {
    const titleEl = document.getElementById('mapDetailTitle');
    const bodyEl = document.getElementById('mapDetailBody');
    if (!titleEl || !bodyEl) {
        return;
    }    if (type === 'signal') {
        titleEl.textContent = `Svetafor ${payload.id || ''}`.trim();

        const rows = [
            { label: 'Turi', value: payload.source || 'signal' },
            { label: 'Faza', value: payload.phase || '-' },
            { label: 'Koord.', value: payload.coord || '-' }
        ];

        if (payload.timer !== undefined) rows.push({ label: 'Qolgan vaqt', value: `${payload.timer}s` });
        if (payload.mode) rows.push({ label: 'Rejim', value: payload.mode });
        if (payload.queue) rows.push({ label: 'Navbat (N/S/E/W)', value: payload.queue });

        bodyEl.innerHTML = renderDetailRows(rows);
        return;
    }    if (type === 'road') {
        titleEl.textContent = payload.name || "Yo'l";
        bodyEl.innerHTML = renderDetailRows([
            { label: 'ID', value: payload.id },
            { label: 'Turi', value: payload.roadType },
            { label: "Yo'nalish", value: payload.direction },
            { label: "Yo'laklar", value: payload.lanes },
            { label: 'Tezlik limiti', value: payload.maxspeed },
            { label: 'Boshi', value: payload.start },
            { label: 'Oxiri', value: payload.end },
            { label: 'Uzunligi', value: payload.length },
            { label: 'Segmentlar', value: payload.parts }
        ]);
        return;
    }

    titleEl.textContent = 'Tanlangan obyekt';
    bodyEl.textContent = "Ma'lumot mavjud emas";
}

function closeMapDetail() {
    const titleEl = document.getElementById('mapDetailTitle');
    const bodyEl = document.getElementById('mapDetailBody');
    if (!titleEl || !bodyEl) {
        return;
    }
    titleEl.textContent = 'Tanlangan obyekt';
    bodyEl.textContent = "Yo'l yoki svetafor ustiga bosib ma'lumotni ko'ring.";
}

window.showMapDetail = showMapDetail;
window.closeMapDetail = closeMapDetail;

// K-Means Clustering logic
let showClusters = false;

function toggleClusters() {
    showClusters = !showClusters;
    document.getElementById('clusterToggle').textContent =
        showClusters ? 'Klasterlar: Yoqiq' : 'Klasterlar (AI)';
    
    if (showClusters) {
        fetchClusters();
    } else {
        if (typeof clearClustersOnMap === 'function') {
            clearClustersOnMap();
        }
    }
}

async function fetchClusters() {
    if (!showClusters) return;
    try {
        const res = await fetch(`${API_BASE}/api/traffic/clusters`);
        if (res.ok) {
            const data = await res.json();
            if (typeof renderClustersOnMap === 'function') {
                renderClustersOnMap(data.clusters);
            }
        }
    } catch (e) {
        console.error('Cluster fetch error', e);
    }
}

// Chatbot Logic
function toggleChatbot() {
    const widget = document.getElementById('chatbotWidget');
    widget.classList.toggle('collapsed');
}

function handleChatKey(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    
    input.value = '';
    appendChatMessage('user', text);
    
    try {
        const res = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ message: text, user_id: 'driver_web' })
        });
        
        if (res.ok) {
            const data = await res.json();
            appendChatMessage('bot', data.response);
            
            if (data.action === 'trigger_emergency') {
                simulateEmergency();
            } else if (data.action === 'show_recommendation') {
                if (typeof drawRecommendationOnMap === 'function') {
                    drawRecommendationOnMap();
                }
            }
        } else {
            appendChatMessage('bot', 'Kechirasiz, tarmoqda xatolik yuz berdi.');
        }
    } catch (e) {
        appendChatMessage("bot", "Kechirasiz, serverga ulanib bolmadi.");
    }
}

function appendChatMessage(sender, text) {
    const body = document.getElementById('chatbotBody');
    const div = document.createElement('div');
    div.className = `chat-msg ${sender}`;
    const avatarText = sender === 'bot' ? 'AI' : 'Sen';
    div.innerHTML = `
        <div class="chat-avatar">${avatarText}</div>
        <div class="chat-bubble">${text}</div>
    `;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}





import { useState, useEffect, useRef, useCallback } from 'react';
import type { TrafficEvent } from '../components/EventsPanel';

export interface Vehicle {
    id: string;
    lat: number;
    lng: number;
    type: 'car' | 'ambulance' | 'police' | 'fire_truck';
    speed: number;
    direction: number;
    road?: string;
}

export interface TrafficStats {
    vehicle_count: number;
    avg_speed: number;
    congestion_level: number;
    emergency_active: boolean;
}

export interface ChartData {
    congestion: number[];
    speed: number[];
    labels: string[];
}

const MAX_DATA_POINTS = 30;

// Vaqt formati
const getTimeLabel = () => {
    const now = new Date();
    return now.toLocaleTimeString('uz-UZ', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

export default function useTrafficData() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [stats, setStats] = useState<TrafficStats>({
        vehicle_count: 0,
        avg_speed: 0,
        congestion_level: 0,
        emergency_active: false
    });
    const [isConnected, setIsConnected] = useState(false);
    const [events, setEvents] = useState<TrafficEvent[]>([]);
    const [chartData, setChartData] = useState<ChartData>({
        congestion: [],
        speed: [],
        labels: []
    });
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);

    const ws = useRef<WebSocket | null>(null);
    const demoInterval = useRef<number | null>(null);

    // Hodisa qo'shish
    const addEvent = useCallback((type: TrafficEvent['type'], message: string) => {
        const newEvent: TrafficEvent = {
            id: Date.now().toString(),
            type,
            message,
            time: getTimeLabel()
        };
        setEvents(prev => [newEvent, ...prev.slice(0, 49)]);
    }, []);

    // Chart data yangilash
    const updateChartData = useCallback((congestion: number, speed: number) => {
        setChartData(prev => {
            const newLabels = [...prev.labels, getTimeLabel()];
            const newCongestion = [...prev.congestion, congestion];
            const newSpeed = [...prev.speed, speed];

            // Limit data points
            if (newLabels.length > MAX_DATA_POINTS) {
                newLabels.shift();
                newCongestion.shift();
                newSpeed.shift();
            }

            return {
                labels: newLabels,
                congestion: newCongestion,
                speed: newSpeed
            };
        });
    }, []);

    // Demo ma'lumotlar generatsiyasi
    const generateDemoData = useCallback(() => {
        const time = Date.now() / 1000;
        const congestion = 40 + Math.sin(time / 10) * 20 + Math.random() * 10;
        const speed = 50 - congestion * 0.3 + Math.random() * 5;
        const vehicleCount = 450 + Math.floor(Math.sin(time / 30) * 50);

        setStats({
            vehicle_count: vehicleCount,
            avg_speed: speed,
            congestion_level: Math.round(congestion),
            emergency_active: false
        });

        updateChartData(congestion, speed);

        // Demo transport vositalarini yaratish
        const demoVehicles: Vehicle[] = [];
        for (let i = 0; i < Math.min(vehicleCount, 100); i++) {
            demoVehicles.push({
                id: `VH-${i.toString().padStart(4, '0')}`,
                lat: 41.2995 + (Math.random() - 0.5) * 0.06,
                lng: 69.2401 + (Math.random() - 0.5) * 0.08,
                speed: 20 + Math.random() * 50,
                type: Math.random() > 0.95 ? 'ambulance' : 'car',
                direction: Math.random() * 360
            });
        }
        setVehicles(demoVehicles);
    }, [updateChartData]);

    // WebSocket ulanishi
    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;

        const connect = () => {
            try {
                const socket = new WebSocket(`${protocol}//${host}/ws/realtime`);

                socket.onopen = () => {
                    console.log('Server bilan aloqa o\'rnatildi');
                    setIsConnected(true);
                    addEvent('info', 'Server bilan aloqa o\'rnatildi');

                    // Demo rejimni o'chirish
                    if (demoInterval.current) {
                        clearInterval(demoInterval.current);
                        demoInterval.current = null;
                    }
                };

                socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'update' || data.type === 'traffic_update') {
                            const updateData = data.data || data;

                            if (updateData.vehicles) {
                                setVehicles(updateData.vehicles);
                            }

                            if (updateData.stats || updateData.total_vehicles !== undefined) {
                                const newStats = updateData.stats || {
                                    vehicle_count: updateData.total_vehicles || 0,
                                    avg_speed: updateData.average_speed || 0,
                                    congestion_level: updateData.average_congestion || 0,
                                    emergency_active: false
                                };
                                setStats(newStats);
                                updateChartData(newStats.congestion_level, newStats.avg_speed);
                            }
                        }

                        if (data.type === 'emergency_activated') {
                            setStats(prev => ({ ...prev, emergency_active: true }));
                            setShowEmergencyModal(true);
                            addEvent('emergency', `🚨 ${data.vehicle_id || 'AMB-001'} favqulodda rejimda!`);
                        }
                    } catch (e) {
                        console.error('WebSocket data parsing error:', e);
                    }
                };

                socket.onclose = () => {
                    console.log('Server bilan aloqa uzildi');
                    setIsConnected(false);
                    addEvent('warning', 'Server bilan aloqa uzildi. Demo rejimga o\'tildi.');

                    // Demo rejimni ishga tushirish
                    if (!demoInterval.current) {
                        demoInterval.current = window.setInterval(generateDemoData, 2000);
                    }

                    // Qayta ulanish
                    setTimeout(connect, 3000);
                };

                socket.onerror = () => {
                    setIsConnected(false);
                };

                ws.current = socket;
            } catch (e) {
                console.error('WebSocket connection failed:', e);
                // Demo rejimni ishga tushirish
                if (!demoInterval.current) {
                    demoInterval.current = window.setInterval(generateDemoData, 2000);
                }
            }
        };

        // Boshlang'ich hodisa
        addEvent('info', 'Tizim ishga tushdi');

        // Boshlang'ich chart data
        for (let i = 0; i < 10; i++) {
            updateChartData(40 + Math.random() * 20, 40 + Math.random() * 15);
        }

        connect();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
            if (demoInterval.current) {
                clearInterval(demoInterval.current);
            }
        };
    }, [addEvent, generateDemoData, updateChartData]);

    // Favqulodda chaqirish
    const triggerEmergency = async () => {
        addEvent('emergency', '🚑 Tez yordam chaqirilmoqda...');

        try {
            const response = await fetch('/api/emergency/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vehicle_id: 'AMB-' + Math.floor(Math.random() * 100).toString().padStart(3, '0'),
                    destination_lat: 41.31 + Math.random() * 0.02,
                    destination_lng: 69.25 + Math.random() * 0.02
                })
            });

            if (response.ok) {
                setShowEmergencyModal(true);
                setStats(prev => ({ ...prev, emergency_active: true }));
                addEvent('emergency', '🚨 Tez yordam chaqirildi! EVP tizimi faol.');
            }
        } catch (e) {
            // Demo mode
            setShowEmergencyModal(true);
            setStats(prev => ({ ...prev, emergency_active: true }));
            addEvent('emergency', '🚨 Tez yordam chaqirildi! (Demo rejim)');
        }
    };

    const closeEmergencyModal = () => {
        setShowEmergencyModal(false);
    };

    return {
        vehicles,
        stats,
        isConnected,
        events,
        chartData,
        showEmergencyModal,
        triggerEmergency,
        closeEmergencyModal,
        addEvent
    };
}

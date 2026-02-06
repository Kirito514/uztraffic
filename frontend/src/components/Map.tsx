import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ScaleControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import type { Vehicle } from '../hooks/useTrafficData';
import mapData from '../data/map_data.json';
import MapControls from './MapControls';

// Vehicle type labels in Uzbek
const vehicleLabels: Record<string, string> = {
    car: '🚗 Avtomobil',
    ambulance: '🚑 Tez yordam',
    police: '🚔 Politsiya',
    fire_truck: '🚒 Oʻt oʻchirish'
};

// Pre-created icons (moved outside component for performance)
const carIcon = new L.DivIcon({
    className: 'bg-transparent',
    html: `<div style="width:20px;height:20px;background:#3b82f6;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><div style="width:6px;height:6px;background:white;border-radius:50%;"></div></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const emergencyIcon = new L.DivIcon({
    className: 'bg-transparent',
    html: `<div style="width:20px;height:20px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;animation:pulse 1s infinite;"><div style="width:6px;height:6px;background:white;border-radius:50%;"></div></div><style>@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}</style>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

// Pre-created signal icons for common sizes
const signalIconSmall = new L.DivIcon({
    className: 'bg-transparent',
    html: `<div style="font-size:16px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">🚦</div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});

const signalIconLarge = new L.DivIcon({
    className: 'bg-transparent',
    html: `<div style="font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">🚦</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const TILE_LAYERS = {
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
};

// Map Controller for Zoom, FlyTo and Scale
function MapController({
    onZoomChange,
    searchPos,
    isExpanded,
    zoomCommand
}: {
    onZoomChange: (zoom: number) => void;
    searchPos: [number, number] | null;
    isExpanded: boolean;
    zoomCommand: 'in' | 'out' | null;
}) {
    const map = useMap();

    useEffect(() => {
        const handleZoom = () => onZoomChange(map.getZoom());
        map.on('zoomend', handleZoom);
        return () => { map.off('zoomend', handleZoom); };
    }, [map, onZoomChange]);

    useEffect(() => {
        if (searchPos) {
            map.flyTo(searchPos, 16, {
                animate: true,
                duration: 1.5
            });
        }
    }, [map, searchPos]);

    // Fix for Leaflet gray tiles when container size changes
    useEffect(() => {
        setTimeout(() => {
            map.invalidateSize({ animate: true });
        }, 500); // Wait for CSS transition
    }, [map, isExpanded]);

    // Zoom in/out commands
    useEffect(() => {
        if (zoomCommand === 'in') {
            map.zoomIn();
        } else if (zoomCommand === 'out') {
            map.zoomOut();
        }
    }, [map, zoomCommand]);

    return <ScaleControl position="bottomleft" />;
}

interface MapProps {
    vehicles: Vehicle[];
    showSignals?: boolean;
    showRoads?: boolean;
    isEditMode?: boolean;
    isExpanded: boolean;
    onToggleExpand: () => void;
}

export default function Map({
    vehicles,
    showSignals = true,
    showRoads = true,
    isEditMode = false,
    isExpanded,
    onToggleExpand
}: MapProps) {
    const [zoom, setZoom] = useState(11);
    const [mapStyle, setMapStyle] = useState<'dark' | 'light' | 'satellite'>('dark');
    const [searchPos, setSearchPos] = useState<[number, number] | null>(null);
    const [zoomCommand, setZoomCommand] = useState<'in' | 'out' | null>(null);
    const cityCenter: [number, number] = [41.2995, 69.2401];

    const handleZoomIn = useCallback(() => {
        setZoomCommand('in');
        setTimeout(() => setZoomCommand(null), 100);
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoomCommand('out');
        setTimeout(() => setZoomCommand(null), 100);
    }, []);

    // Simple search logic for Tashkent
    const handleSearch = useCallback(async (query: string) => {
        // For demo purposes, we can try to find in our data first, or use a geocoding API
        // Let's use a public geocoding API for better results
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=Tashkent+${encodeURIComponent(query)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                setSearchPos([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }, []);

    // Filter signals based on zoom level to prevent lag
    const visibleSignals = useMemo(() => {
        if (!showSignals) return [];
        if (zoom < 13) return mapData.signals.slice(0, 50);
        if (zoom < 15) return mapData.signals.slice(0, 200);
        return mapData.signals;
    }, [zoom, showSignals]);

    // Filter roads based on zoom level
    const visibleRoads = useMemo(() => {
        if (!showRoads) return [];
        if (zoom < 12) return [];
        if (zoom < 14) {
            return mapData.roads.filter(r => r.type === 'primary' || r.type === 'motorway' || r.type === 'trunk' || r.type === 'secondary');
        }
        return mapData.roads;
    }, [zoom, showRoads]);

    const expandedStyle = isExpanded ? {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        borderRadius: 0,
        border: 'none'
    } : {};

    return (
        <div
            className={`h-full w-full rounded-2xl overflow-hidden border border-white/5`}
            style={expandedStyle}
        >
            <MapContainer
                center={cityCenter}
                zoom={11}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <MapController onZoomChange={setZoom} searchPos={searchPos} isExpanded={isExpanded} zoomCommand={zoomCommand} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url={TILE_LAYERS[mapStyle]}
                />

                {/* Real Roads from OSM */}
                {visibleRoads.map((road) => (
                    <Polyline
                        key={`road-${road.id}`}
                        positions={road.positions as [number, number][]}
                        pathOptions={{
                            color: road.type === 'primary' || road.type === 'motorway' ? '#3b82f6' : '#6366f1',
                            weight: zoom > 15 ? 4 : 2,
                            opacity: mapStyle === 'satellite' ? 0.7 : 0.4
                        }}
                    >
                        <Popup>{road.name}</Popup>
                    </Polyline>
                ))}

                {/* Real Traffic Signals from OSM */}
                {visibleSignals.map((signal) => (
                    <Marker
                        key={`signal-${signal.id}`}
                        position={[signal.lat, signal.lng]}
                        icon={zoom > 15 ? signalIconLarge : signalIconSmall}
                    >
                        <Popup>
                            <div className="text-center font-bold">🚦 {signal.name}</div>
                        </Popup>
                    </Marker>
                ))}

                {/* Vehicles */}
                {vehicles.map(vehicle => (
                    <Marker
                        key={vehicle.id}
                        position={[vehicle.lat, vehicle.lng]}
                        icon={vehicle.type === 'ambulance' || vehicle.type === 'police' || vehicle.type === 'fire_truck' ? emergencyIcon : carIcon}
                    >
                        <Popup>
                            <div className="font-bold">{vehicleLabels[vehicle.type] || vehicle.type}</div>
                            <div>Tezlik: {vehicle.speed.toFixed(1)} km/s</div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Map Controls */}
            <MapControls
                isExpanded={isExpanded}
                onToggleExpand={onToggleExpand}
                onStyleChange={setMapStyle}
                onSearch={handleSearch}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                currentStyle={mapStyle}
            />

            {/* Edit Mode Overlay */}
            {isEditMode && (
                <div className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full text-white text-sm z-[1000] flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    Tahrirlash rejimi faol
                </div>
            )}
        </div>
    );
}

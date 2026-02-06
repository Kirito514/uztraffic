"""
FastAPI Server - Traffic Management API

Trafik boshqaruv tizimining asosiy API serveri
"""

import asyncio
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Local imports (relative imports uchun)
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from iot import DeviceManager, GPSDeviceFactory, VehicleType
    from models import TrafficAnalyzer, CongestionPredictor, SignalOptimizer, IntersectionState
    from emergency import EVPController, EmergencyVehicle, EmergencyType
except ImportError as e:
    print(f"⚠️ Import xatosi: {e}")
    print("Modullar alohida yuklanadi...")
    DeviceManager = None

# FastAPI app
app = FastAPI(
    title="🚦 Aqlli Shahar Trafik API",
    description="GPS kuzatuv va svetofor optimallashtirish tizimi",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
device_manager: Optional[DeviceManager] = None
traffic_analyzer: Optional[TrafficAnalyzer] = None
congestion_predictor: Optional[CongestionPredictor] = None
signal_optimizer: Optional[SignalOptimizer] = None
evp_controller: Optional[EVPController] = None

# WebSocket connections
active_connections: list[WebSocket] = []


# Pydantic models
class VehiclePosition(BaseModel):
    vehicle_id: str
    latitude: float
    longitude: float
    speed: float
    heading: float = 0.0


class EmergencyActivation(BaseModel):
    vehicle_id: str
    destination_lat: float
    destination_lng: float


class PredictionRequest(BaseModel):
    segment_id: str
    horizon_minutes: list[int] = [15, 30, 60]


class SignalOptimizeRequest(BaseModel):
    intersection_id: str
    north_queue: int = 0
    south_queue: int = 0
    east_queue: int = 0
    west_queue: int = 0


# Startup/Shutdown
@app.on_event("startup")
async def startup_event():
    """Server ishga tushganda"""
    global device_manager, traffic_analyzer, congestion_predictor
    global signal_optimizer, evp_controller
    
    print("🚀 Server ishga tushmoqda...")
    
    # Komponentlarni yaratish
    if DeviceManager:
        device_manager = DeviceManager(use_mqtt=False)
        device_manager.create_random_fleet(count=100)
        device_manager.start()
    
    traffic_analyzer = TrafficAnalyzer() if TrafficAnalyzer else None
    congestion_predictor = CongestionPredictor() if CongestionPredictor else None
    signal_optimizer = SignalOptimizer() if SignalOptimizer else None
    evp_controller = EVPController() if EVPController else None
    
    # Grid yaratish
    if traffic_analyzer:
        traffic_analyzer.create_grid_segments(
            center=(41.2995, 69.2401),
            grid_size=5,
            cell_size_km=0.5
        )
    
    print("✅ Server tayyor!")


@app.on_event("shutdown")
async def shutdown_event():
    """Server to'xtaganda"""
    global device_manager
    if device_manager:
        device_manager.stop()
    print("⏹️ Server to'xtatildi")


# ============ ROOT ============
@app.get("/")
async def root():
    """API haqida ma'lumot"""
    return {
        "name": "Aqlli Shahar Trafik API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "vehicles": "/api/vehicles",
            "traffic": "/api/traffic",
            "signals": "/api/signals",
            "emergency": "/api/emergency",
            "websocket": "/ws/realtime"
        }
    }


# ============ VEHICLES ============
@app.get("/api/vehicles")
async def get_all_vehicles():
    """Barcha transport vositalari"""
    if not device_manager:
        return {"vehicles": [], "count": 0}
    
    devices = device_manager.get_all_devices()
    vehicles = []
    
    for device in devices:
        gps_data = device._create_gps_data()
        vehicles.append(gps_data.to_dict())
    
    return {
        "vehicles": vehicles,
        "count": len(vehicles),
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: str):
    """Bitta transport ma'lumoti"""
    if not device_manager:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device = device_manager.get_device(vehicle_id)
    if not device:
        raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found")
    
    return device._create_gps_data().to_dict()


@app.post("/api/vehicles/update")
async def update_vehicle_position(position: VehiclePosition):
    """Transport joylashuvini yangilash"""
    if traffic_analyzer:
        traffic_analyzer.update_vehicle(
            position.vehicle_id,
            position.latitude,
            position.longitude,
            position.speed
        )
    
    return {"status": "updated", "vehicle_id": position.vehicle_id}


# ============ TRAFFIC ============
@app.get("/api/traffic/overview")
async def get_traffic_overview():
    """Shahar bo'yicha umumiy statistika"""
    if not traffic_analyzer:
        return {"error": "Traffic analyzer not initialized"}
    
    # Qurilmalardan ma'lumot olish
    if device_manager:
        for device in device_manager.get_all_devices():
            gps = device._create_gps_data()
            traffic_analyzer.update_vehicle(
                gps.vehicle_id, gps.latitude, gps.longitude, gps.speed
            )
    
    return traffic_analyzer.get_city_overview()


@app.get("/api/traffic/congestion")
async def get_congestion_map():
    """Tirbandlik xaritasi"""
    if not traffic_analyzer:
        return {"segments": []}
    
    states = traffic_analyzer.analyze_all()
    return {
        "segments": [state.to_dict() for state in states.values()],
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/traffic/hotspots")
async def get_hotspots(threshold: float = 70.0):
    """Tirbandlik nuqtalari"""
    if not traffic_analyzer:
        return {"hotspots": []}
    
    hotspots = traffic_analyzer.get_congestion_hotspots(threshold)
    return {
        "hotspots": [h.to_dict() for h in hotspots],
        "threshold": threshold,
        "count": len(hotspots)
    }


@app.post("/api/traffic/predict")
async def predict_congestion(request: PredictionRequest):
    """Tirbandlik bashorati"""
    if not congestion_predictor:
        return {"error": "Predictor not initialized"}
    
    result = congestion_predictor.predict(
        request.segment_id,
        request.horizon_minutes
    )
    return result.to_dict()


# ============ SIGNALS ============
@app.get("/api/signals")
async def get_all_signals():
    """Barcha svetoforlar"""
    if not signal_optimizer:
        return {"signals": []}
    
    return {
        "signals": [],
        "stats": signal_optimizer.get_statistics()
    }


@app.post("/api/signals/optimize")
async def optimize_signal(request: SignalOptimizeRequest):
    """Svetofor optimallashtirish"""
    if not signal_optimizer:
        return {"error": "Optimizer not initialized"}
    
    state = IntersectionState(
        intersection_id=request.intersection_id,
        north_queue=request.north_queue,
        south_queue=request.south_queue,
        east_queue=request.east_queue,
        west_queue=request.west_queue
    )
    
    # Q-Learning
    timing_ql = signal_optimizer.optimize(state)
    
    # Proportional
    timing_prop = signal_optimizer.optimize_proportional(state)
    
    return {
        "intersection_id": request.intersection_id,
        "q_learning": {
            "ns_green": timing_ql.ns_green,
            "ew_green": timing_ql.ew_green,
            "cycle_time": timing_ql.cycle_time
        },
        "proportional": {
            "ns_green": timing_prop.ns_green,
            "ew_green": timing_prop.ew_green,
            "cycle_time": timing_prop.cycle_time
        }
    }


# ============ EMERGENCY ============
@app.get("/api/emergency/status")
async def get_emergency_status():
    """Maxsus transport holati"""
    if not evp_controller:
        return {"error": "EVP not initialized"}
    
    return evp_controller.get_status()


@app.post("/api/emergency/activate")
async def activate_emergency(request: EmergencyActivation):
    """Favqulodda rejimni yoqish"""
    if not evp_controller:
        return {"error": "EVP not initialized"}
    
    commands = evp_controller.activate_emergency(
        request.vehicle_id,
        request.destination_lat,
        request.destination_lng
    )
    
    # WebSocket orqali xabar yuborish
    await broadcast({
        "type": "emergency_activated",
        "vehicle_id": request.vehicle_id,
        "commands_count": len(commands)
    })
    
    return {
        "status": "activated",
        "vehicle_id": request.vehicle_id,
        "commands": len(commands)
    }


@app.post("/api/emergency/deactivate/{vehicle_id}")
async def deactivate_emergency(vehicle_id: str):
    """Favqulodda rejimni o'chirish"""
    if not evp_controller:
        return {"error": "EVP not initialized"}
    
    evp_controller.deactivate_emergency(vehicle_id)
    
    return {"status": "deactivated", "vehicle_id": vehicle_id}


# ============ WEBSOCKET ============
@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time yangilanishlar"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            # Har sekundda yangilanish yuborish
            if device_manager:
                device_manager.update_all_devices(1.0)
            
            if traffic_analyzer:
                overview = traffic_analyzer.get_city_overview()
                await websocket.send_json({
                    "type": "traffic_update",
                    "data": overview
                })
            
            await asyncio.sleep(1)
    
    except WebSocketDisconnect:
        active_connections.remove(websocket)


async def broadcast(message: dict):
    """Barcha clientlarga xabar yuborish"""
    for connection in active_connections:
        try:
            await connection.send_json(message)
        except:
            pass


# ============ SIMULATION ============
@app.post("/api/simulation/step")
async def simulation_step():
    """Bitta simulyatsiya qadami"""
    if device_manager:
        data = device_manager.update_all_devices(1.0)
        return {
            "vehicles_updated": len(data),
            "timestamp": datetime.now().isoformat()
        }
    return {"error": "Simulation not running"}


@app.get("/api/simulation/stats")
async def simulation_stats():
    """Simulyatsiya statistikasi"""
    if device_manager:
        return device_manager.get_statistics()
    return {"error": "Simulation not running"}


# Main
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

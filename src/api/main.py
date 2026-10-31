"""
FastAPI Server - Traffic Management API (OSM Version)
"""

import asyncio
import random
from datetime import datetime
from typing import Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.traffic_analyzer import TrafficAnalyzer
from ai.congestion_predictor import CongestionPredictor
from services.evp_controller import EVPController
from simulation.city_simulator import CitySimulator
from ai.nlp_bot import NLPBot
from ai.recommender import RouteRecommender

app = FastAPI(
    title="Aqlli Shahar Trafik API (OSM)",
    description="GPS kuzatuv va aqlli svetofor boshqaruv tizimi",
    version="2.0.0",
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
WEB_DIR = PROJECT_ROOT / "web"
FRONT_DIST = PROJECT_ROOT / "frontend" / "dist"   # React landing (npm run build)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if (WEB_DIR / "css").exists():
    app.mount("/css", StaticFiles(directory=str(WEB_DIR / "css")), name="css")
if (WEB_DIR / "js").exists():
    app.mount("/js", StaticFiles(directory=str(WEB_DIR / "js")), name="js")
if (WEB_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(WEB_DIR / "assets")), name="assets")
for _sub in ("_app", "photos", "brand"):
    if (FRONT_DIST / _sub).exists():
        app.mount(f"/{_sub}", StaticFiles(directory=str(FRONT_DIST / _sub)), name=f"front-{_sub}")

traffic_analyzer: Optional[TrafficAnalyzer] = None
congestion_predictor: Optional[CongestionPredictor] = None
evp_controller: Optional[EVPController] = None
city_simulator: Optional[CitySimulator] = None
nlp_bot: Optional[NLPBot] = None
recommender: Optional[RouteRecommender] = None

active_connections: list[WebSocket] = []

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

class ChatMessage(BaseModel):
    message: str
    user_id: str = "driver_1"

@app.on_event("startup")
async def startup_event():
    global traffic_analyzer, congestion_predictor
    global evp_controller, city_simulator
    global nlp_bot, recommender

    print("🚀 Server ishga tushmoqda...")

    city_simulator = CitySimulator()
    city_simulator.setup()

    traffic_analyzer = city_simulator.traffic_analyzer
    congestion_predictor = city_simulator.congestion_predictor
    evp_controller = city_simulator.evp_controller
    
    try:
        nlp_bot = NLPBot(traffic_analyzer, evp_controller)
    except:
        pass
    
    try:
        recommender = RouteRecommender(traffic_analyzer)
    except:
        pass

    print("✅ Server tayyor")

@app.on_event("shutdown")
async def shutdown_event():
    print("🛑 Server to'xtatildi")

@app.get("/")
async def landing():
    landing_file = FRONT_DIST / "index.html"
    if not landing_file.exists():
        landing_file = WEB_DIR / "index.html"
    if landing_file.exists():
        return FileResponse(str(landing_file))
    return {"error": "Landing topilmadi", "expected_path": str(landing_file)}

@app.get("/dashboard")
async def root():
    index_file = WEB_DIR / "dashboard.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"error": "Dashboard topilmadi", "expected_path": str(index_file)}

@app.get("/gps")
async def get_gps_page():
    gps_file = WEB_DIR / "gps.html"
    if gps_file.exists():
        return FileResponse(str(gps_file))
    return {"error": "GPS sahifasi topilmadi"}

@app.get("/dashboard.html")
async def get_dashboard():
    return await root()

@app.get("/api/roads")
async def get_roads():
    if city_simulator and city_simulator.roads_data:
        return city_simulator.roads_data
    return {"error": "Yo'l ma'lumotlari mavjud emas"}

@app.get("/api/vehicles")
async def get_all_vehicles():
    if not city_simulator:
        return {"vehicles": [], "count": 0}
        
    dashboard_data = city_simulator.get_dashboard_data()
    return {
        "vehicles": dashboard_data.get("vehicles", []),
        "count": len(dashboard_data.get("vehicles", [])),
        "timestamp": datetime.now().isoformat(),
    }

@app.post("/api/vehicles/update")
async def update_vehicle_position(position: VehiclePosition):
    if traffic_analyzer:
        traffic_analyzer.update_vehicle(
            position.vehicle_id,
            position.latitude,
            position.longitude,
            position.speed,
        )
    return {"status": "updated", "vehicle_id": position.vehicle_id}

@app.get("/api/traffic/overview")
async def get_traffic_overview():
    if not traffic_analyzer:
        return {"error": "Tahlilchi ishga tushmagan"}
    return traffic_analyzer.get_city_overview()

@app.get("/api/traffic/hotspots")
async def get_hotspots(threshold: float = 30.0):
    if not traffic_analyzer:
        return {"hotspots": []}
    return {"hotspots": [h.to_dict() for h in traffic_analyzer.get_congestion_hotspots(threshold)]}

@app.get("/api/traffic/clusters")
async def get_clusters():
    if not traffic_analyzer:
        return {"clusters": []}
    try:
        return traffic_analyzer.get_clusters()
    except:
        return {"status": "error", "clusters": []}

@app.post("/api/emergency/activate")
async def activate_emergency(request: EmergencyActivation):
    if city_simulator and city_simulator.vsim:
        agents = list(city_simulator.vsim.agents.values())
        if agents:
            agent = random.choice(agents)
            agent.is_emergency = True
            agent.vehicle_type = "ambulance"
    return {"status": "emergency_activated"}

@app.post("/api/chat")
async def chat_with_bot(request: ChatMessage):
    if not nlp_bot:
        return {"response": "Kechirasiz, AI yordamchi hozir o'chiq."}
    reply = nlp_bot.process_message(request.message, request.user_id)
    return {"response": reply}

@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)

async def broadcast_state():
    while True:
        if city_simulator and city_simulator.is_running and active_connections:
            data = city_simulator.get_dashboard_data()
            disconnected = []
            for connection in active_connections:
                try:
                    await connection.send_json(data)
                except Exception:
                    disconnected.append(connection)
            for conn in disconnected:
                if conn in active_connections:
                    active_connections.remove(conn)
        await asyncio.sleep(2.0)

@app.on_event("startup")
async def start_background_tasks():
    if city_simulator:
        asyncio.create_task(city_simulator.run(duration_seconds=36000))
        asyncio.create_task(broadcast_state())

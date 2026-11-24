"""
FastAPI Server — OQIM trafik dashboard API (docs/dashboard-api.md kontrakti)

Simulyatsiya har 1 s da bir qadam yuradi; natija (Snapshot) WebSocket
orqali barcha mijozlarga yuboriladi va /api/state da qaytariladi.
"""

import asyncio
import json
import time
from contextlib import asynccontextmanager, suppress
from pathlib import Path
from typing import Literal, Optional, Tuple

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field

from src.simulation.city_simulator import TICK_S, CitySimulator

PROJECT_ROOT = Path(__file__).resolve().parents[2]
WEB_DIR = PROJECT_ROOT / "web"
FRONT_DIST = PROJECT_ROOT / "frontend" / "dist"   # React landing (npm run build)

simulator: Optional[CitySimulator] = None
connections: set[WebSocket] = set()


async def simulation_loop():
    """Har TICK_S soniyada: qadam → barcha WebSocket mijozlarga Snapshot."""
    next_tick = time.monotonic()
    while True:
        try:
            message = json.dumps(simulator.step(TICK_S), ensure_ascii=False)
            for ws in list(connections):
                try:
                    await ws.send_text(message)
                except Exception:
                    connections.discard(ws)
        except Exception as exc:          # bitta qadam xatosi serverni to'xtatmasin
            print(f"⚠️  Simulyatsiya qadamida xato: {exc!r}")
        next_tick += TICK_S
        await asyncio.sleep(max(0.0, next_tick - time.monotonic()))


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global simulator
    print("🚀 Simulyatsiya tayyorlanmoqda (Toshkent markazi)...")
    simulator = CitySimulator()
    print(f"✅ {len(simulator.intersections)} chorraha, {len(simulator.vehicles)} mashina")
    task = asyncio.create_task(simulation_loop())
    yield
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task
    print("🛑 Server to'xtatildi")


app = FastAPI(
    title="OQIM — Aqlli svetofor API",
    description="Toshkent markazi simulyatsiyasi: DQN svetoforlar, tez yordam, tirbandlik zonalari",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=2048)

if (WEB_DIR / "css").exists():
    app.mount("/css", StaticFiles(directory=str(WEB_DIR / "css")), name="css")
if (WEB_DIR / "js").exists():
    app.mount("/js", StaticFiles(directory=str(WEB_DIR / "js")), name="js")
if (WEB_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(WEB_DIR / "assets")), name="assets")
for _sub in ("_app", "photos", "brand", "dashboard"):   # /dashboard/... — React panel ma'lumotlari
    if (FRONT_DIST / _sub).exists():
        app.mount(f"/{_sub}", StaticFiles(directory=str(FRONT_DIST / _sub)), name=f"front-{_sub}")


# ──────────────────────────────────────────
# So'rov modellari
# ──────────────────────────────────────────
class VehiclePosition(BaseModel):
    vehicle_id: str
    latitude: float
    longitude: float
    speed: float          # km/soat
    heading: float = 0.0


class ModeRequest(BaseModel):
    mode: Literal["ai", "fixed"]


class EmergencyRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_: Tuple[float, float] = Field(alias="from")   # [lat, lng]
    to: Tuple[float, float]


# ──────────────────────────────────────────
# Sahifalar
# ──────────────────────────────────────────
@app.get("/")
async def landing():
    landing_file = FRONT_DIST / "index.html"
    if not landing_file.exists():
        landing_file = WEB_DIR / "index.html"
    if landing_file.exists():
        return FileResponse(str(landing_file))
    return {"error": "Landing topilmadi", "expected_path": str(landing_file)}


@app.get("/dashboard")
@app.get("/dashboard.html")
async def dashboard_page():
    index_file = FRONT_DIST / "dashboard.html"          # React panel (npm run build)
    if not index_file.exists():
        index_file = WEB_DIR / "dashboard.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"error": "Dashboard topilmadi", "expected_path": str(index_file)}


@app.get("/gps")
async def gps_page():
    gps_file = WEB_DIR / "gps.html"
    if gps_file.exists():
        return FileResponse(str(gps_file))
    return {"error": "GPS sahifasi topilmadi"}


# ──────────────────────────────────────────
# Kontrakt: REST
# ──────────────────────────────────────────
@app.get("/api/state")
async def get_state():
    return simulator.snapshot


@app.get("/api/roads")
async def get_roads():
    return simulator.geojson


@app.get("/api/intersections/{intersection_id}/history")
async def get_history(intersection_id: str, minutes: float = Query(10, gt=0, le=15)):
    if intersection_id not in simulator.by_id:
        raise HTTPException(404, f"Chorraha topilmadi: {intersection_id}")
    return {"points": simulator.history(intersection_id, minutes)}


@app.post("/api/mode")
async def set_mode(request: ModeRequest):
    simulator.set_mode(request.mode)
    return {"mode": simulator.mode}


@app.post("/api/emergency/route")
async def emergency_route(request: EmergencyRequest):
    try:
        return simulator.start_emergency(request.from_, request.to)
    except ValueError as exc:
        raise HTTPException(422, str(exc))


@app.delete("/api/emergency")
async def emergency_cancel():
    simulator.cancel_emergency()
    return {"ok": True}


@app.post("/api/vehicles/update")
async def update_vehicle_position(position: VehiclePosition):
    simulator.update_gps(position.vehicle_id, position.latitude, position.longitude,
                         position.speed, position.heading)
    return {"status": "updated", "vehicle_id": position.vehicle_id}


@app.get("/api/traffic/clusters")
async def get_clusters():
    """DBSCAN tirbandlik zonalari (Snapshot.zones bilan bir xil)."""
    return {"clusters": simulator.zones}


# ──────────────────────────────────────────
# Kontrakt: WebSocket
# ──────────────────────────────────────────
@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        await websocket.send_json(simulator.snapshot)
        connections.add(websocket)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        connections.discard(websocket)

"""
Shahar Trafik Simulyatori (OSM Asosida)

Real shahar yo'llarida transport oqimini modellashtiradi.
"""

import asyncio
import random
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.traffic_analyzer import TrafficAnalyzer
from ai.congestion_predictor import CongestionPredictor
from services.evp_controller import EVPController

from simulation.osm_loader import get_roads
from simulation.vehicle_agent import VehicleSimulator

@dataclass
class SimulationConfig:
    city_center: Tuple[float, float] = (52.3676, 4.9041)  # Amsterdam
    city_radius_km: float = 5.0

    vehicle_count: int = 50
    emergency_vehicle_count: int = 2

    time_step: float = 1.0
    simulation_speed: float = 1.0

    grid_size: int = 5
    cell_size_km: float = 0.8

    emergency_probability: float = 0.005

class CitySimulator:
    def __init__(self, config: SimulationConfig = None):
        self.config = config or SimulationConfig()
        self.traffic_analyzer = TrafficAnalyzer()
        self.congestion_predictor = CongestionPredictor()
        self.evp_controller = EVPController()

        self.roads_data = None
        self.vsim: Optional[VehicleSimulator] = None
        
        self.is_running = False
        self.current_time = datetime.now()
        self.elapsed_seconds = 0.0

        self.stats = {
            "total_steps": 0,
            "total_emergencies": 0,
            "average_congestion": 0.0,
            "average_speed": 0.0,
        }
        self.events: List[dict] = []

    def setup(self):
        print("🌍 Shahar simulyatsiyasi sozlanmoqda (OSM)...")
        self.roads_data = get_roads()
        if self.roads_data.get("center"):
            self.config.city_center = tuple(self.roads_data["center"])

        self.vsim = VehicleSimulator(self.roads_data, vehicle_count=self.config.vehicle_count)

        self.traffic_analyzer.create_grid_segments(
            center=self.config.city_center,
            grid_size=self.config.grid_size,
            cell_size_km=self.config.cell_size_km,
        )

        print("✅ Simulyatsiya tayyor!")

    def step(self) -> dict:
        self.elapsed_seconds += self.config.time_step
        self.current_time += timedelta(seconds=self.config.time_step)
        self.stats["total_steps"] += 1

        # 1. Mashinalarni harakatlantirish
        vehicles_data = self.vsim.step(self.config.time_step)

        # 2. AI tahlilchilarga ma'lumot berish
        for v in vehicles_data:
            self.traffic_analyzer.update_vehicle(
                v["id"], v["lat"], v["lng"], v["speed"]
            )
            
        # 3. Svetaforlarni yangilash
        self.vsim.update_signals(self.config.time_step)

        # 4. Statistika
        self._update_stats()

        return self._get_step_result()

    def _update_stats(self):
        overview = self.traffic_analyzer.get_city_overview()
        self.stats["average_congestion"] = overview.get("average_congestion", 0)
        self.stats["average_speed"] = overview.get("average_speed", 0)

    def _get_step_result(self) -> dict:
        vstats = self.vsim.get_stats() if self.vsim else {}
        return {
            "step": self.stats["total_steps"],
            "time": self.current_time.isoformat(),
            "elapsed_seconds": self.elapsed_seconds,
            "vehicles": vstats.get("total_vehicles", 0),
            "average_congestion": round(self.stats["average_congestion"], 1),
            "average_speed": round(self.stats["average_speed"], 1),
        }

    async def run(self, duration_seconds: int = 300, callback=None):
        self.is_running = True
        try:
            for _ in range(duration_seconds):
                if not self.is_running:
                    break
                result = self.step()
                if callback:
                    await callback(result)
                await asyncio.sleep(self.config.time_step / self.config.simulation_speed)
        finally:
            self.is_running = False

    def get_dashboard_data(self) -> dict:
        vehicles = []
        signals = []
        
        if self.vsim:
            for v in self.vsim.agents.values():
                vehicles.append({
                    "id": v.vehicle_id,
                    "lat": v.lat,
                    "lng": v.lng,
                    "speed": v.speed_kmh,
                    "type": v.vehicle_type,
                    "emergency": v.is_emergency,
                    "heading": v.heading,
                })
            
            for node_id, state in self.vsim.signal_states.items():
                pos = self.vsim.node_coords.get(node_id)
                if pos:
                    signals.append({
                        "id": node_id,
                        "lat": pos[0],
                        "lng": pos[1],
                        "phase": state,  # "green" | "red"
                    })

        congestion = self.traffic_analyzer.analyze_all()
        segments = [state.to_dict() for state in congestion.values()]

        return {
            "vehicles": vehicles,
            "signals": signals,
            "segments": segments,
            "stats": self.stats,
            "timestamp": self.current_time.isoformat(),
        }

if __name__ == "__main__":
    sim = CitySimulator()
    sim.setup()
    for _ in range(10):
        print(sim.step())

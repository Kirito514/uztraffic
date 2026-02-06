"""
Shahar Trafik Simulyatori

Virtual shahar trafigini to'liq simulyatsiya qilish
"""

import asyncio
import random
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
import sys
import os

# Path qo'shish
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from iot import DeviceManager, GPSDeviceFactory, GPSDevice, VehicleType
from models import TrafficAnalyzer, CongestionPredictor, SignalOptimizer, IntersectionState, SignalPhase
from emergency import EVPController, EmergencyVehicle, EmergencyType


@dataclass
class SimulationConfig:
    """Simulyatsiya sozlamalari"""
    # Shahar markazi
    city_center: Tuple[float, float] = (41.2995, 69.2401)  # Toshkent
    city_radius_km: float = 5.0
    
    # Transport
    vehicle_count: int = 500
    emergency_vehicle_count: int = 10
    
    # Vaqt
    time_step: float = 1.0  # sekund
    simulation_speed: float = 1.0  # 1x real time
    
    # Chorrahalar
    grid_size: int = 5
    cell_size_km: float = 0.5
    
    # Hodisalar
    accident_probability: float = 0.001
    emergency_probability: float = 0.005


class CitySimulator:
    """
    Shahar Simulyatori
    
    Transport vositalari, svetoforlar, tirbandlik va
    maxsus transportlarni simulyatsiya qiladi.
    """
    
    def __init__(self, config: SimulationConfig = None):
        """
        CitySimulator yaratish
        
        Args:
            config: Simulyatsiya sozlamalari
        """
        self.config = config or SimulationConfig()
        
        # Komponentlar
        self.device_manager = DeviceManager(use_mqtt=False)
        self.traffic_analyzer = TrafficAnalyzer()
        self.congestion_predictor = CongestionPredictor()
        self.signal_optimizer = SignalOptimizer()
        self.evp_controller = EVPController()
        
        # Svetofor controllerlari
        self.signal_controllers: Dict[str, dict] = {}
        
        # Simulyatsiya holati
        self.is_running = False
        self.current_time = datetime.now()
        self.elapsed_seconds = 0
        
        # Statistika
        self.stats = {
            "total_steps": 0,
            "total_accidents": 0,
            "total_emergencies": 0,
            "average_congestion": 0.0,
            "average_speed": 0.0
        }
        
        # Event log
        self.events: List[dict] = []
    
    def setup(self):
        """Simulyatsiyani sozlash"""
        print("🏙️ Shahar simulyatsiyasi sozlanmoqda...")
        
        # 1. Transport floti yaratish
        print(f"   🚗 {self.config.vehicle_count} ta transport yaratilmoqda...")
        self.device_manager.create_random_fleet(
            count=self.config.vehicle_count,
            center=self.config.city_center,
            radius_km=self.config.city_radius_km
        )
        
        # 2. Yo'l segmentlari
        print(f"   🛣️ Yo'l segmentlari yaratilmoqda...")
        self.traffic_analyzer.create_grid_segments(
            center=self.config.city_center,
            grid_size=self.config.grid_size,
            cell_size_km=self.config.cell_size_km
        )
        
        # 3. Chorrahalar va svetoforlar
        print(f"   🚦 Svetoforlar yaratilmoqda...")
        self._setup_intersections()
        
        # 4. EVP chorrahalar
        self._setup_evp()
        
        print("✅ Simulyatsiya tayyor!")
    
    def _setup_intersections(self):
        """Chorrahalar va svetoforlarni sozlash"""
        center = self.config.city_center
        cell_deg = self.config.cell_size_km / 111
        
        for i in range(self.config.grid_size):
            for j in range(self.config.grid_size):
                int_id = f"INT-{i:02d}-{j:02d}"
                lat = center[0] + (i - self.config.grid_size/2) * cell_deg
                lng = center[1] + (j - self.config.grid_size/2) * cell_deg
                
                self.signal_controllers[int_id] = {
                    "id": int_id,
                    "lat": lat,
                    "lng": lng,
                    "current_phase": SignalPhase.NORTH_SOUTH_GREEN,
                    "phase_timer": random.randint(0, 30),
                    "timing": {
                        "ns_green": 30,
                        "ew_green": 30,
                        "yellow": 3,
                        "all_red": 2
                    }
                }
    
    def _setup_evp(self):
        """EVP uchun chorrahalar"""
        for int_id, controller in self.signal_controllers.items():
            self.evp_controller.route_predictor.add_intersection(
                int_id, controller["lat"], controller["lng"]
            )
        
        # Bog'lanishlar
        for i in range(self.config.grid_size):
            for j in range(self.config.grid_size):
                current = f"INT-{i:02d}-{j:02d}"
                if i < self.config.grid_size - 1:
                    self.evp_controller.route_predictor.add_connection(
                        current, f"INT-{i+1:02d}-{j:02d}"
                    )
                if j < self.config.grid_size - 1:
                    self.evp_controller.route_predictor.add_connection(
                        current, f"INT-{i:02d}-{j+1:02d}"
                    )
    
    def step(self) -> dict:
        """
        Bitta simulyatsiya qadami
        
        Returns:
            Step natijasi
        """
        self.elapsed_seconds += self.config.time_step
        self.current_time += timedelta(seconds=self.config.time_step)
        self.stats["total_steps"] += 1
        
        # 1. Transport harakati
        gps_data_list = self.device_manager.update_all_devices(self.config.time_step)
        
        # 2. Trafik tahlili
        for gps in gps_data_list:
            self.traffic_analyzer.update_vehicle(
                gps.vehicle_id, gps.latitude, gps.longitude, gps.speed
            )
            self.congestion_predictor.add_observation(
                self._get_segment_for_location(gps.latitude, gps.longitude),
                self._calculate_local_congestion(gps.latitude, gps.longitude)
            )
        
        # 3. Svetofor yangilanishi
        self._update_signals()
        
        # 4. Hodisalar
        self._process_events()
        
        # 5. EVP buyruqlari
        due_commands = self.evp_controller.process_commands()
        for cmd in due_commands:
            self._log_event("evp_command", {
                "intersection": cmd.intersection_id,
                "direction": cmd.direction,
                "vehicle": cmd.vehicle_id
            })
        
        # 6. Statistika yangilash
        self._update_stats()
        
        return self._get_step_result()
    
    def _get_segment_for_location(self, lat: float, lng: float) -> str:
        """Joylashuv uchun segment ID"""
        center = self.config.city_center
        cell_deg = self.config.cell_size_km / 111
        
        i = int((lat - center[0]) / cell_deg + self.config.grid_size / 2)
        j = int((lng - center[1]) / cell_deg + self.config.grid_size / 2)
        
        i = max(0, min(self.config.grid_size - 1, i))
        j = max(0, min(self.config.grid_size - 1, j))
        
        return f"SEG-{i:02d}-{j:02d}"
    
    def _calculate_local_congestion(self, lat: float, lng: float) -> float:
        """Mahalliy tirbandlik darajasi"""
        # Yaqin atrofdagi mashinalar soni
        nearby = 0
        for device in self.device_manager.get_all_devices():
            dist = math.sqrt((device.latitude - lat)**2 + (device.longitude - lng)**2)
            if dist < 0.005:  # ~500m
                nearby += 1
        
        # Tirbandlik = mashinalar soni * koeffitsient
        congestion = min(100, nearby * 5)
        return congestion
    
    def _update_signals(self):
        """Svetoforlarni yangilash"""
        for int_id, controller in self.signal_controllers.items():
            controller["phase_timer"] -= self.config.time_step
            
            if controller["phase_timer"] <= 0:
                # Faza almashtirish
                current = controller["current_phase"]
                timing = controller["timing"]
                
                if current == SignalPhase.NORTH_SOUTH_GREEN:
                    controller["current_phase"] = SignalPhase.ALL_RED
                    controller["phase_timer"] = timing["all_red"]
                elif current == SignalPhase.ALL_RED:
                    # Navbatdagi yashil
                    controller["current_phase"] = SignalPhase.EAST_WEST_GREEN
                    controller["phase_timer"] = timing["ew_green"]
                else:
                    controller["current_phase"] = SignalPhase.ALL_RED
                    controller["phase_timer"] = timing["all_red"]
    
    def _process_events(self):
        """Tasodifiy hodisalar"""
        # Maxsus transport chaqiruvi
        if random.random() < self.config.emergency_probability:
            self._trigger_emergency()
    
    def _trigger_emergency(self):
        """Maxsus transport chaqiruvini simulyatsiya qilish"""
        emergency_devices = list(self.device_manager.emergency_devices.values())
        if not emergency_devices:
            return
        
        device = random.choice(emergency_devices)
        
        # Tasodifiy manzil
        dest_lat = self.config.city_center[0] + random.uniform(-0.02, 0.02)
        dest_lng = self.config.city_center[1] + random.uniform(-0.02, 0.02)
        
        # EVP yoqish
        commands = self.evp_controller.activate_emergency(
            device.vehicle_id, dest_lat, dest_lng
        )
        
        self.stats["total_emergencies"] += 1
        self._log_event("emergency", {
            "vehicle_id": device.vehicle_id,
            "type": device.vehicle_type.value,
            "destination": f"{dest_lat:.4f}, {dest_lng:.4f}",
            "commands": len(commands)
        })
    
    def _log_event(self, event_type: str, data: dict):
        """Hodisani qayd qilish"""
        self.events.append({
            "type": event_type,
            "time": self.current_time.isoformat(),
            "elapsed": self.elapsed_seconds,
            **data
        })
    
    def _update_stats(self):
        """Statistikani yangilash"""
        overview = self.traffic_analyzer.get_city_overview()
        self.stats["average_congestion"] = overview.get("average_congestion", 0)
        self.stats["average_speed"] = overview.get("average_speed", 0)
    
    def _get_step_result(self) -> dict:
        """Step natijasi"""
        return {
            "step": self.stats["total_steps"],
            "time": self.current_time.isoformat(),
            "elapsed_seconds": self.elapsed_seconds,
            "vehicles": len(self.device_manager.get_all_devices()),
            "average_congestion": round(self.stats["average_congestion"], 1),
            "average_speed": round(self.stats["average_speed"], 1),
            "emergencies": self.stats["total_emergencies"]
        }
    
    async def run(self, duration_seconds: int = 300, callback=None):
        """
        Asinxron simulyatsiyani ishga tushirish
        
        Args:
            duration_seconds: Davomiylik (sekund)
            callback: Har bir step uchun callback
        """
        self.is_running = True
        self.device_manager.start()
        
        print(f"🏁 Simulyatsiya boshlandi ({duration_seconds}s)")
        
        try:
            for _ in range(duration_seconds):
                if not self.is_running:
                    break
                
                result = self.step()
                
                if callback:
                    await callback(result)
                
                # Har 30 sekundda statistika
                if self.stats["total_steps"] % 30 == 0:
                    self._print_status()
                
                await asyncio.sleep(self.config.time_step / self.config.simulation_speed)
        
        finally:
            self.is_running = False
            self.device_manager.stop()
            self._print_final_report()
    
    def _print_status(self):
        """Joriy holat"""
        print(f"⏱️ {self.elapsed_seconds}s | "
              f"🚗 {self.stats['average_speed']:.1f} km/h | "
              f"📊 {self.stats['average_congestion']:.1f}% | "
              f"🚨 {self.stats['total_emergencies']}")
    
    def _print_final_report(self):
        """Yakuniy hisobot"""
        print("\n" + "="*50)
        print("📊 SIMULYATSIYA HISOBOTI")
        print("="*50)
        print(f"⏱️ Davomiylik: {self.elapsed_seconds} sekund")
        print(f"📈 Jami qadamlar: {self.stats['total_steps']}")
        print(f"🚗 O'rtacha tezlik: {self.stats['average_speed']:.1f} km/h")
        print(f"📊 O'rtacha tirbandlik: {self.stats['average_congestion']:.1f}%")
        print(f"🚨 Favqulodda chaqiruvlar: {self.stats['total_emergencies']}")
        print(f"📋 Jami hodisalar: {len(self.events)}")
        print("="*50)
    
    def get_dashboard_data(self) -> dict:
        """Dashboard uchun ma'lumot"""
        vehicles = []
        for device in self.device_manager.get_all_devices():
            gps = device._create_gps_data()
            vehicles.append({
                "id": gps.vehicle_id,
                "lat": gps.latitude,
                "lng": gps.longitude,
                "speed": gps.speed,
                "type": gps.vehicle_type.value,
                "emergency": gps.is_emergency
            })
        
        signals = []
        for int_id, controller in self.signal_controllers.items():
            signals.append({
                "id": int_id,
                "lat": controller["lat"],
                "lng": controller["lng"],
                "phase": controller["current_phase"].value,
                "timer": controller["phase_timer"]
            })
        
        congestion = self.traffic_analyzer.analyze_all()
        segments = [state.to_dict() for state in congestion.values()]
        
        return {
            "vehicles": vehicles,
            "signals": signals,
            "segments": segments,
            "stats": self.stats,
            "timestamp": self.current_time.isoformat()
        }


# Main
if __name__ == "__main__":
    config = SimulationConfig(
        vehicle_count=200,
        emergency_vehicle_count=5,
        grid_size=5
    )
    
    simulator = CitySimulator(config)
    simulator.setup()
    
    # Sinxron test (60 sekund)
    print("\n🏁 Simulyatsiya boshlandi...")
    
    for i in range(60):
        result = simulator.step()
        
        if i % 10 == 0:
            print(f"Step {i}: {result}")
    
    # Yakuniy ma'lumot
    data = simulator.get_dashboard_data()
    print(f"\n📊 Dashboard data: {len(data['vehicles'])} vehicles, {len(data['signals'])} signals")

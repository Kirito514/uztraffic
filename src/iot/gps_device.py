"""
GPS Datchik Simulyatsiyasi - Yo'l bo'yicha harakatlanish

Virtual GPS qurilma - har bir transport vositasi uchun
joylashuv va tezlik ma'lumotlarini generatsiya qiladi.

YANGILANGAN: Mashinalar yo'l tarmog'i bo'yicha harakatlanadi!
"""

import random
import math
import time
from datetime import datetime
from dataclasses import dataclass, field
from typing import Optional, List, Tuple
from enum import Enum

# Yo'l tarmog'i import
try:
    from .road_network import RoadNetwork, get_road_network, VehicleRoute
except ImportError:
    from road_network import RoadNetwork, get_road_network, VehicleRoute


class VehicleType(Enum):
    """Transport vositasi turlari"""
    CAR = "car"
    BUS = "bus"
    TRUCK = "truck"
    MOTORCYCLE = "motorcycle"
    AMBULANCE = "ambulance"
    FIRE_TRUCK = "fire_truck"
    POLICE = "police"


@dataclass
class GPSData:
    """GPS ma'lumotlari strukturasi"""
    vehicle_id: str
    vehicle_type: VehicleType
    latitude: float
    longitude: float
    speed: float  # km/h
    heading: float  # 0-360 daraja
    timestamp: datetime
    is_emergency: bool = False
    current_road: str = ""  # Hozirgi ko'cha nomi
    
    def to_dict(self) -> dict:
        return {
            "vehicle_id": self.vehicle_id,
            "vehicle_type": self.vehicle_type.value,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "speed": self.speed,
            "heading": self.heading,
            "timestamp": self.timestamp.isoformat(),
            "is_emergency": self.is_emergency,
            "current_road": self.current_road
        }


@dataclass
class GPSDevice:
    """
    Virtual GPS Datchik - Yo'l bo'yicha harakatlanish
    
    Har bir transport vositasida o'rnatilgan GPS datchikni simulyatsiya qiladi.
    YANGI: Mashinalar aniq yo'llar (ko'chalar) bo'yicha harakatlanadi!
    """
    vehicle_id: str
    vehicle_type: VehicleType
    latitude: float
    longitude: float
    speed: float = 0.0
    heading: float = 0.0
    is_active: bool = True
    is_emergency: bool = False
    
    # Harakat parametrlari
    target_speed: float = 50.0  # km/h
    max_speed: float = 80.0
    acceleration: float = 3.0  # km/h per second
    
    # GPS aniqlik (metr)
    accuracy: float = 2.5
    
    # YO'L NAVIGATSIYASI
    current_node: str = ""
    next_node: str = ""
    progress: float = 0.0  # 0-1 segment bo'yicha
    current_road: str = ""
    
    # Road network reference
    _road_network: Optional[RoadNetwork] = field(default=None, repr=False)
    
    def __post_init__(self):
        """Boshlang'ich sozlamalar"""
        if self.vehicle_type in [VehicleType.AMBULANCE, VehicleType.FIRE_TRUCK, VehicleType.POLICE]:
            self.is_emergency = True
            self.max_speed = 120.0
        
        # Yo'l tarmog'ini yuklash
        self._init_road_navigation()
    
    def _init_road_navigation(self):
        """Yo'l navigatsiyasini boshlash"""
        try:
            self._road_network = get_road_network()
            
            if self._road_network and len(self._road_network.nodes) > 0:
                # Eng yaqin tugunni topish
                self.current_node = self._find_nearest_node()
                self.next_node = self._road_network.get_next_node(self.current_node)
                
                if self.current_node and self.next_node:
                    # Joylashuvni yo'lga ko'chirish
                    pos = self._road_network.get_node_position(self.current_node)
                    self.latitude = pos[0]
                    self.longitude = pos[1]
                    
                    # Yo'nalishni hisoblash
                    self.heading = self._road_network.calculate_heading(
                        self.current_node, self.next_node
                    )
                    
                    # Yo'l nomini olish
                    segment = self._road_network.get_segment_between(
                        self.current_node, self.next_node
                    )
                    if segment:
                        self.current_road = segment.segment_id.split("-", 2)[-1]
        except Exception as e:
            print(f"⚠️ Yo'l navigatsiyasi xatosi: {e}")
    
    def _find_nearest_node(self) -> str:
        """Eng yaqin yo'l tugunini topish"""
        if not self._road_network:
            return ""
        
        min_dist = float('inf')
        nearest = ""
        
        for node_id, node in self._road_network.nodes.items():
            dist = math.sqrt(
                (self.latitude - node.latitude)**2 + 
                (self.longitude - node.longitude)**2
            )
            if dist < min_dist:
                min_dist = dist
                nearest = node_id
        
        return nearest
    
    def update_position(self, dt: float = 1.0) -> GPSData:
        """
        Joylashuvni yangilash - YO'L BO'YICHA
        
        Args:
            dt: Vaqt oralig'i (sekund)
        
        Returns:
            Yangi GPS ma'lumotlari
        """
        if not self.is_active:
            return self._create_gps_data()
        
        # Tezlikni maqsadga yaqinlashtirish
        if self.speed < self.target_speed:
            self.speed = min(self.speed + self.acceleration * dt, self.target_speed)
        elif self.speed > self.target_speed:
            self.speed = max(self.speed - self.acceleration * dt, self.target_speed)
        
        # YO'L BO'YICHA HARAKAT
        if self._road_network and self.current_node and self.next_node:
            self._move_along_road(dt)
        else:
            # Fallback: tasodifiy harakat (agar yo'l yo'q bo'lsa)
            self._move_random(dt)
        
        return self._create_gps_data()
    
    def _move_along_road(self, dt: float):
        """Yo'l bo'yicha harakat"""
        # Segment ma'lumotini olish
        segment = self._road_network.get_segment_between(
            self.current_node, self.next_node
        )
        
        if not segment:
            # Keyingi tugunga o'tish
            self._switch_to_next_segment()
            return
        
        # Harakat masofasi
        distance_km = (self.speed * dt) / 3600
        segment_length = segment.distance_km
        
        # Progress yangilash
        if segment_length > 0:
            self.progress += distance_km / segment_length
        
        # Segment oxiriga yetdikmi?
        if self.progress >= 1.0:
            self.progress = 0.0
            self._switch_to_next_segment()
        
        # Interpolatsiya - yangi joylashuv
        pos = self._road_network.interpolate_position(
            self.current_node, self.next_node, self.progress
        )
        
        # GPS shovqin qo'shish
        noise_lat = random.gauss(0, self.accuracy / 111000)
        noise_lng = random.gauss(0, self.accuracy / 111000)
        
        self.latitude = pos[0] + noise_lat
        self.longitude = pos[1] + noise_lng
        
        # Yo'nalish
        self.heading = self._road_network.calculate_heading(
            self.current_node, self.next_node
        )
        
        # Yo'l nomi
        self.current_road = segment.segment_id.split("-", 2)[-1] if segment else ""
    
    def _switch_to_next_segment(self):
        """Keyingi yo'l segmentiga o'tish"""
        if not self._road_network:
            return
        
        old_node = self.current_node
        self.current_node = self.next_node
        
        # Keyingi tugunni tanlash (orqaga qaytmaslik uchun)
        self.next_node = self._road_network.get_next_node(
            self.current_node, exclude=old_node
        )
        
        # Agar chiqish yo'q bo'lsa - tasodifiy tanlash
        if not self.next_node:
            self.next_node = self._road_network.get_next_node(self.current_node)
        
        # Chorrahada qisqa to'xtash (svetofor simulyatsiyasi)
        node = self._road_network.nodes.get(self.current_node)
        if node and node.is_intersection:
            # Tasodifiy kutish (0-3 sekund)
            if random.random() < 0.3:  # 30% ehtimol
                self.speed = 0
                self.target_speed = random.uniform(30, 60)
    
    def _move_random(self, dt: float):
        """Tasodifiy harakat (fallback)"""
        # Yo'nalishni tasodifiy o'zgartirish
        self.heading += random.uniform(-5, 5)
        self.heading = self.heading % 360
        
        # Masofani hisoblash
        distance_km = (self.speed * dt) / 3600
        
        # Koordinatlarni yangilash
        noise_lat = random.gauss(0, self.accuracy / 111000)
        noise_lng = random.gauss(0, self.accuracy / 111000)
        
        heading_rad = math.radians(self.heading)
        self.latitude += (distance_km / 111) * math.cos(heading_rad) + noise_lat
        self.longitude += (distance_km / (111 * math.cos(math.radians(self.latitude)))) * math.sin(heading_rad) + noise_lng
    
    def _create_gps_data(self) -> GPSData:
        """GPS ma'lumotlari strukturasini yaratish"""
        return GPSData(
            vehicle_id=self.vehicle_id,
            vehicle_type=self.vehicle_type,
            latitude=self.latitude,
            longitude=self.longitude,
            speed=self.speed,
            heading=self.heading,
            timestamp=datetime.now(),
            is_emergency=self.is_emergency,
            current_road=self.current_road
        )
    
    def stop(self):
        """Mashinani to'xtatish"""
        self.target_speed = 0.0
    
    def start(self, speed: float = 50.0):
        """Mashinani harakatga keltirish"""
        self.target_speed = min(speed, self.max_speed)
    
    def activate_emergency(self):
        """Favqulodda rejimni yoqish"""
        if self.is_emergency:
            self.max_speed = 120.0
            self.target_speed = 80.0
    
    def set_route_heading(self, target_lat: float, target_lng: float):
        """Maqsad nuqtaga yo'nalishni hisoblash"""
        dlat = target_lat - self.latitude
        dlng = target_lng - self.longitude
        
        heading_rad = math.atan2(dlng, dlat)
        self.heading = math.degrees(heading_rad) % 360


class GPSDeviceFactory:
    """GPS qurilmalar fabrikasi"""
    
    # Toshkent markazi koordinatalari
    DEFAULT_CENTER = (41.2995, 69.2401)
    
    @classmethod
    def create_random_vehicle(cls, vehicle_id: str, 
                               center: tuple = None,
                               radius_km: float = 5.0) -> GPSDevice:
        """
        Tasodifiy joylashuvda transport yaratish
        (Yo'l tarmog'iga ulangan!)
        """
        if center is None:
            center = cls.DEFAULT_CENTER
        
        # Tasodifiy transport turi (90% oddiy, 10% maxsus)
        if random.random() < 0.9:
            vehicle_type = random.choice([VehicleType.CAR, VehicleType.BUS, VehicleType.TRUCK])
        else:
            vehicle_type = random.choice([VehicleType.AMBULANCE, VehicleType.FIRE_TRUCK, VehicleType.POLICE])
        
        # Yo'l tarmog'idan tasodifiy tugun
        network = get_road_network()
        if network and len(network.nodes) > 0:
            start_node = network.get_random_node()
            pos = network.get_node_position(start_node)
            lat, lng = pos
        else:
            # Fallback
            angle = random.uniform(0, 2 * math.pi)
            distance = random.uniform(0, radius_km)
            lat = center[0] + (distance / 111) * math.cos(angle)
            lng = center[1] + (distance / (111 * math.cos(math.radians(center[0])))) * math.sin(angle)
        
        return GPSDevice(
            vehicle_id=vehicle_id,
            vehicle_type=vehicle_type,
            latitude=lat,
            longitude=lng,
            speed=random.uniform(20, 60),
            heading=random.uniform(0, 360)
        )
    
    @classmethod
    def create_emergency_vehicle(cls, vehicle_id: str,
                                  vehicle_type: VehicleType,
                                  latitude: float,
                                  longitude: float) -> GPSDevice:
        """Maxsus transport vositasini yaratish"""
        return GPSDevice(
            vehicle_id=vehicle_id,
            vehicle_type=vehicle_type,
            latitude=latitude,
            longitude=longitude,
            speed=0,
            heading=0,
            is_emergency=True
        )


# Test uchun
if __name__ == "__main__":
    print("🛣️  Yo'l tarmog'i bo'yicha GPS test\n")
    
    # Test GPS qurilma
    device = GPSDeviceFactory.create_random_vehicle("TEST-001")
    
    print(f"🚗 Mashina yaratildi: {device.vehicle_id}")
    print(f"   Turi: {device.vehicle_type.value}")
    print(f"   Boshlang'ich tugun: {device.current_node}")
    print(f"   Keyingi tugun: {device.next_node}")
    print(f"   Joylashuv: {device.latitude:.6f}, {device.longitude:.6f}")
    
    # 10 sekund simulyatsiya
    print("\n📍 Harakat simulyatsiyasi:")
    for i in range(10):
        gps_data = device.update_position(1.0)
        print(f"   [{i+1}s] {device.current_node} → {device.next_node} | "
              f"{gps_data.latitude:.5f}, {gps_data.longitude:.5f} | "
              f"{gps_data.speed:.0f} km/h | {device.current_road}")

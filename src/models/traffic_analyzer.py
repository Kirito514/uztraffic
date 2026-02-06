"""
Trafik Tahlilchisi

GPS ma'lumotlari asosida real vaqtda trafik holatini tahlil qilish
"""

import math
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
from collections import defaultdict

import numpy as np


@dataclass
class RoadSegment:
    """Yo'l segmenti"""
    segment_id: str
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    speed_limit: float = 60.0  # km/h
    lanes: int = 2
    
    @property
    def length_km(self) -> float:
        """Segment uzunligi (km)"""
        dlat = self.end_lat - self.start_lat
        dlng = self.end_lng - self.start_lng
        return math.sqrt(dlat**2 + dlng**2) * 111  # taxminan
    
    def contains_point(self, lat: float, lng: float, tolerance: float = 0.001) -> bool:
        """Nuqta segment ichida yoki yo'qligini tekshirish"""
        min_lat = min(self.start_lat, self.end_lat) - tolerance
        max_lat = max(self.start_lat, self.end_lat) + tolerance
        min_lng = min(self.start_lng, self.end_lng) - tolerance
        max_lng = max(self.start_lng, self.end_lng) + tolerance
        
        return min_lat <= lat <= max_lat and min_lng <= lng <= max_lng


@dataclass
class TrafficState:
    """Trafik holati"""
    segment_id: str
    vehicle_count: int
    average_speed: float
    congestion_level: float  # 0-100%
    density: float  # vehicles per km
    flow_rate: float  # vehicles per hour
    timestamp: datetime
    
    @property
    def status(self) -> str:
        """Holat matni"""
        if self.congestion_level < 25:
            return "FREE"  # Erkin
        elif self.congestion_level < 50:
            return "LIGHT"  # Yengil
        elif self.congestion_level < 75:
            return "MODERATE"  # O'rtacha
        else:
            return "HEAVY"  # Og'ir
    
    @property
    def color(self) -> str:
        """Xarita rangi"""
        if self.congestion_level < 25:
            return "#00FF00"  # Yashil
        elif self.congestion_level < 50:
            return "#FFFF00"  # Sariq
        elif self.congestion_level < 75:
            return "#FFA500"  # To'q sariq
        else:
            return "#FF0000"  # Qizil
    
    def to_dict(self) -> dict:
        return {
            "segment_id": self.segment_id,
            "vehicle_count": self.vehicle_count,
            "average_speed": round(self.average_speed, 1),
            "congestion_level": round(self.congestion_level, 1),
            "density": round(self.density, 2),
            "flow_rate": round(self.flow_rate, 1),
            "status": self.status,
            "color": self.color,
            "timestamp": self.timestamp.isoformat()
        }


class TrafficAnalyzer:
    """
    Trafik Tahlilchisi
    
    GPS ma'lumotlari asosida yo'l segmentlarining trafik holatini
    real vaqtda tahlil qiladi.
    """
    
    def __init__(self):
        """TrafficAnalyzer yaratish"""
        self.segments: Dict[str, RoadSegment] = {}
        self.vehicle_positions: Dict[str, dict] = {}  # vehicle_id -> {lat, lng, speed, timestamp}
        self.segment_vehicles: Dict[str, List[str]] = defaultdict(list)  # segment_id -> [vehicle_ids]
        self.history: Dict[str, List[TrafficState]] = defaultdict(list)
        
        # Konfiguratsiya
        self.history_window = timedelta(minutes=15)
        self.stale_threshold = timedelta(seconds=30)
    
    def add_segment(self, segment: RoadSegment):
        """Yo'l segmenti qo'shish"""
        self.segments[segment.segment_id] = segment
    
    def create_grid_segments(self, 
                             center: Tuple[float, float],
                             grid_size: int = 5,
                             cell_size_km: float = 0.5):
        """
        Grid formatida yo'l segmentlari yaratish
        
        Args:
            center: Markaz koordinatalari
            grid_size: Grid o'lchami (NxN)
            cell_size_km: Har bir katakcha o'lchami (km)
        """
        cell_deg = cell_size_km / 111  # km -> daraja
        
        for i in range(grid_size):
            for j in range(grid_size):
                segment_id = f"SEG-{i:02d}-{j:02d}"
                
                start_lat = center[0] + (i - grid_size/2) * cell_deg
                start_lng = center[1] + (j - grid_size/2) * cell_deg
                
                segment = RoadSegment(
                    segment_id=segment_id,
                    start_lat=start_lat,
                    start_lng=start_lng,
                    end_lat=start_lat + cell_deg,
                    end_lng=start_lng + cell_deg
                )
                self.add_segment(segment)
        
        print(f"✅ {len(self.segments)} ta yo'l segmenti yaratildi")
    
    def update_vehicle(self, vehicle_id: str, lat: float, lng: float, 
                       speed: float, timestamp: datetime = None):
        """
        Transport vositasi ma'lumotlarini yangilash
        
        Args:
            vehicle_id: Transport ID
            lat: Kenglik
            lng: Uzunlik
            speed: Tezlik (km/h)
            timestamp: Vaqt tamg'asi
        """
        if timestamp is None:
            timestamp = datetime.now()
        
        # Eski segment dan olib tashlash
        if vehicle_id in self.vehicle_positions:
            for seg_id, vehicles in self.segment_vehicles.items():
                if vehicle_id in vehicles:
                    vehicles.remove(vehicle_id)
                    break
        
        # Yangi ma'lumotlarni saqlash
        self.vehicle_positions[vehicle_id] = {
            "lat": lat,
            "lng": lng,
            "speed": speed,
            "timestamp": timestamp
        }
        
        # Tegishli segmentni topish
        for segment_id, segment in self.segments.items():
            if segment.contains_point(lat, lng):
                self.segment_vehicles[segment_id].append(vehicle_id)
                break
    
    def remove_stale_vehicles(self):
        """Eskirgan ma'lumotlarni tozalash"""
        now = datetime.now()
        stale_ids = []
        
        for vehicle_id, data in self.vehicle_positions.items():
            if now - data["timestamp"] > self.stale_threshold:
                stale_ids.append(vehicle_id)
        
        for vehicle_id in stale_ids:
            del self.vehicle_positions[vehicle_id]
            for vehicles in self.segment_vehicles.values():
                if vehicle_id in vehicles:
                    vehicles.remove(vehicle_id)
    
    def analyze_segment(self, segment_id: str) -> Optional[TrafficState]:
        """
        Bitta segmentni tahlil qilish
        
        Args:
            segment_id: Segment ID
        
        Returns:
            Trafik holati
        """
        segment = self.segments.get(segment_id)
        if not segment:
            return None
        
        vehicle_ids = self.segment_vehicles.get(segment_id, [])
        vehicle_count = len(vehicle_ids)
        
        if vehicle_count == 0:
            return TrafficState(
                segment_id=segment_id,
                vehicle_count=0,
                average_speed=segment.speed_limit,
                congestion_level=0.0,
                density=0.0,
                flow_rate=0.0,
                timestamp=datetime.now()
            )
        
        # O'rtacha tezlik hisoblash
        speeds = []
        for vid in vehicle_ids:
            if vid in self.vehicle_positions:
                speeds.append(self.vehicle_positions[vid]["speed"])
        
        avg_speed = np.mean(speeds) if speeds else segment.speed_limit
        
        # Tirbandlik darajasi
        congestion = (1 - avg_speed / segment.speed_limit) * 100
        congestion = max(0, min(100, congestion))
        
        # Zichlik (vehicles/km)
        density = vehicle_count / max(segment.length_km, 0.1)
        
        # Oqim tezligi (vehicles/hour)
        flow_rate = density * avg_speed
        
        state = TrafficState(
            segment_id=segment_id,
            vehicle_count=vehicle_count,
            average_speed=avg_speed,
            congestion_level=congestion,
            density=density,
            flow_rate=flow_rate,
            timestamp=datetime.now()
        )
        
        # Tarixga qo'shish
        self.history[segment_id].append(state)
        self._cleanup_history(segment_id)
        
        return state
    
    def analyze_all(self) -> Dict[str, TrafficState]:
        """
        Barcha segmentlarni tahlil qilish
        
        Returns:
            {segment_id: TrafficState} lug'ati
        """
        self.remove_stale_vehicles()
        
        results = {}
        for segment_id in self.segments:
            state = self.analyze_segment(segment_id)
            if state:
                results[segment_id] = state
        
        return results
    
    def get_city_overview(self) -> dict:
        """Shahar bo'yicha umumiy statistika"""
        states = self.analyze_all()
        
        if not states:
            return {
                "total_vehicles": 0,
                "average_speed": 0,
                "average_congestion": 0,
                "segments_by_status": {}
            }
        
        total_vehicles = sum(s.vehicle_count for s in states.values())
        avg_speed = np.mean([s.average_speed for s in states.values()])
        avg_congestion = np.mean([s.congestion_level for s in states.values()])
        
        status_counts = defaultdict(int)
        for state in states.values():
            status_counts[state.status] += 1
        
        return {
            "total_vehicles": total_vehicles,
            "average_speed": round(avg_speed, 1),
            "average_congestion": round(avg_congestion, 1),
            "segments_by_status": dict(status_counts),
            "timestamp": datetime.now().isoformat()
        }
    
    def get_congestion_hotspots(self, threshold: float = 70.0) -> List[TrafficState]:
        """
        Tirbandlik nuqtalarini topish
        
        Args:
            threshold: Minimal tirbandlik darajasi
        
        Returns:
            Tirbandlik yuqori bo'lgan segmentlar
        """
        states = self.analyze_all()
        hotspots = [s for s in states.values() if s.congestion_level >= threshold]
        return sorted(hotspots, key=lambda s: s.congestion_level, reverse=True)
    
    def _cleanup_history(self, segment_id: str):
        """Eski tarix yozuvlarini tozalash"""
        cutoff = datetime.now() - self.history_window
        self.history[segment_id] = [
            s for s in self.history[segment_id] 
            if s.timestamp > cutoff
        ]


# Test uchun
if __name__ == "__main__":
    analyzer = TrafficAnalyzer()
    
    # Grid yaratish
    analyzer.create_grid_segments(
        center=(41.2995, 69.2401),
        grid_size=5,
        cell_size_km=0.5
    )
    
    # Test ma'lumotlari
    import random
    for i in range(50):
        lat = 41.2995 + random.uniform(-0.02, 0.02)
        lng = 69.2401 + random.uniform(-0.02, 0.02)
        speed = random.uniform(20, 60)
        
        analyzer.update_vehicle(f"VH-{i:03d}", lat, lng, speed)
    
    # Tahlil
    overview = analyzer.get_city_overview()
    print("\n📊 Shahar Statistikasi:")
    for key, value in overview.items():
        print(f"   {key}: {value}")
    
    # Tirbandlik nuqtalari
    hotspots = analyzer.get_congestion_hotspots(threshold=50)
    if hotspots:
        print(f"\n🔴 Tirbandlik nuqtalari: {len(hotspots)} ta")
        for spot in hotspots[:3]:
            print(f"   {spot.segment_id}: {spot.congestion_level:.1f}%")

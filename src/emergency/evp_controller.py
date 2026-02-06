"""
Maxsus Transport Ustuvorligi (Emergency Vehicle Preemption)

Tez yordam, o't o'chirish va politsiya mashinalari uchun
yo'lni oldindan ochish tizimi
"""

import math
import heapq
from typing import Dict, List, Tuple, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum


class EmergencyType(Enum):
    """Maxsus transport turlari"""
    AMBULANCE = "ambulance"
    FIRE_TRUCK = "fire_truck"
    POLICE = "police"
    VIP = "vip"


@dataclass
class EmergencyVehicle:
    """Maxsus transport vositasi"""
    vehicle_id: str
    vehicle_type: EmergencyType
    latitude: float
    longitude: float
    speed: float = 0.0
    heading: float = 0.0
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    is_active: bool = False
    priority: int = 1
    
    def __post_init__(self):
        # Ustuvorlikni aniqlash
        if self.vehicle_type in [EmergencyType.AMBULANCE, EmergencyType.FIRE_TRUCK]:
            self.priority = 1  # Eng yuqori
        elif self.vehicle_type == EmergencyType.POLICE:
            self.priority = 2
        else:
            self.priority = 3


@dataclass
class RoutePoint:
    """Marshrut nuqtasi"""
    intersection_id: str
    latitude: float
    longitude: float
    eta: datetime  # Estimated Time of Arrival
    distance_from_start: float  # km


@dataclass
class PreemptionCommand:
    """Svetofor buyrug'i"""
    intersection_id: str
    command_type: str  # "preempt", "restore"
    direction: str  # "north", "south", "east", "west"
    execute_at: datetime
    priority: int
    vehicle_id: str


class RoutePredictor:
    """
    Marshrut Bashoratchisi
    
    Maxsus transport vositasi uchun optimal marshrut va
    har bir chorrahaga yetib kelish vaqtini hisoblaydi.
    """
    
    def __init__(self):
        """RoutePredictor yaratish"""
        # Chorrahalar: {id: (lat, lng)}
        self.intersections: Dict[str, Tuple[float, float]] = {}
        
        # Bog'lanishlar: {id: [(neighbor_id, distance), ...]}
        self.connections: Dict[str, List[Tuple[str, float]]] = {}
        
        # O'rtacha tezliklar (km/h)
        self.emergency_speeds = {
            EmergencyType.AMBULANCE: 70,
            EmergencyType.FIRE_TRUCK: 50,
            EmergencyType.POLICE: 80,
            EmergencyType.VIP: 60
        }
    
    def add_intersection(self, intersection_id: str, lat: float, lng: float):
        """Chorraha qo'shish"""
        self.intersections[intersection_id] = (lat, lng)
    
    def add_connection(self, from_id: str, to_id: str):
        """Bog'lanish qo'shish"""
        if from_id not in self.connections:
            self.connections[from_id] = []
        if to_id not in self.connections:
            self.connections[to_id] = []
        
        # Masofani hisoblash
        lat1, lng1 = self.intersections[from_id]
        lat2, lng2 = self.intersections[to_id]
        distance = self._haversine_distance(lat1, lng1, lat2, lng2)
        
        self.connections[from_id].append((to_id, distance))
        self.connections[to_id].append((from_id, distance))
    
    def _haversine_distance(self, lat1: float, lng1: float, 
                            lat2: float, lng2: float) -> float:
        """Ikki nuqta orasidagi masofa (km)"""
        R = 6371  # Yer radiusi (km)
        
        lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    def find_nearest_intersection(self, lat: float, lng: float) -> Optional[str]:
        """Eng yaqin chorrahani topish"""
        if not self.intersections:
            return None
        
        min_dist = float('inf')
        nearest = None
        
        for int_id, (int_lat, int_lng) in self.intersections.items():
            dist = self._haversine_distance(lat, lng, int_lat, int_lng)
            if dist < min_dist:
                min_dist = dist
                nearest = int_id
        
        return nearest
    
    def find_route(self, start_lat: float, start_lng: float,
                   end_lat: float, end_lng: float) -> List[str]:
        """
        A* algoritmi bilan optimal marshrut topish
        
        Args:
            start_lat, start_lng: Boshlang'ich nuqta
            end_lat, end_lng: Maqsad nuqta
        
        Returns:
            Chorrahalar ID ro'yxati
        """
        start_id = self.find_nearest_intersection(start_lat, start_lng)
        end_id = self.find_nearest_intersection(end_lat, end_lng)
        
        if not start_id or not end_id:
            return []
        
        if start_id == end_id:
            return [start_id]
        
        # A* algorithm
        def heuristic(node_id):
            lat, lng = self.intersections[node_id]
            return self._haversine_distance(lat, lng, end_lat, end_lng)
        
        open_set = [(0, start_id)]
        came_from = {}
        g_score = {start_id: 0}
        f_score = {start_id: heuristic(start_id)}
        
        while open_set:
            _, current = heapq.heappop(open_set)
            
            if current == end_id:
                # Marshrut rekonstruksiyasi
                path = [current]
                while current in came_from:
                    current = came_from[current]
                    path.append(current)
                return list(reversed(path))
            
            for neighbor, distance in self.connections.get(current, []):
                tentative_g = g_score[current] + distance
                
                if neighbor not in g_score or tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    f = tentative_g + heuristic(neighbor)
                    f_score[neighbor] = f
                    heapq.heappush(open_set, (f, neighbor))
        
        return []  # Marshrut topilmadi
    
    def predict_route_with_eta(self, vehicle: EmergencyVehicle) -> List[RoutePoint]:
        """
        Marshrut va ETA hisoblash
        
        Args:
            vehicle: Maxsus transport
        
        Returns:
            RoutePoint ro'yxati
        """
        if not vehicle.destination_lat or not vehicle.destination_lng:
            return []
        
        route_ids = self.find_route(
            vehicle.latitude, vehicle.longitude,
            vehicle.destination_lat, vehicle.destination_lng
        )
        
        if not route_ids:
            return []
        
        speed = self.emergency_speeds.get(vehicle.vehicle_type, 60)
        current_time = datetime.now()
        total_distance = 0.0
        
        route_points = []
        prev_lat, prev_lng = vehicle.latitude, vehicle.longitude
        
        for int_id in route_ids:
            int_lat, int_lng = self.intersections[int_id]
            
            # Masofa va vaqt
            segment_distance = self._haversine_distance(prev_lat, prev_lng, int_lat, int_lng)
            total_distance += segment_distance
            travel_time = timedelta(hours=total_distance / speed)
            
            route_points.append(RoutePoint(
                intersection_id=int_id,
                latitude=int_lat,
                longitude=int_lng,
                eta=current_time + travel_time,
                distance_from_start=total_distance
            ))
            
            prev_lat, prev_lng = int_lat, int_lng
        
        return route_points


class EVPController:
    """
    Emergency Vehicle Preemption Controller
    
    Maxsus transport vositalari uchun svetoforlarni
    oldindan boshqarish
    """
    
    def __init__(self, preemption_lead_time: int = 30):
        """
        EVPController yaratish
        
        Args:
            preemption_lead_time: Svetoforni necha sekund oldin o'zgartirish
        """
        self.lead_time = preemption_lead_time
        self.route_predictor = RoutePredictor()
        
        # Ro'yxatga olingan maxsus transportlar
        self.active_vehicles: Dict[str, EmergencyVehicle] = {}
        
        # Rejalashtirilgan buyruqlar
        self.pending_commands: List[PreemptionCommand] = []
        
        # Callback funksiyalar
        self.on_preempt: Optional[Callable] = None
        self.on_restore: Optional[Callable] = None
        self.on_notify: Optional[Callable] = None
    
    def register_vehicle(self, vehicle: EmergencyVehicle):
        """Maxsus transportni ro'yxatga olish"""
        self.active_vehicles[vehicle.vehicle_id] = vehicle
    
    def activate_emergency(self, vehicle_id: str,
                           destination_lat: float,
                           destination_lng: float) -> List[PreemptionCommand]:
        """
        Favqulodda rejimni yoqish
        
        Args:
            vehicle_id: Transport ID
            destination_lat, destination_lng: Maqsad
        
        Returns:
            Svetofor buyruqlari
        """
        vehicle = self.active_vehicles.get(vehicle_id)
        if not vehicle:
            return []
        
        # Maqsadni yangilash
        vehicle.destination_lat = destination_lat
        vehicle.destination_lng = destination_lng
        vehicle.is_active = True
        
        # Marshrut va ETA hisoblash
        route = self.route_predictor.predict_route_with_eta(vehicle)
        
        if not route:
            return []
        
        # Svetofor buyruqlarini yaratish
        commands = []
        for point in route:
            preempt_time = point.eta - timedelta(seconds=self.lead_time)
            
            command = PreemptionCommand(
                intersection_id=point.intersection_id,
                command_type="preempt",
                direction=self._calculate_approach_direction(vehicle, point),
                execute_at=preempt_time,
                priority=vehicle.priority,
                vehicle_id=vehicle_id
            )
            commands.append(command)
            self.pending_commands.append(command)
        
        print(f"🚨 EVP Activated: {vehicle_id}")
        print(f"   Route: {len(route)} intersections")
        print(f"   Commands: {len(commands)}")
        
        return commands
    
    def _calculate_approach_direction(self, vehicle: EmergencyVehicle,
                                       point: RoutePoint) -> str:
        """Yaqinlashish yo'nalishini hisoblash"""
        dlat = point.latitude - vehicle.latitude
        dlng = point.longitude - vehicle.longitude
        
        if abs(dlat) > abs(dlng):
            return "north" if dlat > 0 else "south"
        else:
            return "east" if dlng > 0 else "west"
    
    def deactivate_emergency(self, vehicle_id: str):
        """Favqulodda rejimni o'chirish"""
        vehicle = self.active_vehicles.get(vehicle_id)
        if vehicle:
            vehicle.is_active = False
            vehicle.destination_lat = None
            vehicle.destination_lng = None
        
        # Tegishli buyruqlarni bekor qilish
        self.pending_commands = [
            cmd for cmd in self.pending_commands 
            if cmd.vehicle_id != vehicle_id
        ]
        
        print(f"✅ EVP Deactivated: {vehicle_id}")
    
    def process_commands(self) -> List[PreemptionCommand]:
        """
        Buyruqlarni qayta ishlash
        
        Vaqti kelgan buyruqlarni qaytarish
        """
        now = datetime.now()
        due_commands = []
        remaining = []
        
        for cmd in self.pending_commands:
            if cmd.execute_at <= now:
                due_commands.append(cmd)
                
                # Callback chaqirish
                if cmd.command_type == "preempt" and self.on_preempt:
                    self.on_preempt(cmd)
            else:
                remaining.append(cmd)
        
        self.pending_commands = remaining
        return due_commands
    
    def get_nearby_vehicles_to_notify(self, emergency_vehicle: EmergencyVehicle,
                                       all_vehicles: List[dict],
                                       radius_km: float = 0.5) -> List[str]:
        """
        Ogohlantirish kerak bo'lgan transport vositalarini topish
        
        Args:
            emergency_vehicle: Maxsus transport
            all_vehicles: Barcha transport ro'yxati
            radius_km: Ogohlantirish radiusi
        
        Returns:
            Ogohlantirilishi kerak bo'lgan transport ID lari
        """
        nearby = []
        
        for v in all_vehicles:
            dist = self.route_predictor._haversine_distance(
                emergency_vehicle.latitude, emergency_vehicle.longitude,
                v.get('latitude', 0), v.get('longitude', 0)
            )
            
            if dist <= radius_km and v.get('vehicle_id') != emergency_vehicle.vehicle_id:
                nearby.append(v.get('vehicle_id'))
        
        return nearby
    
    def get_status(self) -> dict:
        """Tizim holatini olish"""
        return {
            "active_emergencies": len([v for v in self.active_vehicles.values() if v.is_active]),
            "pending_commands": len(self.pending_commands),
            "total_registered": len(self.active_vehicles)
        }


# Test uchun
if __name__ == "__main__":
    # Test
    controller = EVPController(preemption_lead_time=30)
    
    # Chorrahalar qo'shish
    for i in range(5):
        for j in range(5):
            int_id = f"INT-{i:02d}-{j:02d}"
            lat = 41.2995 + i * 0.005
            lng = 69.2401 + j * 0.005
            controller.route_predictor.add_intersection(int_id, lat, lng)
    
    # Bog'lanishlar
    for i in range(5):
        for j in range(5):
            current = f"INT-{i:02d}-{j:02d}"
            if i < 4:
                controller.route_predictor.add_connection(current, f"INT-{i+1:02d}-{j:02d}")
            if j < 4:
                controller.route_predictor.add_connection(current, f"INT-{i:02d}-{j+1:02d}")
    
    # Maxsus transport
    ambulance = EmergencyVehicle(
        vehicle_id="AMB-001",
        vehicle_type=EmergencyType.AMBULANCE,
        latitude=41.2995,
        longitude=69.2401
    )
    controller.register_vehicle(ambulance)
    
    # Favqulodda rejim
    commands = controller.activate_emergency(
        "AMB-001",
        destination_lat=41.32,
        destination_lng=69.26
    )
    
    print("\n📋 Buyruqlar:")
    for cmd in commands[:5]:
        print(f"   {cmd.intersection_id}: {cmd.direction} @ {cmd.execute_at.strftime('%H:%M:%S')}")

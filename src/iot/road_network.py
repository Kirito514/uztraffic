"""
Yo'l Tarmog'i - Road Network

Mashinalar aniq yo'llar bo'yicha harakatlanishi uchun
"""

import math
import random
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field


@dataclass
class RoadNode:
    """Yo'l tugun (chorraha yoki burilish nuqtasi)"""
    node_id: str
    latitude: float
    longitude: float
    is_intersection: bool = False
    signal_id: Optional[str] = None


@dataclass
class RoadSegment:
    """Yo'l segmenti (ikki tugun orasidagi yo'l)"""
    segment_id: str
    from_node: str
    to_node: str
    distance_km: float
    speed_limit: float = 60.0  # km/h
    lanes: int = 2
    is_one_way: bool = False


@dataclass
class VehicleRoute:
    """Transport marshruti"""
    current_node: str
    next_node: str
    progress: float = 0.0  # 0-1, segmentning qaysi qismida
    route_nodes: List[str] = field(default_factory=list)
    route_index: int = 0


class RoadNetwork:
    """
    Yo'l Tarmog'i
    
    Toshkent shahrining asosiy yo'llarini modellashtiradi
    """
    
    def __init__(self):
        self.nodes: Dict[str, RoadNode] = {}
        self.segments: Dict[str, RoadSegment] = {}
        self.adjacency: Dict[str, List[str]] = {}  # node -> [connected_nodes]
    
    def add_node(self, node: RoadNode):
        """Tugun qo'shish"""
        self.nodes[node.node_id] = node
        if node.node_id not in self.adjacency:
            self.adjacency[node.node_id] = []
    
    def add_segment(self, segment: RoadSegment):
        """Segment qo'shish"""
        self.segments[segment.segment_id] = segment
        
        # Adjacency yangilash
        if segment.from_node not in self.adjacency:
            self.adjacency[segment.from_node] = []
        self.adjacency[segment.from_node].append(segment.to_node)
        
        if not segment.is_one_way:
            if segment.to_node not in self.adjacency:
                self.adjacency[segment.to_node] = []
            self.adjacency[segment.to_node].append(segment.from_node)
    
    def get_node_position(self, node_id: str) -> Tuple[float, float]:
        """Tugun koordinatalari"""
        node = self.nodes.get(node_id)
        if node:
            return (node.latitude, node.longitude)
        return (0, 0)
    
    def get_random_node(self) -> str:
        """Tasodifiy tugun"""
        return random.choice(list(self.nodes.keys()))
    
    def get_next_node(self, current_node: str, exclude: str = None) -> Optional[str]:
        """Keyingi tugunni tanlash"""
        neighbors = self.adjacency.get(current_node, [])
        if exclude:
            neighbors = [n for n in neighbors if n != exclude]
        if neighbors:
            return random.choice(neighbors)
        return None
    
    def get_segment_between(self, node1: str, node2: str) -> Optional[RoadSegment]:
        """Ikki tugun orasidagi segment"""
        for seg in self.segments.values():
            if (seg.from_node == node1 and seg.to_node == node2) or \
               (seg.from_node == node2 and seg.to_node == node1 and not seg.is_one_way):
                return seg
        return None
    
    def interpolate_position(self, from_node: str, to_node: str, 
                             progress: float) -> Tuple[float, float]:
        """Ikki tugun orasidagi pozitsiya"""
        pos1 = self.get_node_position(from_node)
        pos2 = self.get_node_position(to_node)
        
        lat = pos1[0] + (pos2[0] - pos1[0]) * progress
        lng = pos1[1] + (pos2[1] - pos1[1]) * progress
        
        return (lat, lng)
    
    def calculate_heading(self, from_node: str, to_node: str) -> float:
        """Yo'nalish burchagi (0-360)"""
        pos1 = self.get_node_position(from_node)
        pos2 = self.get_node_position(to_node)
        
        dlat = pos2[0] - pos1[0]
        dlng = pos2[1] - pos1[1]
        
        angle = math.degrees(math.atan2(dlng, dlat))
        return (angle + 360) % 360


def create_tashkent_grid() -> RoadNetwork:
    """
    Toshkent shahrining grid yo'l tarmog'i
    
    Asosiy ko'chalar:
    - Amir Temur ko'chasi (Shimol-Janub)
    - Navoiy ko'chasi (G'arb-Sharq)
    - va boshqalar
    """
    network = RoadNetwork()
    
    # Shahar markazi
    center_lat = 41.2995
    center_lng = 69.2401
    
    # Grid o'lchami
    grid_rows = 8  # Shimol-Janub
    grid_cols = 10  # G'arb-Sharq
    
    # Tugunlar orasidagi masofa (gradus)
    lat_step = 0.003  # ~330m
    lng_step = 0.004  # ~350m
    
    # Ko'cha nomlari
    ns_streets = [
        "Amir_Temur", "Mirzo_Ulugbek", "Shota_Rustaveli", 
        "Bobur", "Alisher_Navoiy", "Mustaqillik",
        "Bunyodkor", "Chilonzor", "Sergeli", "Yunusobod"
    ]
    ew_streets = [
        "Afrosiyob", "Beruniy", "Furqat", "Muqimiy",
        "Nukus", "Oybek", "Pushkin", "Samarkand"
    ]
    
    # Tugunlar yaratish (grid format)
    for row in range(grid_rows):
        for col in range(grid_cols):
            lat = center_lat + (row - grid_rows/2) * lat_step
            lng = center_lng + (col - grid_cols/2) * lng_step
            
            node_id = f"N-{row:02d}-{col:02d}"
            is_intersection = True  # Grid da barcha nuqtalar chorraha
            
            network.add_node(RoadNode(
                node_id=node_id,
                latitude=lat,
                longitude=lng,
                is_intersection=is_intersection,
                signal_id=f"SIG-{row:02d}-{col:02d}" if is_intersection else None
            ))
    
    # Segmentlar yaratish (ko'chalar)
    segment_count = 0
    
    # Gorizontal yo'llar (G'arb-Sharq)
    for row in range(grid_rows):
        street_name = ew_streets[row] if row < len(ew_streets) else f"Street-EW-{row}"
        for col in range(grid_cols - 1):
            from_id = f"N-{row:02d}-{col:02d}"
            to_id = f"N-{row:02d}-{col+1:02d}"
            
            distance = lng_step * 111 * math.cos(math.radians(center_lat))  # km
            
            network.add_segment(RoadSegment(
                segment_id=f"S-{segment_count:04d}-{street_name}",
                from_node=from_id,
                to_node=to_id,
                distance_km=distance,
                speed_limit=50.0,
                lanes=2
            ))
            segment_count += 1
    
    # Vertikal yo'llar (Shimol-Janub)
    for col in range(grid_cols):
        street_name = ns_streets[col] if col < len(ns_streets) else f"Street-NS-{col}"
        for row in range(grid_rows - 1):
            from_id = f"N-{row:02d}-{col:02d}"
            to_id = f"N-{row+1:02d}-{col:02d}"
            
            distance = lat_step * 111  # km
            
            network.add_segment(RoadSegment(
                segment_id=f"S-{segment_count:04d}-{street_name}",
                from_node=from_id,
                to_node=to_id,
                distance_km=distance,
                speed_limit=60.0,
                lanes=2
            ))
            segment_count += 1
    
    print(f"✅ Yo'l tarmog'i yaratildi: {len(network.nodes)} tugun, {len(network.segments)} segment")
    
    return network


# Global network
_road_network: Optional[RoadNetwork] = None

def get_road_network() -> RoadNetwork:
    """Global yo'l tarmog'ini olish"""
    global _road_network
    if _road_network is None:
        _road_network = create_tashkent_grid()
    return _road_network


# Test
if __name__ == "__main__":
    network = create_tashkent_grid()
    
    # Test marshrut
    current = network.get_random_node()
    print(f"\nTest marshrut: {current}")
    
    for i in range(5):
        next_node = network.get_next_node(current)
        if next_node:
            pos = network.interpolate_position(current, next_node, 0.5)
            heading = network.calculate_heading(current, next_node)
            print(f"  → {next_node} | Pos: {pos[0]:.4f}, {pos[1]:.4f} | Heading: {heading:.0f}°")
            current = next_node

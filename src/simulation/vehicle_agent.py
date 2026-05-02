"""
Vehicle Agent — Haqiqiy yo'lda yuruvchi mashina

Har bir mashina:
  - OSM grafida Dijkstra orqali marshrut hisoblaydi
  - Yo'l bo'ylab harakatlanadi (interpolatsiya)
  - Svetafor qizil bo'lsa kutadi
  - Manzilga yetganda yangi manzil oladi
"""

import math
import random
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
from datetime import datetime

try:
    import networkx as nx
    NX_AVAILABLE = True
except ImportError:
    NX_AVAILABLE = False


@dataclass
class VehicleAgent:
    vehicle_id: str
    vehicle_type: str   # car | bus | truck | ambulance
    
    # Hozirgi pozitsiya
    lat: float = 0.0
    lng: float = 0.0
    speed_kmh: float = 0.0
    heading: float = 0.0
    is_emergency: bool = False

    # Marshrut
    route_nodes: List[str] = field(default_factory=list)
    route_index: int = 0          # Hozir qaysi segmentda
    segment_progress: float = 0.0 # 0.0 → 1.0

    # Holat
    waiting: bool = False         # Svetafor kutilmoqda
    wait_seconds: float = 0.0
    
    # Statistika
    total_distance_m: float = 0.0
    trips_completed: int = 0


class VehicleSimulator:
    """
    Barcha mashinalarni boshqaruvchi simulyator.
    OSM grafdagi haqiqiy yo'llar bo'yicha yuradi.
    """

    VEHICLE_SPEEDS = {
        "car":       (30, 60),    # (min, max) km/h
        "bus":       (20, 45),
        "truck":     (15, 40),
        "ambulance": (50, 90),
    }

    VEHICLE_WEIGHTS = {
        "car": 0.65, "bus": 0.15, "truck": 0.15, "ambulance": 0.05
    }

    def __init__(self, roads_data: dict, vehicle_count: int = 100):
        self.roads  = roads_data
        self.graph  = self._build_graph()
        self.agents: Dict[str, VehicleAgent] = {}
        self.node_coords: Dict[str, Tuple[float, float]] = {
            n["id"]: (n["lat"], n["lng"])
            for n in roads_data.get("nodes", [])
        }
        self.node_ids = list(self.node_coords.keys())
        
        # Chorraha → svetafor holati  {"node_id": "green"|"red"}
        self.signal_states: Dict[str, str] = {}
        self._init_signals(roads_data.get("intersections", []))
        
        self._spawn_vehicles(vehicle_count)
        print(f"✅  {vehicle_count} ta mashina yaratildi, {len(self.node_ids)} tugun mavjud")

    # ──────────────────────────────────────
    # Graf qurish
    # ──────────────────────────────────────
    def _build_graph(self):
        """OSM edges asosida NetworkX yo'naltirilgan graf"""
        if not NX_AVAILABLE:
            return None

        G = nx.DiGraph()
        for edge in self.roads.get("edges", []):
            u, v = edge["from"], edge["to"]
            speed = max(edge.get("speed", 50), 5)
            length = edge.get("length_m", 100)
            travel_time = length / (speed / 3.6)  # soniya
            G.add_edge(u, v, weight=travel_time, length=length,
                       speed=speed, lanes=edge.get("lanes", 1))
            # Ikki tomonlama (OSM data odatda simplify qilgan)
            G.add_edge(v, u, weight=travel_time, length=length,
                       speed=speed, lanes=edge.get("lanes", 1))
        return G

    # ──────────────────────────────────────
    # Svetaforlar
    # ──────────────────────────────────────
    def _init_signals(self, intersections: List[str]):
        for node_id in intersections:
            # Tasodifiy boshlang'ich holat
            self.signal_states[node_id] = random.choice(["green", "green", "red"])

    def update_signals(self, dt: float, ai_overrides: Dict[str, str] = None):
        """
        Svetaforlarni yangilash.
        ai_overrides: AI tizimi buyurgan o'zgarishlar {node_id: "green"|"red"}
        """
        # Oddiy sikllik o'zgarish (har 30 soniyada)
        # Haqiqiy proyektda Q-Learning natijasi ishlatiladi
        for node_id in self.signal_states:
            if ai_overrides and node_id in ai_overrides:
                self.signal_states[node_id] = ai_overrides[node_id]
            else:
                # Har qadam uchun kichik ehtimollik bilan almashtirish
                if random.random() < dt / 30.0:
                    cur = self.signal_states[node_id]
                    self.signal_states[node_id] = "red" if cur == "green" else "green"

    # ──────────────────────────────────────
    # Mashinalar yaratish
    # ──────────────────────────────────────
    def _spawn_vehicles(self, count: int):
        if not self.node_ids:
            return

        types = list(self.VEHICLE_WEIGHTS.keys())
        weights = list(self.VEHICLE_WEIGHTS.values())

        for i in range(count):
            vtype = random.choices(types, weights=weights)[0]
            vid   = f"{vtype.upper()}-{i+1:03d}"
            
            start = random.choice(self.node_ids)
            lat, lng = self.node_coords.get(start, (52.37, 4.90))

            speed_range = self.VEHICLE_SPEEDS[vtype]
            speed = random.uniform(*speed_range)

            agent = VehicleAgent(
                vehicle_id=vid,
                vehicle_type=vtype,
                lat=lat, lng=lng,
                speed_kmh=speed,
                is_emergency=(vtype == "ambulance"),
            )
            # Dastlabki marshrut
            self._assign_route(agent, start)
            self.agents[vid] = agent

    # ──────────────────────────────────────
    # Marshrut
    # ──────────────────────────────────────
    def _assign_route(self, agent: VehicleAgent, start_node: str):
        if not NX_AVAILABLE or not self.graph or len(self.node_ids) < 2:
            agent.route_nodes = [start_node]
            return

        # Tasodifiy manzil (boshqa chorraha)
        for _ in range(10):
            dest = random.choice(self.node_ids)
            if dest != start_node:
                try:
                    path = nx.shortest_path(
                        self.graph, start_node, dest, weight="weight"
                    )
                    if len(path) >= 2:
                        agent.route_nodes    = path
                        agent.route_index    = 0
                        agent.segment_progress = 0.0
                        return
                except (nx.NetworkXNoPath, nx.NodeNotFound):
                    continue

        agent.route_nodes = [start_node]

    # ──────────────────────────────────────
    # Simulyatsiya qadami
    # ──────────────────────────────────────
    def step(self, dt: float = 1.0) -> List[dict]:
        """
        dt soniyalik vaqt o'tishi.
        Barcha mashinalar o'rnini yangilaydi.
        """
        results = []
        for agent in self.agents.values():
            self._move_agent(agent, dt)
            results.append(self._agent_to_dict(agent))
        return results

    def _move_agent(self, agent: VehicleAgent, dt: float):
        if len(agent.route_nodes) < 2:
            # Marshrut yo'q → yangi marshrut
            start = random.choice(self.node_ids) if self.node_ids else None
            if start:
                agent.lat, agent.lng = self.node_coords.get(start, (agent.lat, agent.lng))
                self._assign_route(agent, start)
            return

        if agent.route_index >= len(agent.route_nodes) - 1:
            # Manzilga yetdi
            agent.trips_completed += 1
            cur_node = agent.route_nodes[-1]
            self._assign_route(agent, cur_node)
            return

        cur_node  = agent.route_nodes[agent.route_index]
        next_node = agent.route_nodes[agent.route_index + 1]

        # Svetafor tekshirish
        if self.signal_states.get(next_node) == "red" and not agent.is_emergency:
            agent.waiting = True
            agent.wait_seconds += dt
            return

        agent.waiting      = False
        agent.wait_seconds = 0.0

        # Segment uzunligini olish
        edge_data = self.graph.edges.get((cur_node, next_node), {}) if self.graph else {}
        seg_len_m = edge_data.get("length", 100.0)
        seg_speed = edge_data.get("speed", agent.speed_kmh)

        # Tezlikni moslashtirish (tirbandlik bo'lsa kamaytirish)
        effective_speed = min(agent.speed_kmh, seg_speed)

        # Progress yangilash
        distance_m = effective_speed / 3.6 * dt
        progress_delta = distance_m / max(seg_len_m, 1.0)

        agent.segment_progress += progress_delta
        agent.total_distance_m += distance_m

        if agent.segment_progress >= 1.0:
            # Keyingi segmentga o'tish
            agent.segment_progress = 0.0
            agent.route_index     += 1
            agent.lat, agent.lng   = self.node_coords.get(next_node, (agent.lat, agent.lng))
        else:
            # Interpolatsiya
            pos1 = self.node_coords.get(cur_node,  (agent.lat, agent.lng))
            pos2 = self.node_coords.get(next_node, (agent.lat, agent.lng))
            p    = agent.segment_progress
            agent.lat = pos1[0] + (pos2[0] - pos1[0]) * p
            agent.lng = pos1[1] + (pos2[1] - pos1[1]) * p

            # Yo'nalish (heading)
            dlat = pos2[0] - pos1[0]
            dlng = pos2[1] - pos1[1]
            agent.heading = (math.degrees(math.atan2(dlng, dlat)) + 360) % 360

    def _agent_to_dict(self, agent: VehicleAgent) -> dict:
        return {
            "id":         agent.vehicle_id,
            "type":       agent.vehicle_type,
            "lat":        round(agent.lat, 6),
            "lng":        round(agent.lng, 6),
            "speed":      round(agent.speed_kmh, 1),
            "heading":    round(agent.heading, 1),
            "emergency":  agent.is_emergency,
            "waiting":    agent.waiting,
        }

    def get_stats(self) -> dict:
        """Umumiy statistika"""
        speeds  = [a.speed_kmh for a in self.agents.values() if not a.waiting]
        waiting = sum(1 for a in self.agents.values() if a.waiting)
        return {
            "total_vehicles":    len(self.agents),
            "waiting_vehicles":  waiting,
            "average_speed":     round(sum(speeds) / len(speeds), 1) if speeds else 0,
            "active_signals":    len(self.signal_states),
            "green_signals":     sum(1 for s in self.signal_states.values() if s == "green"),
        }

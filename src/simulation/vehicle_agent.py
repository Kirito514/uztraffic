"""
Vehicle Agent — Toshkent yo'l grafida harakatlanuvchi mashinalar

RoadNetwork  — roads.json dan yo'naltirilgan graf, segment geometriyasi,
               eng qisqa yo'l va eng yaqin tugun qidirish.
Vehicle      — marshrut (tugunlar ro'yxati), joriy segment va undagi masofa.
move_vehicles — bir qadam: oldingi mashinaga masofa (car-following),
               qizil chiroqda to'xtash chizig'ida turish, segmentdan segmentga o'tish.
"""

import math
import random
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Tuple

import networkx as nx
import numpy as np

from src.simulation.osm_loader import bearing_deg, haversine_m

MIN_GAP_M = 7.0            # to'xtagan mashinalar orasidagi masofa (mashina + bo'shliq)
STOP_OFFSET_M = 3.0        # to'xtash chizig'i segment oxiridan
ACCEL_MS2 = 2.5
SPEED_RANGE_KMH = (20.0, 60.0)

VEHICLE_TYPES = {          # tur: (ulush, tezlik koeffitsiyenti oralig'i)
    "car": (0.80, (0.85, 1.05)),
    "bus": (0.10, (0.70, 0.85)),
    "truck": (0.10, (0.70, 0.85)),
}


@dataclass
class Edge:
    u: str
    v: str
    length: float
    speed: float               # m/s
    coords: np.ndarray         # (k, 2) lat, lng
    cum: np.ndarray            # har bir nuqtagacha masofa, segment uzunligiga moslangan
    highway: str
    name: str

    def point_at(self, s: float) -> Tuple[float, float, float]:
        """Segment boshidan s metrdagi (lat, lng, heading)."""
        s = min(max(s, 0.0), self.length)
        i = int(np.searchsorted(self.cum, s, side="right")) - 1
        i = min(max(i, 0), len(self.coords) - 2)
        seg = self.cum[i + 1] - self.cum[i]
        f = (s - self.cum[i]) / seg if seg > 0 else 0.0
        (lat1, lng1), (lat2, lng2) = self.coords[i], self.coords[i + 1]
        return (lat1 + (lat2 - lat1) * f, lng1 + (lng2 - lng1) * f,
                bearing_deg(lat1, lng1, lat2, lng2))

    def end_bearing(self, back_m: float = 30.0) -> float:
        """Segment oxiriga yaqinlashish yo'nalishi (oxirgi ~30 m)."""
        lat1, lng1, _ = self.point_at(self.length - back_m)
        lat2, lng2 = self.coords[-1]
        if (lat1, lng1) == (lat2, lng2):
            lat1, lng1 = self.coords[0]
        return bearing_deg(lat1, lng1, lat2, lng2)


class RoadNetwork:
    def __init__(self, roads: dict):
        self.node_pos: Dict[str, Tuple[float, float]] = {k: tuple(v) for k, v in roads["nodes"].items()}
        self.edges: Dict[Tuple[str, str], Edge] = {}
        full = nx.DiGraph()
        for e in roads["edges"]:
            coords = np.array(e["coords"], dtype=float)
            steps = [haversine_m(*coords[i], *coords[i + 1]) for i in range(len(coords) - 1)]
            cum = np.concatenate([[0.0], np.cumsum(steps)])
            length = max(float(e["length"]), 1.0)
            cum = cum * (length / cum[-1]) if cum[-1] > 0 else np.linspace(0, length, len(coords))
            speed_kmh = min(max(e["speed"], SPEED_RANGE_KMH[0]), SPEED_RANGE_KMH[1])
            edge = Edge(e["from"], e["to"], length, speed_kmh / 3.6, coords, cum, e["highway"], e["name"])
            self.edges[(edge.u, edge.v)] = edge
            full.add_edge(edge.u, edge.v, length=length, time=length / edge.speed)

        # Faqat eng katta kuchli bog'langan qism: har qanday tugundan har qanday tugunga yo'l bor
        core = max(nx.strongly_connected_components(full), key=len)
        self.graph = full.subgraph(core).copy()
        self.nodes: List[str] = list(self.graph.nodes)
        major = {"trunk", "primary", "secondary", "tertiary"}
        weights = []
        for n in self.nodes:
            touches_major = any(self.edges[(n, m)].highway.replace("_link", "") in major
                                for m in self.graph.successors(n))
            weights.append(4.0 if touches_major else 1.0)
        self._node_weights = weights
        self._node_xy = np.array([self.node_pos[n] for n in self.nodes])

    def random_node(self) -> str:
        return random.choices(self.nodes, weights=self._node_weights)[0]

    def nearest_node(self, lat: float, lng: float) -> Tuple[str, float]:
        """Eng yaqin tugun va unga masofa (m)."""
        dlat = (self._node_xy[:, 0] - lat) * 111_320.0
        dlng = (self._node_xy[:, 1] - lng) * 111_320.0 * math.cos(math.radians(lat))
        i = int(np.argmin(dlat ** 2 + dlng ** 2))
        node = self.nodes[i]
        return node, haversine_m(lat, lng, *self.node_pos[node])

    def shortest_path(self, a: str, b: str, weight: str = "time") -> Optional[List[str]]:
        try:
            return nx.shortest_path(self.graph, a, b, weight=weight)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return None

    def random_route(self, start: str) -> List[str]:
        for _ in range(10):
            dest = self.random_node()
            if dest != start:
                path = self.shortest_path(start, dest)
                if path and len(path) >= 3:
                    return path
        return [start, next(iter(self.graph.successors(start)))]

    def route_length(self, route: List[str]) -> float:
        return sum(self.edges[(a, b)].length for a, b in zip(route, route[1:]))


@dataclass
class Vehicle:
    id: str
    type: str
    route: List[str]
    idx: int = 0                  # joriy segment: route[idx] → route[idx + 1]
    pos: float = 0.0              # segment boshidan masofa, m
    speed: float = 0.0            # m/s
    factor: float = 1.0           # segment tezligiga nisbatan haydash koeffitsiyenti
    emergency: bool = False
    wait: float = 0.0             # joriy chorrahada svetofor kutishi, s
    detected: bool = False        # joriy segmentdagi detektordan o'tdimi
    stuck: float = 0.0            # qancha vaqtdan beri joyidan siljimagan
    lat: float = 0.0
    lng: float = 0.0
    heading: float = 0.0

    @property
    def edge_key(self) -> Tuple[str, str]:
        return self.route[self.idx], self.route[self.idx + 1]


def spawn_vehicle(net: RoadNetwork, vid: str, scatter: bool = True) -> Vehicle:
    vtype = random.choices(list(VEHICLE_TYPES), weights=[w for w, _ in VEHICLE_TYPES.values()])[0]
    route = net.random_route(net.random_node())
    v = Vehicle(id=vid, type=vtype, route=route, factor=random.uniform(*VEHICLE_TYPES[vtype][1]))
    if scatter:
        v.idx = random.randrange(len(route) - 1)
        v.pos = random.uniform(0, net.edges[v.edge_key].length * 0.8)
    v.speed = net.edges[v.edge_key].speed * v.factor * 0.5
    v.lat, v.lng, v.heading = net.edges[v.edge_key].point_at(v.pos)
    return v


# stop_line(edge_key, vehicle, distance_to_end) → to'xtash kerakmi
StopRule = Callable[[Tuple[str, str], Vehicle, float], bool]
# on_edge_exit(edge_key, vehicle) — segment oxiriga yetib o'tganda
ExitHook = Callable[[Tuple[str, str], Vehicle], None]


def move_vehicles(net: RoadNetwork, vehicles: List[Vehicle], dt: float,
                  must_stop: StopRule, on_exit: ExitHook) -> None:
    """Oddiy mashinalarni bir qadam harakatlantiradi (tez yordam alohida)."""
    by_edge: Dict[Tuple[str, str], List[Vehicle]] = {}
    for v in vehicles:
        by_edge.setdefault(v.edge_key, []).append(v)
    tail = {k: min(x.pos for x in vs) for k, vs in by_edge.items()}

    for key, group in by_edge.items():
        group.sort(key=lambda x: -x.pos)
        leader: Optional[Vehicle] = None
        for v in group:
            edge = net.edges[key]
            limit = math.inf
            if leader is not None:
                limit = leader.pos - MIN_GAP_M
            elif v.idx + 2 < len(v.route):
                nxt = (v.route[v.idx + 1], v.route[v.idx + 2])
                if nxt in tail:
                    limit = edge.length + tail[nxt] - MIN_GAP_M
            if must_stop(key, v, edge.length - v.pos):
                limit = min(limit, edge.length - STOP_OFFSET_M)

            target = edge.speed * v.factor
            v.speed = min(target, v.speed + ACCEL_MS2 * dt)
            new_pos = v.pos + v.speed * dt
            if new_pos > limit:
                new_pos = max(v.pos, limit)
                v.speed = (new_pos - v.pos) / dt
            v.stuck = v.stuck + dt if new_pos - v.pos < 0.1 else 0.0
            v.pos = new_pos
            _advance(net, v, on_exit, must_stop)
            v.lat, v.lng, v.heading = net.edges[v.edge_key].point_at(v.pos)
            leader = v


def _advance(net: RoadNetwork, v: Vehicle, on_exit: ExitHook, must_stop: StopRule) -> None:
    """Segment oxiridan oshgan masofani keyingi segment(lar)ga o'tkazadi."""
    while v.pos >= net.edges[v.edge_key].length:
        key = v.edge_key
        on_exit(key, v)
        v.pos -= net.edges[key].length
        v.idx += 1
        v.detected = False
        if v.idx >= len(v.route) - 1:          # manzilga yetdi — yangi marshrut
            v.route = net.random_route(v.route[-1])
            v.idx = 0
        edge = net.edges[v.edge_key]
        if must_stop(v.edge_key, v, edge.length - v.pos):
            v.pos = min(v.pos, max(edge.length - STOP_OFFSET_M, 0.0))
            v.speed = min(v.speed, edge.speed * v.factor)

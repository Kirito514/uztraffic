"""
Shahar Trafik Simulyatori — Toshkent markazi (OSM)

Har 1 s (simulyatsiya vaqti) bitta qadam:
  1. Mashinalar haqiqiy yo'l grafida yuradi, qizil chiroqda to'xtaydi.
  2. Har bir chorrahada yaqinlashish segmentlaridagi to'xtagan mashinalar
     NS/EW o'qlari bo'yicha sanaladi (navbat), detektordan o'tganlari — kelish oqimi.
  3. Ko'rinadigan svetoforlar global rejimda ishlaydi: 'ai' — DQN shu navbatlar
     bo'yicha qaror qiladi, 'fixed' — har yo'nalishga 30 s.
  4. Adolatli taqqoslash: har chorrahada bir xil kelish oqimini oladigan ikki soya
     navbat simulyatsiyasi (DQN va fiks taymer) parallel yuradi.
  5. Tez yordam marshruti, DBSCAN tirbandlik zonalari, voqealar va tarix.

Hamma raqamlar simulyatsiyadan; real Toshkent trafigi emas.
"""

import itertools
import math
import random
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Deque, Dict, List, Optional, Tuple

import numpy as np
from sklearn.cluster import DBSCAN

from src.ai.dqn_policy import ACTIONS, DQNPolicy, make_state
from src.simulation.osm_loader import CITY_CENTER, get_roads, haversine_m, roads_geojson
from src.simulation.signals import (
    AXES, WAIT_WINDOW_S, QueueModel, SignalController, dqn_decide, fixed_decide,
)
from src.simulation.vehicle_agent import RoadNetwork, Vehicle, move_vehicles, spawn_vehicle

VEHICLE_COUNT = 240
TICK_S = 1.0
DETECTOR_M = 150.0          # kelish detektori to'xtash chizig'idan shu masofada
QUEUE_ZONE_M = 250.0        # navbat sanaladigan masofa
QUEUE_SPEED_MS = 2.0        # bundan sekin mashina "kutmoqda" hisoblanadi
YELLOW_CLEAR_M = 15.0       # sariqda to'xtash chizig'iga shundan yaqin mashina o'tib ketadi
HISTORY_S = 900             # chorraha tarixi: 15 daqiqa
EVENTS_KEPT = 20
PREEMPT_AHEAD_S = 30.0      # tez yordam yetib kelishidan shuncha oldin yashil
AMBULANCE_SPEED_MS = 60 / 3.6
STUCK_RESPAWN_S = 180.0     # svetofordan boshqa sababga 3 daqiqa turib qolgan mashina qayta chiqadi
GPS_TIMEOUT_S = 30.0
ZONE_EPS_M = 80.0
ZONE_MIN_VEHICLES = 5
ZONE_ALERT_COOLDOWN_S = 120.0
SHADOW_DEMAND_SCALE = 1     # soya navbatlarida har bir ko'rinadigan mashina nechta mashinaga teng
ACTION_LABELS = tuple(f"{axis}{green}" for axis, green in ACTIONS)


def _now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _mean(values) -> float:
    values = list(values)
    return sum(values) / len(values) if values else 0.0


@dataclass
class Intersection:
    id: str
    name: str
    lat: float
    lng: float
    nodes: set
    approaches: Dict[Tuple[str, str], str]          # yaqinlashish segmenti → o'q
    controller: Optional[SignalController] = None
    shadow_ai: Optional[QueueModel] = None
    shadow_fixed: Optional[QueueModel] = None
    queue: Dict[str, int] = field(default_factory=lambda: {a: 0 for a in AXES})
    arrivals: Dict[str, int] = field(default_factory=lambda: {a: 0 for a in AXES})
    waiting: List[float] = field(default_factory=list)      # hozir kutayotganlar kutishi
    served: Deque[Tuple[float, float]] = field(default_factory=deque)  # (vaqt, kutish)
    history: Deque[tuple] = field(default_factory=lambda: deque(maxlen=HISTORY_S))
    action: int = 0
    q: List[float] = field(default_factory=lambda: [0.0] * 4)
    guarded: bool = False                            # oxirgi qarorda 90 s cheklovi ishladi
    preempted: bool = False

    @property
    def wait(self) -> float:
        return _mean([w for _, w in self.served] + self.waiting)


@dataclass
class EmergencyRun:
    id: str
    vehicle: Vehicle
    route: List[str]
    cum: List[float]                                  # marshrut tugunlarigacha masofa
    stops: List[Tuple[Intersection, str, float]]      # (chorraha, o'q, unga masofa)
    polyline: List[List[float]]
    travelled: float = 0.0
    released: set = field(default_factory=set)

    @property
    def total(self) -> float:
        return self.cum[-1]

    @property
    def eta(self) -> float:
        return max(self.total - self.travelled, 0.0) / AMBULANCE_SPEED_MS

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "route": self.polyline,
            "intersections": [it.id for it, _, _ in self.stops],
            "eta": math.ceil(self.eta),
            "vehicleId": self.vehicle.id,
        }


def assign_axes(net: RoadNetwork, approaches: List[Tuple[str, str]]) -> Dict[Tuple[str, str], str]:
    """
    Yaqinlashish segmentlarini yo'nalishi bo'yicha ikki perpendikulyar o'qqa ajratadi.
    Chorraha ko'chalari shimolga to'g'ri kelmasligi mumkin, shuning uchun o'qlar
    burchagi segmentlarga eng yaxshi mos keladigan qilib tanlanadi; shimol-janubga
    yaqinrog'i — NS.
    """
    if not approaches:
        return {}
    bearings = [net.edges[k].end_bearing() % 180 for k in approaches]

    def dist(a: float, b: float) -> float:
        d = abs(a - b) % 180
        return min(d, 180 - d)

    theta = min(range(90), key=lambda t: sum(min(dist(b, t), dist(b, t + 90)) for b in bearings))
    ns_dir = theta if dist(theta, 0) <= 45 else theta + 90
    return {k: ("NS" if dist(b, ns_dir) <= 45 else "EW") for k, b in zip(approaches, bearings)}


class CitySimulator:
    def __init__(self, vehicle_count: int = VEHICLE_COUNT, seed: Optional[int] = None):
        if seed is not None:
            random.seed(seed)
        self.roads = get_roads()
        self.geojson = roads_geojson(self.roads)
        self.net = RoadNetwork(self.roads)
        self.policy = DQNPolicy()
        self.mode = "ai"
        self.clock = 0.0
        self.events: Deque[dict] = deque(maxlen=EVENTS_KEPT)
        self._event_ids = itertools.count(1)
        self._emergency_ids = itertools.count(1)
        self.emergency: Optional[EmergencyRun] = None
        self.gps: Dict[str, dict] = {}
        self.zones: List[dict] = []
        self._zone_alerts: Dict[str, float] = {}

        self.intersections: List[Intersection] = []
        self._approach: Dict[Tuple[str, str], Tuple[Intersection, str]] = {}
        for spec in self.roads["intersections"]:
            self._add_intersection(spec)
        self.by_id = {it.id: it for it in self.intersections}

        self.vehicles: List[Vehicle] = [spawn_vehicle(self.net, f"V{i:03d}")
                                        for i in range(1, vehicle_count + 1)]
        self.snapshot: dict = {}
        self.refresh()

    # ──────────────────────────────────────
    # Chorrahalar
    # ──────────────────────────────────────
    def _add_intersection(self, spec: dict):
        nodes = set(spec["nodes"])
        approach_keys = [k for k in self.net.edges if k[1] in nodes and k[0] not in nodes]
        it = Intersection(spec["id"], spec["name"], spec["lat"], spec["lng"], nodes,
                          assign_axes(self.net, approach_keys))
        it.controller = SignalController(self._visible_decide(it),
                                         phase=random.choice(AXES),
                                         initial_green=random.uniform(5, 30))
        it.shadow_ai = QueueModel(self.policy)
        it.shadow_fixed = QueueModel(None)
        q = self.policy.q_values(make_state(0, 0, 0))
        it.q, it.action = [round(float(x), 3) for x in q], int(np.argmax(q))
        for key, axis in it.approaches.items():
            self._approach[key] = (it, axis)
        self.intersections.append(it)

    def _visible_decide(self, it: Intersection):
        def decide(controller: SignalController) -> Tuple[str, float]:
            # DQN fiks rejimda ham hisoblanadi — Q-qiymatlarni ko'rsatish uchun
            axis, green, it.action, q, it.guarded = dqn_decide(
                self.policy, controller, it.queue["NS"], it.queue["EW"])
            it.q = [round(float(x), 3) for x in q]
            if self.mode == "ai":
                return axis, green
            it.guarded = False
            return fixed_decide(controller)
        return decide

    # ──────────────────────────────────────
    # Simulyatsiya qadami
    # ──────────────────────────────────────
    def step(self, dt: float = TICK_S) -> dict:
        self.clock += dt
        for it in self.intersections:
            it.arrivals = {a: 0 for a in AXES}

        move_vehicles(self.net, self.vehicles, dt, self._must_stop, self._on_edge_exit)
        self._count_queues(dt)
        self._respawn_stuck()
        self._move_emergency(dt)

        for it in self.intersections:
            if it.controller.tick(dt):
                self._phase_event(it)
            demand = {axis: n * SHADOW_DEMAND_SCALE for axis, n in it.arrivals.items()}
            it.shadow_ai.tick(self.clock, demand, dt)
            it.shadow_fixed.tick(self.clock, demand, dt)
            while it.served and it.served[0][0] < self.clock - WAIT_WINDOW_S:
                it.served.popleft()
            it.history.append((self.clock, _now_iso(), it.queue["NS"], it.queue["EW"],
                               round(it.wait, 1), it.action, it.controller.phase))

        self._update_zones()
        self._expire_gps()
        self.refresh()
        return self.snapshot

    def refresh(self):
        """Snapshot'ni joriy holatdan qayta quradi (qadamdan keyin va API o'zgarishlaridan keyin)."""
        self.snapshot = self._build_snapshot()

    def _must_stop(self, key: Tuple[str, str], v: Vehicle, to_end: float) -> bool:
        hit = self._approach.get(key)
        if hit is None or v.emergency:
            return False
        it, axis = hit
        c = it.controller
        if c.is_green(axis):
            return False
        return not (c.state == "yellow" and c.phase == axis and to_end <= YELLOW_CLEAR_M)

    def _on_edge_exit(self, key: Tuple[str, str], v: Vehicle):
        hit = self._approach.get(key)
        if hit is None:
            return
        it, axis = hit
        if not v.detected:               # qisqa segmentni bir qadamda o'tib ketgan
            it.arrivals[axis] += 1
        it.served.append((self.clock, v.wait))
        v.wait = 0.0

    def _count_queues(self, dt: float):
        for it in self.intersections:
            it.queue = {a: 0 for a in AXES}
            it.waiting = []
        for v in self.vehicles:
            hit = self._approach.get(v.edge_key)
            if hit is None:
                continue
            it, axis = hit
            to_end = self.net.edges[v.edge_key].length - v.pos
            if not v.detected and to_end <= DETECTOR_M:
                v.detected = True
                it.arrivals[axis] += 1
            if v.speed < QUEUE_SPEED_MS and to_end <= QUEUE_ZONE_M:
                v.wait += dt
                it.queue[axis] += 1
                it.waiting.append(v.wait)

    def _respawn_stuck(self):
        for i, v in enumerate(self.vehicles):
            if v.stuck >= STUCK_RESPAWN_S and not self._must_stop(v.edge_key, v, 0.0):
                self.vehicles[i] = spawn_vehicle(self.net, v.id, scatter=True)

    # ──────────────────────────────────────
    # Rejim
    # ──────────────────────────────────────
    def set_mode(self, mode: str):
        if mode == self.mode:
            return
        self.mode = mode
        for it in self.intersections:      # o'rtacha kutish joriy rejim uchun qaytadan
            it.served.clear()
        text = ("Rejim: AI (DQN) boshqaruvi yoqildi" if mode == "ai"
                else "Rejim: fiks taymer yoqildi (har yo‘nalishga 30 s)")
        self._event("mode", text)
        self.refresh()

    # ──────────────────────────────────────
    # Tez yordam
    # ──────────────────────────────────────
    def start_emergency(self, start: Tuple[float, float], end: Tuple[float, float]) -> dict:
        a, da = self.net.nearest_node(*start)
        b, db = self.net.nearest_node(*end)
        if max(da, db) > 1000:
            raise ValueError("Nuqta xarita hududidan tashqarida (Toshkent markazi, ~2.5 km)")
        route = self.net.shortest_path(a, b, weight="length")
        if not route or len(route) < 2:
            raise ValueError("Bu nuqtalar orasida yo‘l topilmadi")
        if self.emergency:
            self.cancel_emergency(announce=False)

        cum, polyline = [0.0], []
        for u, v in zip(route, route[1:]):
            edge = self.net.edges[(u, v)]
            cum.append(cum[-1] + edge.length)
            coords = [[round(lat, 6), round(lng, 6)] for lat, lng in edge.coords]
            polyline.extend(coords if not polyline else coords[1:])
        stops = []
        for i in range(1, len(route)):
            hit = self._approach.get((route[i - 1], route[i]))
            if hit:
                stops.append((hit[0], hit[1], cum[i]))

        eid = next(self._emergency_ids)
        vehicle = Vehicle(id=f"AMB-{eid}", type="ambulance", route=route,
                          speed=AMBULANCE_SPEED_MS, emergency=True)
        vehicle.lat, vehicle.lng, vehicle.heading = self.net.edges[vehicle.edge_key].point_at(0)
        self.emergency = EmergencyRun(f"em{eid}", vehicle, route, cum, stops, polyline)
        self._event("emergency",
                    f"Tez yordam yo‘lga chiqdi: {len(stops)} ta chorraha oldindan yashil, "
                    f"taxminan {math.ceil(self.emergency.eta)} s")
        self._apply_preemption()
        self.refresh()
        return self.emergency.to_dict()

    def cancel_emergency(self, announce: bool = True) -> bool:
        if not self.emergency:
            return False
        for it, _, _ in self.emergency.stops:
            it.preempted = False
            it.controller.preempt(None)
        self.emergency = None
        if announce:
            self._event("emergency", "Tez yordam bekor qilindi")
            self.refresh()
        return True

    def _move_emergency(self, dt: float):
        run = self.emergency
        if not run:
            return
        run.travelled += AMBULANCE_SPEED_MS * dt
        if run.travelled >= run.total:
            self.cancel_emergency(announce=False)
            self._event("emergency", "Tez yordam manzilga yetdi")
            return
        v = run.vehicle
        while v.idx < len(run.route) - 2 and run.cum[v.idx + 1] <= run.travelled:
            v.idx += 1
        v.pos = run.travelled - run.cum[v.idx]
        v.lat, v.lng, v.heading = self.net.edges[v.edge_key].point_at(v.pos)
        self._apply_preemption()

    def _apply_preemption(self):
        run = self.emergency
        for it, axis, at in run.stops:
            if it.id in run.released:
                continue
            if run.travelled > at + 10:              # o'tib ketdi — oddiy rejimga qaytadi
                run.released.add(it.id)
                it.preempted = False
                it.controller.preempt(None)
            elif not it.preempted and (at - run.travelled) / AMBULANCE_SPEED_MS <= PREEMPT_AHEAD_S:
                it.preempted = True
                it.controller.preempt(axis)
                self._event("emergency", f"{it.name}: tez yordam uchun {axis} yashil", it.id)

    # ──────────────────────────────────────
    # GPS (telefon)
    # ──────────────────────────────────────
    def update_gps(self, vehicle_id: str, lat: float, lng: float, speed_kmh: float, heading: float):
        if vehicle_id not in self.gps:
            self._event("gps", f"Telefon GPS ulandi: {vehicle_id}")
        self.gps[vehicle_id] = {"lat": lat, "lng": lng, "speed": speed_kmh,
                                "heading": heading, "seen": self.clock}
        self.refresh()

    def _expire_gps(self):
        for vid in [k for k, g in self.gps.items() if self.clock - g["seen"] > GPS_TIMEOUT_S]:
            del self.gps[vid]

    # ──────────────────────────────────────
    # DBSCAN zonalar
    # ──────────────────────────────────────
    def _update_zones(self):
        lat0, lng0 = CITY_CENTER
        kx = 111_320.0 * math.cos(math.radians(lat0))
        xy = np.array([((v.lng - lng0) * kx, (v.lat - lat0) * 111_320.0) for v in self.vehicles])
        speeds = np.array([v.speed * 3.6 for v in self.vehicles])
        labels = DBSCAN(eps=ZONE_EPS_M, min_samples=ZONE_MIN_VEHICLES).fit_predict(xy)

        zones = []
        for label in set(labels) - {-1}:
            members = labels == label
            cx, cy = xy[members].mean(axis=0)
            radius = float(np.percentile(np.hypot(*(xy[members] - (cx, cy)).T), 90)) + 20
            mean_speed = float(speeds[members].mean())
            level = "heavy" if mean_speed < 10 else "moderate" if mean_speed < 25 else "light"
            zones.append({"lat": round(lat0 + cy / 111_320.0, 6), "lng": round(lng0 + cx / kx, 6),
                          "radius": round(radius), "count": int(members.sum()), "level": level})
        zones.sort(key=lambda z: -z["count"])
        self.zones = [{"id": f"z{i}", **z} for i, z in enumerate(zones, start=1)]
        for z in self.zones:
            if z["level"] == "heavy":
                self._zone_alert(z)

    def _zone_alert(self, zone: dict):
        it = min(self.intersections, key=lambda x: haversine_m(x.lat, x.lng, zone["lat"], zone["lng"]))
        if haversine_m(it.lat, it.lng, zone["lat"], zone["lng"]) > 400:
            return
        if self.clock - self._zone_alerts.get(it.id, -math.inf) < ZONE_ALERT_COOLDOWN_S:
            return
        self._zone_alerts[it.id] = self.clock
        self._event("zone", f"{it.name} yaqinida og‘ir tirbandlik: {zone['count']} ta mashina", it.id)

    # ──────────────────────────────────────
    # Voqealar, tarix, snapshot
    # ──────────────────────────────────────
    def _event(self, kind: str, text: str, intersection_id: Optional[str] = None):
        event = {"id": f"e{next(self._event_ids)}", "t": _now_iso(), "kind": kind, "text": text}
        if intersection_id:
            event["intersectionId"] = intersection_id
        self.events.appendleft(event)

    def _phase_event(self, it: Intersection):
        if it.preempted:
            return                       # tez yordam voqeasi allaqachon yozilgan
        if self.mode == "fixed":
            reason = "fiks 30 s"
        elif it.guarded:
            reason = f"DQN {ACTION_LABELS[it.action]}, maks. yashil 90 s cheklovi"
        else:
            reason = f"DQN: {ACTION_LABELS[it.action]}"
        self._event("phase", f"{it.name}: yashil {it.controller.phase} ga o‘tdi ({reason})", it.id)

    def history(self, intersection_id: str, minutes: float) -> List[dict]:
        it = self.by_id[intersection_id]
        since = self.clock - minutes * 60
        return [{"t": t, "queueNs": ns, "queueEw": ew, "wait": wait, "action": action, "phase": phase}
                for clock, t, ns, ew, wait, action, phase in it.history if clock > since]

    def _vehicle_dicts(self) -> List[dict]:
        out = [{"id": v.id, "lat": round(v.lat, 6), "lng": round(v.lng, 6),
                "heading": round(v.heading, 1), "speed": round(v.speed * 3.6, 1),
                "type": v.type, "emergency": False} for v in self.vehicles]
        if self.emergency:
            v = self.emergency.vehicle
            out.append({"id": v.id, "lat": round(v.lat, 6), "lng": round(v.lng, 6),
                        "heading": round(v.heading, 1), "speed": round(v.speed * 3.6, 1),
                        "type": "ambulance", "emergency": True})
        for vid, g in self.gps.items():
            out.append({"id": vid, "lat": g["lat"], "lng": g["lng"], "heading": g["heading"],
                        "speed": round(g["speed"], 1), "type": "car", "emergency": False})
        return out

    def _intersection_dict(self, it: Intersection) -> dict:
        c = it.controller
        return {
            "id": it.id, "name": it.name, "lat": it.lat, "lng": it.lng,
            "phase": c.phase, "state": c.state, "remaining": round(max(c.remaining, 0.0), 1),
            "queue": {"ns": it.queue["NS"], "ew": it.queue["EW"]},
            "wait": round(it.wait, 1), "action": it.action, "q": it.q, "preempted": it.preempted,
        }

    def comparison(self) -> Tuple[float, float]:
        """Soya simulyatsiyalari: (AI o'rtacha kutish, fiks o'rtacha kutish), s."""
        ai = [w for it in self.intersections for w in it.shadow_ai.wait_samples(self.clock)]
        fixed = [w for it in self.intersections for w in it.shadow_fixed.wait_samples(self.clock)]
        return _mean(ai), _mean(fixed)

    def _build_snapshot(self) -> dict:
        speeds = [v.speed for v in self.vehicles]
        desired = [self.net.edges[v.edge_key].speed * v.factor for v in self.vehicles]
        congestion = 100 * (1 - _mean(speeds) / _mean(desired)) if desired else 0.0
        visible_waits = [w for it in self.intersections
                         for w in [w for _, w in it.served] + it.waiting]
        wait_ai, wait_fixed = self.comparison()
        vehicles = self._vehicle_dicts()
        return {
            "t": _now_iso(),
            "mode": self.mode,
            "stats": {
                "vehicles": len(vehicles),
                "avgSpeed": round(_mean(speeds) * 3.6, 1),
                "avgWait": round(_mean(visible_waits), 1),
                "avgWaitAi": round(wait_ai, 1),
                "avgWaitFixed": round(wait_fixed, 1),
                "congestion": round(min(max(congestion, 0.0), 100.0), 1),
            },
            "vehicles": vehicles,
            "intersections": [self._intersection_dict(it) for it in self.intersections],
            "zones": self.zones,
            "emergency": self.emergency.to_dict() if self.emergency else None,
            "events": list(self.events),
        }

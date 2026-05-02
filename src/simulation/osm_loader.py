"""
OSM Loader — OpenStreetMap yo'l tarmog'ini yuklash

Amsterdam (yoki istalgan shahar) yo'l tarmog'ini OSMnx orqali yuklab,
disk ga saqlaydi. Keyingi ishga tushirishlarda diskdan o'qiydi (tez).
"""

import os
import json
import math
import random
from pathlib import Path
from typing import Dict, List, Tuple, Optional

try:
    import osmnx as ox
    import networkx as nx
    OSMNX_AVAILABLE = True
except ImportError:
    OSMNX_AVAILABLE = False
    print("⚠️  osmnx o'rnatilmagan. Buyruq: pip install osmnx networkx shapely")

# ──────────────────────────────────────────
# Sozlamalar
# ──────────────────────────────────────────
CITY_NAME    = "Amsterdam, Netherlands"
CITY_CENTER  = (52.3676, 4.9041)   # Amsterdam markazi
CACHE_DIR    = Path(__file__).resolve().parents[2] / "data"
GRAPHML_PATH = CACHE_DIR / "city_roads.graphml"
ROADS_JSON   = CACHE_DIR / "roads.json"


def download_and_cache(city: str = CITY_NAME) -> Optional[object]:
    """
    OSM grafini yuklab disk ga saqlaydi.
    Agar allaqachon saqlangan bo'lsa — diskdan o'qiydi.
    """
    if not OSMNX_AVAILABLE:
        return None

    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    if GRAPHML_PATH.exists():
        print(f"📂  Kesh topildi: {GRAPHML_PATH}")
        G = ox.load_graphml(str(GRAPHML_PATH))
        print(f"✅  Graf yuklandi: {len(G.nodes)} tugun, {len(G.edges)} segment")
        return G

    print(f"🌐  '{city}' yo'l tarmog'i yuklanmoqda (birinchi marta, 1-3 daqiqa)...")
    G = ox.graph_from_place(city, network_type="drive", simplify=True)

    # Tezlik va yo'lak ma'lumotlarini to'ldirish
    G = ox.add_edge_speeds(G)
    G = ox.add_edge_travel_times(G)

    ox.save_graphml(G, str(GRAPHML_PATH))
    print(f"✅  Saqlandi: {GRAPHML_PATH}")
    print(f"   Tugunlar: {len(G.nodes)}, Segmentlar: {len(G.edges)}")
    return G


def build_roads_json(G) -> dict:
    """
    Graf → frontend uchun soddalashtirilgan JSON
    Har bir yo'l segmenti uchun:
      - boshlang'ich / oxirgi koordinata
      - yo'laklar soni
      - tezlik limiti
      - yo'l turi (highway)
      - yo'l nomi
    """
    if not OSMNX_AVAILABLE:
        return {"nodes": [], "edges": [], "center": list(CITY_CENTER)}

    nodes_data = {}
    for node_id, data in G.nodes(data=True):
        nodes_data[str(node_id)] = {
            "id":  str(node_id),
            "lat": data["y"],
            "lng": data["x"]
        }

    edges_data = []
    seen = set()
    for u, v, data in G.edges(data=True):
        key = (min(u, v), max(u, v))
        if key in seen:
            continue
        seen.add(key)

        # Yo'l geometriyasi (bir nechta nuqta bo'lishi mumkin)
        coords = []
        if "geometry" in data:
            coords = [(pt[1], pt[0]) for pt in data["geometry"].coords]
        else:
            coords = [
                (G.nodes[u]["y"], G.nodes[u]["x"]),
                (G.nodes[v]["y"], G.nodes[v]["x"])
            ]

        lanes    = _parse_int(data.get("lanes", 1), default=1)
        speed    = _parse_float(data.get("speed_kph", data.get("maxspeed", 50)), default=50.0)
        highway  = data.get("highway", "residential")
        if isinstance(highway, list):
            highway = highway[0]
        name     = data.get("name", "")
        if isinstance(name, list):
            name = name[0] if name else ""
        length_m = data.get("length", 100.0)

        edges_data.append({
            "id":       f"{u}_{v}",
            "from":     str(u),
            "to":       str(v),
            "coords":   coords,
            "lanes":    lanes,
            "speed":    speed,
            "highway":  highway,
            "name":     name,
            "length_m": round(length_m, 1)
        })

    # Chorrahalar (degree >= 3)
    intersections = [
        str(n) for n, d in dict(G.degree()).items() if d >= 3
    ]

    result = {
        "center":        list(CITY_CENTER),
        "city":          CITY_NAME,
        "nodes":         list(nodes_data.values()),
        "edges":         edges_data,
        "intersections": intersections
    }

    ROADS_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(ROADS_JSON, "w", encoding="utf-8") as f:
        json.dump(result, f)
    print(f"✅  roads.json saqlandi ({len(edges_data)} segment, {len(intersections)} chorraha)")
    return result


def load_roads_json() -> dict:
    """Disk dan roads.json o'qish (server API uchun)"""
    if ROADS_JSON.exists():
        with open(ROADS_JSON, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"nodes": [], "edges": [], "center": list(CITY_CENTER), "intersections": []}


def get_random_node_ids(data: dict, count: int = 10) -> List[str]:
    """Tasodifiy tugun IDlarini olish"""
    node_ids = [n["id"] for n in data.get("nodes", [])]
    if not node_ids:
        return []
    return random.choices(node_ids, k=count)


# ──────────────────────────────────────────
# Yordamchi funksiyalar
# ──────────────────────────────────────────
def _parse_int(val, default=1) -> int:
    try:
        if isinstance(val, list):
            val = val[0]
        return int(str(val).split(";")[0].strip())
    except Exception:
        return default


def _parse_float(val, default=50.0) -> float:
    try:
        if isinstance(val, list):
            val = val[0]
        return float(str(val).split(";")[0].strip())
    except Exception:
        return default


# ──────────────────────────────────────────
# Asosiy (birinchi marta ishga tushirishda)
# ──────────────────────────────────────────
_graph  = None
_roads  = None

def get_graph():
    global _graph
    if _graph is None and OSMNX_AVAILABLE:
        _graph = download_and_cache()
        if _graph:
            build_roads_json(_graph)
    return _graph

def get_roads() -> dict:
    global _roads
    if _roads is None:
        if not ROADS_JSON.exists():
            g = get_graph()
            if g:
                _roads = build_roads_json(g)
            else:
                _roads = {"nodes": [], "edges": [], "center": list(CITY_CENTER), "intersections": []}
        else:
            _roads = load_roads_json()
    return _roads


if __name__ == "__main__":
    print("🚀  OSM Loader test...")
    data = get_roads()
    print(f"   Shahar: {data.get('city')}")
    print(f"   Markaz: {data.get('center')}")
    print(f"   Segmentlar: {len(data.get('edges', []))}")
    print(f"   Tugunlar:   {len(data.get('nodes', []))}")
    print(f"   Chorrahalar:{len(data.get('intersections', []))}")

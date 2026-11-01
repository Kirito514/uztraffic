"""
OQIM — jonli xarita uchun ko'chalar kataklari (OSM -> frontend/public/city/).

Xarita butun shaharni ko'rsatishi uchun ko'chalar ~1 km lik kataklarga bo'linadi;
brauzer faqat ekranda ko'rinayotgan kataklarni yuklaydi.

Har bir ko'cha (yo'nalishsiz, bir marta):
  p  — egri chiziq [[lng, lat], ...]
  n  — [u, v] uchlari (tugun id)
  l  — [oldinga, orqaga] bo'laklar soni (bir tomonlamada orqaga = 0)
  h  — OSM highway turi,  s — tezlik chegarasi (km/soat),  nm — nomi
Tugunlar: id -> [lng, lat, svetofor(0/1)] — svetofor OSM'dagi highway=traffic_signals.

Ishlatish:
  # loyihadagi markaz grafigidan (yuklab olishsiz)
  venv/Scripts/python.exe scripts/build_city_tiles.py --graphml data/city_roads.graphml
  # butun shahar: avval OSM'ni bo'laklab yuklash (scripts/fetch_tashkent_osm.py), keyin kataklar
  venv/Scripts/python.exe scripts/fetch_tashkent_osm.py
  venv/Scripts/python.exe scripts/build_city_tiles.py --xml cache/tashkent_drive.osm
  # yoki to'g'ridan-to'g'ri osmnx orqali (OSM Overpass'dan yuklaydi, bir necha daqiqa)
  venv/Scripts/python.exe scripts/build_city_tiles.py --place "Tashkent, Uzbekistan"
"""
from __future__ import annotations

import argparse
import json
import math
import time
from collections import defaultdict
from pathlib import Path

import osmnx as ox

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "public" / "city"

TILE_LAT = 0.01  # ~1.1 km
TILE_LNG = 0.0133  # Toshkent kengligida ~1.1 km

# OSM'da `lanes` yo'q bo'lsa — bir yo'nalishdagi bo'laklar soni ko'cha turiga qarab
DEFAULT_LANES = {
    "motorway": 3, "trunk": 3, "primary": 2, "secondary": 2, "tertiary": 1,
    "unclassified": 1, "residential": 1, "living_street": 1, "service": 1,
}
DEFAULT_SPEED = {"motorway": 100, "trunk": 80, "primary": 60, "secondary": 60, "tertiary": 50}


def first(v):
    """osmnx birlashtirilgan qirralarda qiymat ro'yxat bo'lib keladi: ['3', '4']"""
    return v[0] if isinstance(v, list) else v


def as_int(v) -> int | None:
    vals = v if isinstance(v, list) else [v]
    nums = []
    for x in vals:
        try:
            nums.append(int(float(str(x).split(";")[0])))
        except (TypeError, ValueError):
            pass
    return max(nums) if nums else None


def lanes_of(d: dict, oneway: bool) -> tuple[int, int]:
    hw = str(first(d.get("highway", ""))).replace("_link", "")
    total = as_int(d.get("lanes"))
    if oneway:
        n = total or DEFAULT_LANES.get(hw, 1)
        return min(n, 6), 0
    if total:
        fwd = math.ceil(total / 2)
        return min(fwd, 5), min(max(total - fwd, 1), 5)
    n = DEFAULT_LANES.get(hw, 1)
    return n, n


def tile_of(lng: float, lat: float) -> str:
    return f"{math.floor(lng / TILE_LNG)}_{math.floor(lat / TILE_LAT)}"


def build(G, source: str) -> None:
    roads_by_tile: dict[str, list] = defaultdict(list)
    nodes_by_tile: dict[str, set] = defaultdict(set)
    seen: set = set()
    signals = 0
    node_xy = {n: (round(d["x"], 6), round(d["y"], 6), 1 if d.get("highway") == "traffic_signals" else 0) for n, d in G.nodes(data=True)}
    signals = sum(v[2] for v in node_xy.values())

    for u, v, d in G.edges(data=True):
        oneway = bool(d.get("oneway"))
        # ikki tomonlama ko'cha grafda ikki yo'nalishli qirra — chizish uchun bittasi kifoya
        key = (min(u, v), max(u, v), str(d.get("osmid")), round(float(d.get("length", 0)), 1))
        if not oneway and key in seen:
            continue
        seen.add(key)
        if d.get("reversed") is True and not oneway:
            u, v = v, u  # asl OSM yo'nalishi
        if "geometry" in d:
            pts = [[round(x, 6), round(y, 6)] for x, y in d["geometry"].coords]
            if d.get("reversed") is True and not oneway:
                pts.reverse()
        else:
            pts = [list(node_xy[u][:2]), list(node_xy[v][:2])]
        fwd, back = lanes_of(d, oneway)
        hw = str(first(d.get("highway", "")))
        road = {
            "n": [str(u), str(v)],
            "p": pts,
            "l": [fwd, back],
            "h": hw,
            "s": as_int(d.get("maxspeed")) or DEFAULT_SPEED.get(hw.replace("_link", ""), 40),
        }
        name = first(d.get("name"))
        if name and isinstance(name, str):
            road["nm"] = name
        mid = pts[len(pts) // 2]
        t = tile_of(mid[0], mid[1])
        roads_by_tile[t].append(road)
        nodes_by_tile[t].update(road["n"])

    tiles_dir = OUT / "tiles"
    tiles_dir.mkdir(parents=True, exist_ok=True)
    for old in tiles_dir.glob("*.json"):
        old.unlink()
    total_roads = 0
    for t, roads in roads_by_tile.items():
        nodes = {n: list(node_xy[int(n)]) for n in nodes_by_tile[t]}
        (tiles_dir / f"{t}.json").write_text(json.dumps({"roads": roads, "nodes": nodes}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        total_roads += len(roads)

    xs = [x for x, _, _ in node_xy.values()]
    ys = [y for _, y, _ in node_xy.values()]
    index = {
        "source": source,
        "built": time.strftime("%Y-%m-%d %H:%M"),
        "tile": {"lng": TILE_LNG, "lat": TILE_LAT},
        "bounds": [[min(xs), min(ys)], [max(xs), max(ys)]],
        "center": [round((min(xs) + max(xs)) / 2, 6), round((min(ys) + max(ys)) / 2, 6)],
        "tiles": sorted(roads_by_tile),
        "roads": total_roads,
        "signals": signals,
    }
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    size = sum(f.stat().st_size for f in tiles_dir.glob("*.json"))
    print(f"✅ {total_roads} ko'cha, {len(roads_by_tile)} katak, {signals} svetofor tuguni, {size / 1e6:.1f} MB -> {OUT}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--graphml", help="tayyor osmnx grafigi (masalan data/city_roads.graphml)")
    src.add_argument("--xml", help="Overpass'dan curl bilan olingan .osm fayl (Python ulana olmagan tarmoqlar uchun)")
    src.add_argument("--place", help='OSM joy nomi, masalan "Tashkent, Uzbekistan"')
    ap.add_argument("--ipv6", action="store_true", help="Overpass'ga faqat IPv6 orqali ulanish (IPv4 manzili javob bermasa)")
    ap.add_argument("--overpass", help="boshqa Overpass serveri (asosiysi javob bermasa), masalan https://overpass.kumi.systems/api")
    a = ap.parse_args()
    if a.graphml:
        G = ox.load_graphml(ROOT / a.graphml)
        build(G, f"graphml:{a.graphml}")
    elif a.xml:
        print(f"⏳ {a.xml} o'qilmoqda …")
        G = ox.graph_from_xml(ROOT / a.xml, simplify=True, retain_all=False)
        build(G, f"osm-xml:{Path(a.xml).name}")
    else:
        if a.ipv6:
            # Overpass'ning ba'zi IPv4 manzillari ayrim tarmoqlardan javob bermaydi — IPv6 orqali ulanamiz
            import socket

            import urllib3.util.connection as urllib3_conn

            urllib3_conn.allowed_gai_family = lambda: socket.AF_INET6
        ox.settings.use_cache = True
        ox.settings.cache_folder = str(ROOT / "cache")
        ox.settings.requests_timeout = 300
        if a.overpass:
            ox.settings.overpass_url = a.overpass.rstrip("/")
        print(f"⏳ OSM'dan yuklanmoqda: {a.place} …")
        G = ox.graph_from_place(a.place, network_type="drive", simplify=True)
        build(G, f"osm:{a.place}")


if __name__ == "__main__":
    main()

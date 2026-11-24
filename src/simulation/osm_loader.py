"""
OSM Loader — Toshkent markazi yo'l tarmog'i

OSMnx orqali Toshkent markazidagi (Amir Temur xiyoboni atrofi, ~2.5 km)
`drive` tarmog'ini yuklaydi va server uchun ikkita fayl tayyorlaydi:

  data/city_roads.graphml — OSMnx grafining xom keshi
  data/roads.json         — simulyator uchun: yo'naltirilgan segmentlar
                            (geometriya, uzunlik, tezlik) va signal bilan
                            boshqariladigan chorrahalar ro'yxati

Server faqat roads.json ni o'qiydi; osmnx faqat birinchi yuklashda kerak.
Qayta yaratish:  python -m src.simulation.osm_loader --rebuild
"""

import json
import math
from pathlib import Path
from typing import Dict, List, Optional

CITY_NAME = "Toshkent"
CITY_CENTER = (41.3111, 69.2797)   # Amir Temur xiyoboni
CITY_DIST_M = 2500

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
GRAPHML_PATH = DATA_DIR / "city_roads.graphml"
ROADS_JSON = DATA_DIR / "roads.json"

# Chorraha tanlash sozlamalari
MAJOR_RANK = {"trunk": 5, "primary": 4, "secondary": 3, "tertiary": 2}
MERGE_RADIUS_M = 70        # bir chorrahaning tugunlari (ikki yo'nalishli ko'chalar)
SIGNAL_RADIUS_M = 100      # OSM svetofor tuguni shu masofada bo'lsa — bonus
MIN_SPACING_M = 250        # tanlangan chorrahalar orasidagi eng kam masofa
MAX_INTERSECTIONS = 18

# Rus/kirill nomlari uchun o'zbekcha muqobillar (OSM'da faqat kirillcha bo'lganlar)
NAME_OVERRIDES = {
    "Саларские ключи": "Salar",
    "Сапёрная Площадь": "Sapyor maydoni",
    "Шастри улица": "Shastri",
    "Махатмы Ганди улица": "Mahatma Gandi",
    "Ниёзбек йулли улица": "Niyozbek yo‘li",
    "Бешагач улица": "Beshyog‘och",
}

_CYR = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "ж": "j",
    "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o",
    "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "x", "ц": "ts",
    "ч": "ch", "ш": "sh", "щ": "sh", "ъ": "", "ы": "i", "ь": "", "э": "e", "ю": "yu",
    "я": "ya", "ў": "o‘", "қ": "q", "ғ": "g‘", "ҳ": "h",
}


# ──────────────────────────────────────────
# Geometriya yordamchilari
# ──────────────────────────────────────────
def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def bearing_deg(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Shimoldan soat yo'nalishida 0–360°."""
    dy = lat2 - lat1
    dx = (lng2 - lng1) * math.cos(math.radians((lat1 + lat2) / 2))
    return (math.degrees(math.atan2(dx, dy)) + 360) % 360


# ──────────────────────────────────────────
# Ko'cha nomlari
# ──────────────────────────────────────────
def _transliterate(text: str) -> str:
    out = []
    for ch in text:
        low = ch.lower()
        if low in _CYR:
            rep = _CYR[low]
            out.append(rep.capitalize() if ch != low and rep else rep)
        else:
            out.append(ch)
    return "".join(out)


def clean_street_name(raw: str) -> str:
    """
    OSM nomini qisqa o'zbekcha shaklga keltiradi:
    "Amir Temur shoh ko'chasi" → "Amir Temur", "Farg'ona Yo'li" → "Farg‘ona yo‘li".
    """
    if not raw:
        return ""
    if raw in NAME_OVERRIDES:
        return NAME_OVERRIDES[raw]
    name = raw.strip()
    if any("а" <= c.lower() <= "я" or c.lower() in "ёўқғҳ" for c in name):
        for suffix in (" улица", " проспект", " площадь", " Площадь", "улица ", "проспект "):
            name = name.replace(suffix, "")
        name = _transliterate(name).strip()
    # Apostrof turlarini birxillashtirish: o‘/g‘ uchun U+2018, tutuq uchun U+2019
    for ch in ("'", "`", "ʻ", "ʼ", "’", "‘"):
        name = name.replace(ch, "\u0001")
    chars = list(name)
    for i, ch in enumerate(chars):
        if ch == "\u0001":
            prev = chars[i - 1].lower() if i else ""
            chars[i] = "‘" if prev in ("o", "g") else "’"
    name = "".join(chars)
    for suffix in (" shoh ko‘chasi", " ko‘chasi", " nom.", " Ko‘chasi"):
        name = name.replace(suffix, "")
    name = name.replace(" Yo‘li", " yo‘li").replace(" Halqa", " halqa")
    return " ".join(name.split())


def _first(value):
    return value[0] if isinstance(value, list) and value else value


# ──────────────────────────────────────────
# Yuklash
# ──────────────────────────────────────────
def download_graph():
    """OSM grafini yuklab graphml keshga saqlaydi (yoki keshdan o'qiydi)."""
    import osmnx as ox

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if GRAPHML_PATH.exists():
        print(f"📂  Kesh topildi: {GRAPHML_PATH}")
        return ox.load_graphml(str(GRAPHML_PATH))

    print(f"🌐  {CITY_NAME} markazi yuklanmoqda ({CITY_DIST_M} m, drive)...")
    ox.settings.useful_tags_node = ["highway", "ref"]
    G = ox.graph_from_point(CITY_CENTER, dist=CITY_DIST_M, network_type="drive", simplify=True)
    G = ox.add_edge_speeds(G)
    G = ox.add_edge_travel_times(G)
    ox.save_graphml(G, str(GRAPHML_PATH))
    print(f"✅  Saqlandi: {GRAPHML_PATH} ({len(G.nodes)} tugun, {len(G.edges)} segment)")
    return G


def _build_edges(G) -> List[dict]:
    """Yo'naltirilgan segmentlar (parallel segmentlardan eng qisqasi olinadi)."""
    best: Dict[tuple, dict] = {}
    for u, v, data in G.edges(data=True):
        if u == v:
            continue
        if "geometry" in data:
            coords = [[round(y, 6), round(x, 6)] for x, y in data["geometry"].coords]
        else:
            coords = [
                [round(G.nodes[u]["y"], 6), round(G.nodes[u]["x"], 6)],
                [round(G.nodes[v]["y"], 6), round(G.nodes[v]["x"], 6)],
            ]
        length = float(data.get("length", 0.0)) or 1.0
        edge = {
            "from": str(u),
            "to": str(v),
            "coords": coords,
            "length": round(length, 1),
            "speed": round(float(data.get("speed_kph", 40.0)), 1),
            "highway": _first(data.get("highway")) or "road",
            "name": clean_street_name(_first(data.get("name")) or ""),
            "roundabout": data.get("junction") in ("roundabout", "circular"),
        }
        key = (edge["from"], edge["to"])
        if key not in best or best[key]["length"] > edge["length"]:
            best[key] = edge
    return list(best.values())


def _pick_intersections(G, edges: List[dict]) -> List[dict]:
    """
    Signal bilan boshqariladigan chorrahalarni tanlash.

    1. Nomzod tugun — kamida ikki xil nomli yirik ko'cha (trunk/primary/
       secondary/tertiary, aylanma emas) uchrashadigan tugun.
    2. 70 m ichidagi nomzodlar bitta chorrahaga birlashtiriladi
       (ikki yo'nalishli ko'chalarda bitta chorraha 2–4 tugundan iborat).
    3. Ball = ikki eng yirik ko'cha darajasi + OSM `highway=traffic_signals`
       tuguni yaqin bo'lsa bonus. Eng yuqori balllilar 250 m oraliq bilan olinadi.
    """
    node_streets: Dict[str, Dict[str, int]] = {}
    for e in edges:
        rank = MAJOR_RANK.get(e["highway"])
        if not rank or not e["name"] or e["roundabout"]:
            continue
        for n in (e["from"], e["to"]):
            streets = node_streets.setdefault(n, {})
            streets[e["name"]] = max(streets.get(e["name"], 0), rank)

    # Ko'chaning "mashhurligi" — tarmoqdagi segmentlar soni (nomlashda tartib uchun)
    street_size: Dict[str, int] = {}
    for e in edges:
        if e["name"]:
            street_size[e["name"]] = street_size.get(e["name"], 0) + 1

    pos = {str(n): (d["y"], d["x"]) for n, d in G.nodes(data=True)}
    signals = [str(n) for n, d in G.nodes(data=True) if d.get("highway") == "traffic_signals"]
    candidates = [n for n, s in node_streets.items() if len(s) >= 2]

    # Yaqin nomzodlarni birlashtirish (single-link)
    clusters: List[List[str]] = []
    unassigned = set(candidates)
    while unassigned:
        seed = unassigned.pop()
        group, frontier = [seed], [seed]
        while frontier:
            cur = frontier.pop()
            near = [n for n in unassigned if haversine_m(*pos[cur], *pos[n]) <= MERGE_RADIUS_M]
            for n in near:
                unassigned.discard(n)
                group.append(n)
                frontier.append(n)
        clusters.append(group)

    scored = []
    for group in clusters:
        lat = sum(pos[n][0] for n in group) / len(group)
        lng = sum(pos[n][1] for n in group) / len(group)
        streets: Dict[str, int] = {}
        for n in group:
            for name, rank in node_streets[n].items():
                streets[name] = max(streets.get(name, 0), rank)
        top = sorted(streets.values(), reverse=True)[:2]
        has_signal = any(haversine_m(lat, lng, *pos[s]) <= SIGNAL_RADIUS_M for s in signals)
        score = sum(top) + (3 if has_signal else 0)
        scored.append({"lat": lat, "lng": lng, "nodes": group, "streets": streets,
                       "signal": has_signal, "score": score})

    # Teng ballda markazga yaqinrog'i birinchi
    scored.sort(key=lambda c: (-c["score"], haversine_m(c["lat"], c["lng"], *CITY_CENTER)))
    chosen: List[dict] = []
    for c in scored:
        if len(chosen) >= MAX_INTERSECTIONS:
            break
        if all(haversine_m(c["lat"], c["lng"], o["lat"], o["lng"]) >= MIN_SPACING_M for o in chosen):
            chosen.append(c)

    # Nomlash: "Katta ko'cha — kesib o'tuvchi ko'cha". Muqobili kam chorrahalar
    # birinchi nomlanadi, shunda bir xil nom ikki marta chiqmaydi.
    used_names = set()
    for c in sorted(chosen, key=lambda c: len(c["streets"])):
        ranked = [n for n, _ in sorted(c["streets"].items(),
                                       key=lambda kv: (-kv[1], -street_size[kv[0]]))]
        pairs = [f"{a} — {b}" for i, a in enumerate(ranked) for b in ranked[i + 1:]]
        c["name"] = next((p for p in pairs if p not in used_names), None)
        used_names.add(c["name"])
    chosen = [c for c in chosen if c["name"]]

    # Chorraha tugunlariga markazga yaqin yirik ko'cha tugunlarini ham qo'shamiz
    # (ulanish rampalari chorrahani chetlab o'tmasligi uchun)
    major_nodes = {n for e in edges if e["highway"].replace("_link", "") in MAJOR_RANK
                   for n in (e["from"], e["to"])}
    result = []
    for i, c in enumerate(sorted(chosen, key=lambda c: (-c["lat"], c["lng"])), start=1):
        nodes = set(c["nodes"])
        nodes.update(n for n in major_nodes
                     if haversine_m(c["lat"], c["lng"], *pos[n]) <= MERGE_RADIUS_M / 1.5)
        result.append({
            "id": f"i{i:02d}",
            "name": c["name"],
            "lat": round(c["lat"], 6),
            "lng": round(c["lng"], 6),
            "nodes": sorted(nodes),
            "osmSignal": c["signal"],
        })
    return result


def build_roads_json(G) -> dict:
    edges = _build_edges(G)
    nodes = {str(n): [round(d["y"], 6), round(d["x"], 6)] for n, d in G.nodes(data=True)}
    intersections = _pick_intersections(G, edges)
    result = {
        "city": CITY_NAME,
        "center": list(CITY_CENTER),
        "distM": CITY_DIST_M,
        "nodes": nodes,
        "edges": edges,
        "intersections": intersections,
    }
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(ROADS_JSON, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False)
    print(f"✅  roads.json: {len(edges)} segment, {len(intersections)} chorraha")
    return result


def roads_geojson(roads: dict) -> dict:
    """Ko'chalar GeoJSON (har ikki yo'nalishli ko'cha bir marta)."""
    features = []
    seen = set()
    for e in roads["edges"]:
        key = tuple(sorted((e["from"], e["to"])))
        if key in seen:
            continue
        seen.add(key)
        features.append({
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": [[lng, lat] for lat, lng in e["coords"]]},
            "properties": {"highway": e["highway"], "name": e["name"]},
        })
    return {"type": "FeatureCollection", "features": features}


_roads: Optional[dict] = None


def get_roads() -> dict:
    """roads.json ni o'qiydi; yo'q bo'lsa OSM'dan yaratadi."""
    global _roads
    if _roads is None:
        if ROADS_JSON.exists():
            with open(ROADS_JSON, "r", encoding="utf-8") as f:
                _roads = json.load(f)
        else:
            _roads = build_roads_json(download_graph())
    return _roads


if __name__ == "__main__":
    import sys

    for _stream in (sys.stdout, sys.stderr):
        if hasattr(_stream, "reconfigure"):
            _stream.reconfigure(encoding="utf-8", errors="replace")
    if "--rebuild" in sys.argv:
        data = build_roads_json(download_graph())
    else:
        data = get_roads()
    print(f"   Shahar: {data['city']}  markaz: {data['center']}")
    print(f"   Segmentlar: {len(data['edges'])}  tugunlar: {len(data['nodes'])}")
    for it in data["intersections"]:
        flag = "OSM svetofor" if it["osmSignal"] else "yirik kesishma"
        print(f"   {it['id']}  {it['name']:<40} {it['lat']:.5f}, {it['lng']:.5f}  ({flag}, {len(it['nodes'])} tugun)")

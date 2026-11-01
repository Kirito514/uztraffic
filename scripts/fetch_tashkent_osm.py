"""
Toshkent ko'chalarini Overpass'dan bo'laklab yuklaydi va bitta .osm faylga birlashtiradi.

Nega curl va bo'laklar: butun shahar uchun bitta katta so'rovni Overpass ko'pincha
"server band" (504) deb rad etadi, ayrim tarmoqlarda esa Python'ning o'zi serverning
javob bermaydigan IPv4 manziliga urilib qoladi — curl bunda ishonchli ulanadi.

  venv/Scripts/python.exe scripts/fetch_tashkent_osm.py
  venv/Scripts/python.exe scripts/build_city_tiles.py --xml cache/tashkent_drive.osm
"""
from __future__ import annotations

import re
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "cache" / "tashkent_drive.osm"
PARTS = ROOT / "cache" / "osm_parts"
URL = "https://overpass-api.de/api/interpreter"

AREA = 3602216724  # Toshkent shahri chegarasi (OSM relation 2216724)
S, W, N, E = 41.15, 69.10, 41.42, 69.50  # chegarani o'rab turgan to'rtburchak
GRID = 3

FILTER = (
    '["highway"]["area"!~"yes"]'
    '["highway"!~"abandoned|bridleway|bus_guideway|construction|corridor|cycleway|elevator|escalator|footway|no|path|pedestrian|planned|platform|proposed|raceway|razed|service|steps|track"]'
    '["motor_vehicle"!~"no"]["motorcar"!~"no"]'
    '["service"!~"alley|driveway|emergency_access|parking|parking_aisle|private"]'
)


def fetch(i: int, s: float, w: float, n: float, e: float) -> Path:
    part = PARTS / f"part_{i}.osm"
    if part.exists() and part.stat().st_size > 2000 and b"<way" in part.read_bytes()[:2_000_000]:
        print(f"  {i}: oldin yuklangan")
        return part
    q = f"[out:xml][timeout:300];area({AREA})->.c;(way(area.c)({s},{w},{n},{e}){FILTER};);(._;>;);out;"
    for attempt in range(1, 5):
        r = subprocess.run(
            ["curl", "-s", "-m", "400", "-A", "OQIM/1.0 (traffic research)", "--data-urlencode", f"data={q}", URL, "-o", str(part), "-w", "%{http_code}"],
            capture_output=True, text=True,
        )
        code = r.stdout.strip()
        if code == "200" and part.stat().st_size > 0:
            print(f"  {i}: ok, {part.stat().st_size / 1e6:.1f} MB")
            return part
        wait = 30 * attempt
        print(f"  {i}: javob {code or r.returncode}, {wait} s dan keyin qayta …")
        time.sleep(wait)
    raise SystemExit(f"{i}-bo'lak yuklanmadi")


def main() -> None:
    PARTS.mkdir(parents=True, exist_ok=True)
    dlat, dlng = (N - S) / GRID, (E - W) / GRID
    parts = []
    i = 0
    for gy in range(GRID):
        for gx in range(GRID):
            parts.append(fetch(i, S + gy * dlat, W + gx * dlng, S + (gy + 1) * dlat, W + (gx + 1) * dlng))
            i += 1
            time.sleep(5)  # Overpass'ga xushmuomalalik

    # birlashtirish: tugun va yo'llar id bo'yicha bir marta (chegaradagi qirralar ikki bo'lakda ham bo'ladi)
    nodes: dict[str, str] = {}
    ways: dict[str, str] = {}
    # teglisiz tugun — `<node …/>`, teglisi — `<node …>…</node>` (ichidagi `<tag …/>` ni oxiri deb olmaslik kerak)
    node_re = re.compile(r'<node id="(\d+)"[^>]*?(?:/>|[^/]>.*?</node>)', re.S)
    way_re = re.compile(r'<way id="(\d+)".*?</way>', re.S)
    for p in parts:
        text = p.read_text(encoding="utf-8")
        for m in node_re.finditer(text):
            nodes.setdefault(m.group(1), m.group(0))
        for m in way_re.finditer(text):
            ways.setdefault(m.group(1), m.group(0))
    with OUT.open("w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<osm version="0.6" generator="OQIM fetch_tashkent_osm">\n')
        f.writelines(n + "\n" for n in nodes.values())
        f.writelines(w + "\n" for w in ways.values())
        f.write("</osm>\n")
    print(f"✅ {len(ways)} yo'l, {len(nodes)} tugun -> {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()

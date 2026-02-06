import requests
import json
import time
import os

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Tashkent quadrants to avoid timeout
# format: (min_lat, min_lng, max_lat, max_lng)
QUADRANTS = [
    (41.30, 69.10, 41.40, 69.25), # NW
    (41.30, 69.25, 41.40, 69.40), # NE
    (41.20, 69.10, 41.30, 69.25), # SW
    (41.20, 69.25, 41.30, 69.40)  # SE
]

def fetch_osm_data(bbox):
    query = f"""
    [out:json];
    (
      node["highway"="traffic_signals"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
      way["highway"~"primary|secondary|tertiary|motorway|trunk"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
    );
    out body;
    >;
    out skel qt;
    """
    response = requests.get(OVERPASS_URL, params={'data': query}, timeout=30)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error fetching data for bbox {bbox}: {response.status_code}")
        return None

def process_osm_data():
    all_signals = []
    all_roads = []
    
    # Track unique nodes and ways to avoid duplicates
    node_ids = set()
    way_ids = set()

    for idx, bbox in enumerate(QUADRANTS):
        print(f"Fetching quadrant {idx+1}/{len(QUADRANTS)}: {bbox}...")
        data = fetch_osm_data(bbox)
        if not data:
            continue
            
        elements = data.get('elements', [])
        
        # Temporary storage for nodes to resolve way coordinates
        nodes_cache = {el['id']: (el['lat'], el['lon']) for el in elements if el['type'] == 'node'}
        
        for el in elements:
            if el['type'] == 'node' and el.get('tags', {}).get('highway') == 'traffic_signals':
                if el['id'] not in node_ids:
                    all_signals.append({
                        "id": str(el['id']),
                        "lat": el['lat'],
                        "lng": el['lon'],
                        "name": el.get('tags', {}).get('name', f"Svetofor {el['id']}")
                    })
                    node_ids.add(el['id'])
            
            elif el['type'] == 'way':
                if el['id'] not in way_ids:
                    # Resolve coordinates for the way
                    positions = []
                    for node_ref in el.get('nodes', []):
                        if node_ref in nodes_cache:
                            positions.append(nodes_cache[node_ref])
                    
                    if len(positions) > 1:
                        all_roads.append({
                            "id": str(el['id']),
                            "name": el.get('tags', {}).get('name', f"Yo'l {el['id']}"),
                            "type": el['tags'].get('highway'),
                            "positions": positions
                        })
                        way_ids.add(el['id'])
        
        # Rate limiting sleep
        time.sleep(2)

    result = {
        "signals": all_signals,
        "roads": all_roads,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    
    output_path = "frontend/src/data/map_data.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        
    print(f"\nSuccess! Found {len(all_signals)} signals and {len(all_roads)} roads.")
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    process_osm_data()

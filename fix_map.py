import re

with open('web/js/map.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"const ENABLE_ROAD_OVERLAY = true;",
    "const ENABLE_ROAD_OVERLAY = false;",
    content
)

content = re.sub(
    r"const SHOW_CUSTOM_ROAD_LINES = true;",
    "const SHOW_CUSTOM_ROAD_LINES = false;",
    content
)

with open('web/js/map.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Map config updated successfully!")

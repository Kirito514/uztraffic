import re

with open('web/js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the problematic line and print context
idx = content.find('ulanib bo')
print("Context:", repr(content[idx-10:idx+60]))

# Replace any variant of the broken string
content = re.sub(
    r"appendChatMessage\('bot',\s*'Kechirasiz, serverga ulanib bo[^']*'\);",
    "appendChatMessage('bot', \"Kechirasiz, serverga ulanib bo'lmadi.\");",
    content
)

with open('web/js/app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")

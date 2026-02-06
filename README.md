# Aqlli Shahar Trafik Boshqaruv Tizimi 🚦

Avtoraqam GPS kuzatuv orqali real vaqtda trafik boshqaruv va svetofor optimallashtirish tizimi.

## Xususiyatlar

- 🛰️ **GPS Kuzatuv** - Har bir transport vositasini real vaqtda kuzatish
- 🚦 **Aqlli Svetofor** - Trafikka moslashgan avtomatik svetofor
- 📊 **Tirbandlik Bashorati** - AI yordamida trafik bashorati
- 🚑 **Maxsus Transport Ustuvorligi** - Tez yordam uchun yo'lni oldindan ochish
- 🗺️ **Live Dashboard** - Interaktiv xarita va statistika

## O'rnatish

```bash
# Virtual muhit yaratish
python -m venv venv
venv\Scripts\activate  # Windows

# Bog'liqliklari o'rnatish
pip install -r requirements.txt
```

## Ishga tushirish

```bash
# Simulyatsiyani ishga tushirish
python src/simulation/city_simulator.py

# API serverni ishga tushirish
python src/server/main.py

# Web dashboard'ni ochish
start web/index.html
```

## Loyiha Strukturasi

```
src/
├── iot/          # GPS datchik simulyatsiyasi
├── server/       # FastAPI backend
├── models/       # AI modellari
├── traffic_control/  # Svetofor boshqaruvi
├── emergency/    # Maxsus transport moduli
└── simulation/   # Shahar simulyatori

web/              # Web Dashboard
tests/            # Testlar
```

## Texnologiyalar

- **Backend:** Python, FastAPI
- **AI/ML:** TensorFlow, Scikit-learn
- **Database:** SQLite (demo), PostgreSQL (production)
- **Frontend:** HTML/CSS/JS, Leaflet.js
- **IoT:** MQTT protokoli

## Litsenziya

MIT License

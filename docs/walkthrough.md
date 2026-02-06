# 🚦 Shahar Trafik Boshqaruv Tizimi - Walkthrough

## ✅ Bajarilgan Ishlar

To'liq **Aqlli Shahar Trafik Boshqaruv Tizimi** yaratildi, quyidagi komponentlar bilan:

---

## 📁 Loyiha Strukturasi

```
e:\univer-loyihasi\ai-model-test\
├── src/
│   ├── iot/           ✅ GPS datchik simulyatsiyasi
│   ├── models/        ✅ AI/ML modellari
│   ├── emergency/     ✅ Maxsus transport ustuvorligi
│   ├── server/        ✅ FastAPI backend
│   └── simulation/    ✅ Shahar simulyatori
├── web/               ✅ Dashboard
├── tests/             ✅ Testlar
├── config.yaml        ✅ Konfiguratsiya
├── requirements.txt   ✅ Bog'liqliklari
└── README.md          ✅ Hujjat
```

---

## 🔧 Asosiy Komponentlar

### 1. IoT GPS Simulyatsiya (`src/iot/`)
| Fayl | Vazifasi |
|------|----------|
| [gps_device.py](file:///e:/univer-loyihasi/ai-model-test/src/iot/gps_device.py) | Virtual GPS datchik |
| [mqtt_publisher.py](file:///e:/univer-loyihasi/ai-model-test/src/iot/mqtt_publisher.py) | MQTT orqali ma'lumot yuborish |
| [device_manager.py](file:///e:/univer-loyihasi/ai-model-test/src/iot/device_manager.py) | Qurilmalar boshqaruvi |

### 2. AI Modellari (`src/models/`)
| Fayl | Algoritm |
|------|----------|
| [traffic_analyzer.py](file:///e:/univer-loyihasi/ai-model-test/src/models/traffic_analyzer.py) | Real-time trafik tahlili |
| [congestion_predictor.py](file:///e:/univer-loyihasi/ai-model-test/src/models/congestion_predictor.py) | LSTM/ML bashorat |
| [signal_optimizer.py](file:///e:/univer-loyihasi/ai-model-test/src/models/signal_optimizer.py) | Q-Learning optimallashtirish |

### 3. Emergency Vehicle Preemption (`src/emergency/`)
| Fayl | Vazifasi |
|------|----------|
| [evp_controller.py](file:///e:/univer-loyihasi/ai-model-test/src/emergency/evp_controller.py) | A* marshrut + svetofor preemption |

### 4. Server (`src/server/`)
[main.py](file:///e:/univer-loyihasi/ai-model-test/src/server/main.py) - FastAPI endpointlar:
- `GET /api/vehicles` - Barcha transport
- `GET /api/traffic/congestion` - Tirbandlik xaritasi
- `POST /api/emergency/activate` - Tez yordam
- `WS /ws/realtime` - Real-time yangilanishlar

### 5. Web Dashboard (`web/`)
[index.html](file:///e:/univer-loyihasi/ai-model-test/web/index.html) - Interaktiv dashboard:
- 🗺️ Leaflet.js xarita
- 📊 Chart.js grafiklar
- 🚨 Favqulodda signal modali

---

## 🚀 Ishga Tushirish

```bash
# 1. Virtual muhit
cd e:\univer-loyihasi\ai-model-test
python -m venv venv
venv\Scripts\activate

# 2. Bog'liqliklari
pip install -r requirements.txt

# 3. Simulyatsiya (oddiy)
python src/simulation/city_simulator.py

# 4. API Server
python src/server/main.py

# 5. Dashboard
start web\index.html
```

---

## 🧪 Tekshirish

```bash
python tests/test_all.py
```

**Kutilgan natija:** Barcha 7 ta test muvaffaqiyatli ✅

---

## 📝 Eslatma

Bu **simulyatsiya/demo** loyihasi. Real tizim uchun:
- GPS hardware integratsiyasi
- Production database (PostgreSQL)
- Kubernetes deployment
- Davlat miqyosida qonuniy baza

# 🚦 UzTraffic - Aqlli Shahar Trafik Boshqaruv Tizimi Tahlili

## 📋 Loyiha Haqida

**UzTraffic** - bu Toshkent shahri uchun mo'ljallangan zamonaviy trafik boshqaruv tizimi bo'lib, GPS kuzatuv, sun'iy intellekt va real vaqtda svetofor optimallashtirish orqali shahar trafikini samarali boshqaradi.

## 🎯 Asosiy Maqsad

Har bir transport vositasiga GPS datchik o'rnatish orqali:
- ✅ **100% aniq ma'lumot** - har bir mashina = 1 GPS
- ✅ **Real-time kuzatuv** - sekundlik yangilanishlar
- ✅ **Aqlli svetofor** - trafikka moslashgan vaqtlar
- ✅ **Maxsus transport ustuvorligi** - tez yordam uchun yo'l ochish

## 🏗️ Arxitektura

### Tizim Komponentlari

```
┌─────────────────────────────────────────────────┐
│              UzTraffic Tizimi                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  🚗 GPS Datchiklar  →  📡 4G/5G  →  🖥️ Server │
│                                         ↓       │
│                              ┌──────────────┐   │
│                              │ AI Modellari │   │
│                              └──────────────┘   │
│                                         ↓       │
│              ┌──────────────┬──────────────┐    │
│              ↓              ↓              ↓    │
│         🚦 Svetofor    🗺️ Dashboard   📱 API  │
└─────────────────────────────────────────────────┘
```

## 📁 Loyiha Strukturasi

```
uztraffic/
├── 📁 src/                      # Asosiy manba kodi
│   ├── 📁 iot/                  # GPS va IoT modullari
│   │   ├── gps_device.py        # Virtual GPS qurilma
│   │   ├── mqtt_publisher.py   # MQTT orqali ma'lumot yuborish
│   │   ├── device_manager.py   # Qurilmalar boshqaruvi
│   │   └── road_network.py     # Yo'l tarmog'i modeli
│   │
│   ├── 📁 server/               # FastAPI backend
│   │   └── main.py              # API server (34 endpoint)
│   │
│   ├── 📁 models/               # AI/ML modellari
│   │   ├── traffic_analyzer.py       # Trafik tahlili
│   │   ├── congestion_predictor.py   # Tirbandlik bashorati
│   │   └── signal_optimizer.py       # Svetofor optimallashtirish
│   │
│   ├── 📁 emergency/            # Maxsus transport moduli
│   │   └── evp_controller.py    # Emergency Vehicle Preemption
│   │
│   └── 📁 simulation/           # Shahar simulyatori
│       └── city_simulator.py    # To'liq trafik simulyatsiyasi
│
├── 📁 web/                      # Web Dashboard
│   ├── index.html               # Asosiy sahifa
│   ├── 📁 css/
│   │   └── style.css            # Modern dark theme
│   └── 📁 js/
│       ├── app.js               # Asosiy logika
│       ├── map.js               # Leaflet.js xarita
│       └── charts.js            # Chart.js grafiklar
│
├── 📁 docs/                     # Hujjatlar
│   ├── implementation_plan.md   # To'liq amalga oshirish rejasi
│   ├── task.md                  # Vazifalar ro'yxati
│   └── walkthrough.md           # Qo'llanma
│
├── 📁 tests/                    # Testlar
├── requirements.txt             # Python kutubxonalar
├── config.yaml                  # Tizim sozlamalari
├── run.py                       # Asosiy ishga tushirish fayli
└── README.md                    # Dokumentatsiya
```

## 🔧 Texnologik Stek

### Backend
- **Python 3.x** - asosiy dasturlash tili
- **FastAPI** - zamonaviy async web framework
- **Uvicorn** - ASGI server
- **Pydantic** - ma'lumotlar validatsiyasi

### AI/ML
- **TensorFlow ≥2.13.0** - chuqur o'rganish
- **Scikit-learn ≥1.3.0** - mashina o'rganish
- **NumPy, Pandas, SciPy** - ma'lumotlar tahlili

### Database
- **SQLite** - demo uchun
- **PostgreSQL** - production uchun
- **SQLAlchemy** - ORM
- **aiosqlite** - async SQLite

### IoT & Real-time
- **MQTT (paho-mqtt)** - GPS ma'lumotlar almashinuvi
- **WebSockets** - real-time dashboard yangilanishlari

### Frontend
- **HTML/CSS/JavaScript** - standart web texnologiyalar
- **Leaflet.js** - interaktiv xarita
- **Chart.js** - statistika grafiklari

## 🚀 Asosiy Xususiyatlar

### 1. 🛰️ GPS Kuzatuv Tizimi
- Har bir transport vositasini real vaqtda kuzatish
- Sekundlik joylashuv yangilanishlari
- GPS aniqlik: 2.5 metr
- Offline bufer qo'llab-quvvatlash

### 2. 🧠 AI-ga Asoslangan Tahlil
- **Traffic Analyzer** - trafik oqimini tahlil qilish
- **Congestion Predictor** - tirbandlik bashorati (15, 30, 60 daqiqa)
- **Signal Optimizer** - svetofor vaqtlarini optimallashtirish
- **Green Wave** - ketma-ket svetoforlarni sinxronlashtirish

### 3. 🚦 Aqlli Svetofor Boshqaruvi
- Trafikka moslashuvchi vaqtlar
- Minimal yashil vaqt: 15 sekund
- Maksimal yashil vaqt: 90 sekund
- Sariq chiroq: 3 sekund
- Hammasi qizil vaqt: 2 sekund

### 4. 🚨 Maxsus Transport Ustuvorligi (EVP)

> [!IMPORTANT]
> **Emergency Vehicle Preemption** - hayot saqlovchi funksiya!

Bu tizim tez yordam, o't o'chirish va politsiya mashinalari uchun yo'lni **oldindan** ochib beradi:

- 🚑 **Ambulanslar** - ustuvorlik darajasi: 1 (eng yuqori)
- 🚒 **O't o'chirish** - ustuvorlik darajasi: 1 (eng yuqori)
- 🚔 **Politsiya** - ustuvorlik darajasi: 2 (yuqori)
- 🚙 **VIP konvoy** - ustuvorlik darajasi: 3 (o'rtacha)

**Ishlash prinsipi:**
1. Maxsus mashina yo'lga chiqqanda GPS orqali joylashuvni aniqlaydi
2. AI maqsadgacha marshrut va vaqtni hisoblab chiqadi
3. Yo'ldagi svetoforlar **30 sekund oldin** yashilga o'tadi
4. Atrofdagi transport vositalar (500m radius) ogohlantiriladi
5. Mashina o'tgandan so'ng svetofor normal rejimga qaytadi

### 5. 🗺️ Live Dashboard
- **Interaktiv xarita** - barcha transport vositalarini ko'rish
- **Real-time statistika** - transport soni, tezlik, tirbandlik
- **Tirbandlik xaritasi** - rang kodlangan yo'l holati
- **Hodisalar jurnali** - muhim voqealar tarixi
- **Grafiklar** - trafik dinamikasi va tezlik taqsimoti

### 6. 📊 Real-time Statistika
- Jami transport vositalari
- O'rtacha tezlik (km/h)
- Tirbandlik darajasi (0-100%)
- Aktiv maxsus transport
- Yo'l holati bo'yicha taqsimot (erkin, yengil, o'rtacha, og'ir)

## 🔌 API Endpoints

Backend serveri quyidagi endpointlarni taqdim etadi:

### Transport Vozitalari
- `GET /api/vehicles` - barcha transport vositalari
- `GET /api/vehicles/{id}` - bitta transport ma'lumoti
- `POST /api/vehicles/position` - joylashuvni yangilash

### Trafik Tahlili
- `GET /api/traffic/overview` - umumiy statistika
- `GET /api/traffic/congestion` - tirbandlik xaritasi
- `GET /api/traffic/hotspots?threshold=70` - tirbandlik nuqtalari
- `POST /api/traffic/predict` - tirbandlik bashorati

### Svetoforlar
- `GET /api/signals` - barcha svetoforlar holati
- `POST /api/signals/optimize` - svetofor optimallashtirish

### Maxsus Transport
- `GET /api/emergency/status` - maxsus transport holati
- `POST /api/emergency/activate` - favqulodda rejimni yoqish
- `POST /api/emergency/deactivate/{id}` - rejimni o'chirish

### Real-time
- `WebSocket /ws/realtime` - real-time yangilanishlar

### Simulyatsiya
- `POST /api/simulation/step` - bitta simulyatsiya qadami
- `GET /api/simulation/stats` - simulyatsiya statistikasi

## ⚙️ Konfiguratsiya (config.yaml)

```yaml
city:
  name: "Toshkent"
  center:
    lat: 41.2995
    lng: 69.2401

simulation:
  time_step: 1              # sekund
  vehicle_count: 500        # transport vositalari soni
  intersection_count: 20    # chorrahalar soni
  emergency_vehicle_count: 10

gps:
  update_interval: 1        # sekundda
  accuracy: 2.5             # metr

traffic_signals:
  min_green_time: 15        # sekund
  max_green_time: 90        # sekund
  yellow_time: 3
  all_red_time: 2

emergency:
  preemption_time: 30       # sekund oldin
  notification_radius: 500  # metr

api:
  host: "0.0.0.0"
  port: 8000

database:
  type: "sqlite"
  path: "data/traffic.db"
```

## 📦 O'rnatish va Ishga Tushirish

### 1. Talablar

- **Python 3.10+**
- **pip** (Python package manager)
- **Virtual environment** (tavsiya etiladi)

### 2. O'rnatish Qadamlari

```bash
# Loyiha papkasiga kirish
cd /home/bekhruz/Desktop/loyihalar/uztraffic

# Virtual muhit yaratish
python3 -m venv venv

# Virtual muhitni faollashtirish
source venv/bin/activate      # Linux/Mac
# yoki
venv\Scripts\activate         # Windows

# Bog'liqliklarni o'rnatish
pip install -r requirements.txt
```

### 3. Ishga Tushirish Variantlari

#### A. To'liq Tizim (Server + Dashboard)

```bash
python run.py
```

Bu avtomatik ravishda:
- ✅ Barcha modullarni yuklab ishga tushiradi
- ✅ API serverni `http://localhost:8000` da ishga tushiradi
- ✅ Dashboard'ni brauzerda avtomatik ochadi
- ✅ WebSocket real-time ulanishini sozlaydi

#### B. Faqat Demo Simulyatsiya (Serverssiz)

```bash
python run.py --demo
```

Bu terminal'da 60 sekundlik trafik simulyatsiyasini ko'rsatadi:
- Progress bar bilan real-time ko'rsatkichlar
- Transport vositalari soni
- O'rtacha tezlik
- Tirbandlik darajasi

Davomiylikni o'zgartirish:
```bash
python run.py --demo --duration 120  # 120 sekund
```

#### C. Faqat Server (Dashboardssiz)

```bash
python run.py --server-only
```

#### D. Testlarni Ishga Tushirish

```bash
python run.py --test
```

### 4. API Hujjatini Ko'rish

Server ishga tushgandan so'ng:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **API Root**: http://localhost:8000/

### 5. Web Dashboard

Server ishga tushgandan so'ng dashboard avtomatik ochiladi yoki qo'lda oching:
```bash
# Brauzerda ochish
open web/index.html   # Mac
xdg-open web/index.html   # Linux
start web/index.html   # Windows
```

Dashboard xususiyatlari:
- 🗺️ Interaktiv xarita (Leaflet.js)
- 📊 Real-time statistika (transport, tezlik, tirbandlik)
- 📈 Dinamik grafiklar (Chart.js)
- 🚨 Maxsus transport ogohlantirish modali
- 📋 Hodisalar jurnali

## 🧪 Testlar

```bash
# Barcha testlarni ishga tushirish
python -m pytest tests/ -v

# Shahar simulyatorini test qilish
python src/simulation/city_simulator.py
```

## 📊 Simulyatsiya Test Senariylari

1. **Normal trafik** - kundalik holat (500 transport)
2. **Rush hour** - ertalab/kechqurun tirbandlik (1000+ transport)
3. **Avariya** - yo'l berkitilganda qayta yo'naltirish
4. **Tez yordam** - EVP tizimini test qilish
5. **Stadion tadbirlari** - juda ko'p transport bir manzil atrofida

## ⚠️ Muhim Eslatmalar

> [!WARNING]
> Bu **demo/simulyatsiya** loyihasi. Real tizim uchun qo'shimcha talab qilinadigan narsalar:

### Qo'shimcha Talab Qilinadigan Narsalar

1. **Real GPS Hardware**
   - NEO-6M yoki u-blox GPS modullari
   - ESP32 mikrokontroller
   - 4G LTE / LoRaWAN aloqa moduli

2. **Infratuzilma**
   - Production PostgreSQL database
   - Redis cache server
   - Load balancer
   - Cloud hosting (AWS, Azure, GCP)

3. **Xavfsizlik**
   - AES-256 shifrlash
   - HTTPS/SSL sertifikatlari
   - API autentifikatsiyasi va avtorizatsiyasi
   - DDoS himoya

4. **Qonuniy Baza**
   - Majburiy GPS o'rnatish qonuni
   - Ma'lumotlar himoyasi (GDPR o'zbek versiyasi)
   - Texnik standartlar sertifikatsiyasi

5. **Moliyaviy Tahlil**
   - 1 GPS datchik: 200,000 - 500,000 so'm
   - Server infratuzilmasi: 50,000,000+ so'm/yil
   - Xizmat ko'rsatish: 10,000,000 so'm/yil

## 🎯 Loyiha Maqsadlari

### Texnik Maqsadlar
- [x] GPS kuzatuv simulyatsiyasi
- [x] AI-ga asoslangan trafik tahlili
- [x] Svetofor optimallashtirish
- [x] EVP (Emergency Vehicle Preemption)
- [x] Real-time WebSocket ulanish
- [x] Interaktiv web dashboard

### Sifat Maqsadlari
- O'rtacha kutish vaqtini **30%** kamaytirish
- Tirbandlik aniqlik darajasi **95%+**
- Svetofor javob vaqti **<5 sekund**
- Tizim uptime **99.9%**

## 📚 Qo'shimcha Hujjatlar

Loyihada quyidagi to'liq hujjatlar mavjud:

1. **[implementation_plan.md](file:///home/bekhruz/Desktop/loyihalar/uztraffic/docs/implementation_plan.md)** - to'liq texnik reja (423 qator)
2. **[README.md](file:///home/bekhruz/Desktop/loyihalar/uztraffic/README.md)** - qisqacha qo'llanma
3. **[task.md](file:///home/bekhruz/Desktop/loyihalar/uztraffic/docs/task.md)** - vazifalar ro'yxati
4. **[walkthrough.md](file:///home/bekhruz/Desktop/loyihalar/uztraffic/docs/walkthrough.md)** - qadamma-qadam qo'llanma

## 🤝 Hissa Qo'shish

Bu o'quv/demo loyihasi. Real tizimni amalga oshirish uchun davlat va transport vazirligi bilan hamkorlik kerak bo'ladi.

## 📝 Litsenziya

MIT License - erkin foydalanish va o'zgartirish mumkin.

---

> [!TIP]
> Birinchi marta ishlatsangiz `python run.py --demo` buyrug'i bilan boshlang. Bu serverssiz oddiy simulyatsiyani ko'rsatadi va tizimni tushunishga yordam beradi!

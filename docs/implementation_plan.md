# 🚦 Aqlli Shahar Trafik Boshqaruv Tizimi

## Innovatsion Yechim: Avtoraqam GPS Kuzatuv Tizimi

Har bir transport vositasida **GPS datchik** orqali real vaqtda aniq trafik ma'lumotlarini yig'ish va svetoforlarni avtomatik boshqarish.

---

## 📋 Muammo va Yechim

### Hozirgi Muammo (Telefon-based):
| Muammo | Ta'siri |
|--------|---------|
| Bir mashinada 3+ telefon | Noto'g'ri transport soni |
| Telefonsiz haydovchilar | Ma'lumot yo'qolishi |
| GPS o'chirilgan telefonlar | Qamrov kamayishi |
| Kechikishlar | 2-5 daqiqa noaniqlik |

### Yangi Yechim (GPS Raqam Tizimi):
| Afzallik | Natija |
|----------|--------|
| ✅ Har bir mashina = 1 GPS | 100% aniqlik |
| ✅ Real-time kuzatuv | Sekundlik yangilanish |
| ✅ Markaziy baza | Barcha ma'lumotlar bir joyda |
| ✅ Avtomatik svetofor | Trafikka moslashgan vaqtlar |

---

## 🏗️ Tizim Arxitekturasi

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AQLLI SHAHAR TIZIMI                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ 🚗 Mashina 1 │    │ 🚙 Mashina 2 │    │ 🚕 Mashina N │          │
│  │  GPS Datchik │    │  GPS Datchik │    │  GPS Datchik │          │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘          │
│         │                   │                   │                   │
│         └───────────────────┼───────────────────┘                   │
│                             ▼                                       │
│                   ┌──────────────────┐                              │
│                   │  📡 4G/5G/LoRa   │                              │
│                   │   Tarmoq         │                              │
│                   └────────┬─────────┘                              │
│                            ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   🖥️ MARKAZIY SERVER                         │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐              │  │
│  │  │ Ma'lumot   │  │    AI      │  │  Svetofor  │              │  │
│  │  │   Bazasi   │──│  Modeller  │──│ Boshqaruvi │              │  │
│  │  └────────────┘  └────────────┘  └────────────┘              │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                             │                                       │
│         ┌───────────────────┼───────────────────┐                   │
│         ▼                   ▼                   ▼                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ 🚦 Svetofor  │    │ 🗺️ Web      │    │ 📱 Mobil    │          │
│  │   Tizimi     │    │  Dashboard   │    │   Ilova      │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Texnologiyalar

### Hardware (GPS Datchik)
| Komponent | Tavsif |
|-----------|--------|
| GPS moduli | NEO-6M yoki u-blox (aniqlik: 2.5m) |
| MCU | ESP32 (Wi-Fi + Bluetooth) |
| Aloqa | 4G LTE / LoRaWAN / NB-IoT |
| Quvvat | Mashina akkumulyatoridan / Quyosh batareyasi |
| Korpus | IP67 suv va changdan himoya |

### Software Stack
| Qatlam | Texnologiya |
|--------|-------------|
| Backend | Python + FastAPI |
| Database | PostgreSQL + Redis (cache) |
| AI/ML | TensorFlow, Scikit-learn |
| Real-time | WebSocket, MQTT |
| Frontend | HTML/CSS/JS + Leaflet.js |
| IoT Protocol | MQTT / CoAP |

---

## 📁 Loyiha Tuzilmasi

```
e:\univer-loyihasi\ai-model-test\
├── 📁 src/
│   ├── 📁 iot/                       # GPS datchik simulyatsiyasi
│   │   ├── gps_device.py             # Virtual GPS qurilma
│   │   ├── mqtt_publisher.py         # Ma'lumot yuborish
│   │   └── device_manager.py         # Qurilmalarni boshqarish
│   │
│   ├── 📁 server/                    # Markaziy server
│   │   ├── main.py                   # FastAPI server
│   │   ├── mqtt_subscriber.py        # GPS ma'lumotlarini qabul qilish
│   │   ├── database.py               # PostgreSQL ulanish
│   │   └── realtime.py               # WebSocket xizmati
│   │
│   ├── 📁 models/                    # AI modellari
│   │   ├── traffic_analyzer.py       # Trafik tahlili
│   │   ├── congestion_predictor.py   # Tirbandlik bashorati
│   │   ├── signal_optimizer.py       # Svetofor optimallashtirish
│   │   └── route_optimizer.py        # Yo'nalish tavsiyasi
│   │
│   ├── 📁 traffic_control/           # Svetofor boshqaruvi
│   │   ├── signal_controller.py      # Svetofor nazorati
│   │   ├── intersection.py           # Chorraha modeli
│   │   └── green_wave.py             # Yashil to'lqin algoritmi
│   │
│   └── 📁 simulation/                # To'liq simulyatsiya
│       ├── city_simulator.py         # Shahar simulyatori
│       ├── vehicle_generator.py      # Transport generatori
│       └── scenarios.py              # Test senariyalari
│
├── 📁 web/                           # Web Dashboard
│   ├── index.html                    # Asosiy sahifa
│   ├── 📁 css/
│   │   └── style.css                 # Modern dark theme
│   └── 📁 js/
│       ├── app.js                    # Asosiy logika
│       ├── map.js                    # Interaktiv xarita
│       ├── websocket.js              # Real-time ulanish
│       └── charts.js                 # Statistika grafiklari
│
├── 📁 tests/                         # Testlar
├── requirements.txt
├── config.yaml
└── README.md
```

---

## 🧠 AI Algoritmlari

### 1. Tirbandlik Darajasini Hisoblash
```python
def calculate_congestion(vehicles_data):
    """
    GPS ma'lumotlari asosida tirbandlik darajasi
    
    Kirish: [{vehicle_id, lat, lng, speed, timestamp}, ...]
    Chiqish: congestion_level (0-100%)
    """
    avg_speed = mean([v['speed'] for v in vehicles_data])
    expected_speed = road_speed_limit  # 60 km/h
    
    congestion = (1 - avg_speed / expected_speed) * 100
    return max(0, min(100, congestion))
```

### 2. Svetofor Vaqtini Optimallashtirish
```python
def optimize_signal_timing(intersection_data):
    """
    Q-Learning asosida optimal svetofor vaqti
    
    State: [north_queue, south_queue, east_queue, west_queue]
    Action: green_time for each direction
    Reward: -total_waiting_time
    """
    # Har bir yo'nalishdagi mashinalar soni
    queues = get_queue_lengths(intersection_data)
    
    # Proporsional vaqt taqsimoti
    total = sum(queues)
    green_times = [q / total * cycle_time for q in queues]
    
    return green_times
```

### 3. Yashil To'lqin (Green Wave)
```python
def calculate_green_wave(intersections, vehicle_speed=50):
    """
    Ketma-ket chorrahalar uchun sinxronlangan svetofor
    
    Mashinalar to'xtamasdan o'tishi uchun svetoforlar
    vaqti koordinatsiya qilinadi
    """
    offsets = []
    for i, intersection in enumerate(intersections):
        distance = intersection.distance_from_previous
        travel_time = distance / vehicle_speed * 3600  # sekundlarda
        offsets.append(travel_time)
    
    return offsets
```

### 4. 🚨 Maxsus Transport Ustuvorligi (Emergency Vehicle Preemption)

> [!TIP]
> Bu funksiya **hayot saqlovchi** - tez yordam, o't o'chirish va politsiya mashinalari uchun yo'lni oldindan ochib beradi!

```python
class EmergencyVehiclePreemption:
    """
    Maxsus transport vositalari uchun yo'lni oldindan ochish
    
    Ishlash prinsipi:
    1. Maxsus mashina yo'lga chiqganda tizimga signal beradi
    2. AI marshrut va vaqtni bashorat qiladi
    3. Yo'ldagi svetoforlar OLDINDAN yashilga o'tadi
    4. Boshqa transport vositalari ogohlantiriladi
    """
    
    VEHICLE_TYPES = {
        'ambulance': {'priority': 1, 'avg_speed': 80},    # 🚑 Eng yuqori
        'fire_truck': {'priority': 1, 'avg_speed': 60},   # 🚒 Eng yuqori
        'police': {'priority': 2, 'avg_speed': 90},       # 🚔 Yuqori
        'vip_convoy': {'priority': 3, 'avg_speed': 70},   # 🚙 O'rta
    }
    
    def predict_route(self, vehicle_id, destination):
        """
        Maxsus mashina marshrutini bashorat qilish
        
        Chiqish: [(chorraha_id, kutilgan_vaqt), ...]
        """
        current_location = self.get_vehicle_location(vehicle_id)
        route = self.calculate_optimal_route(current_location, destination)
        
        eta_per_intersection = []
        for intersection in route:
            eta = self.estimate_arrival_time(current_location, intersection)
            eta_per_intersection.append((intersection.id, eta))
        
        return eta_per_intersection
    
    def preempt_signals(self, route_with_eta):
        """
        Svetoforlarni oldindan yashilga o'tkazish
        
        - ETA dan 30 sekund oldin yashilga o'tadi
        - Boshqa yo'nalishlar qizilga o'tadi
        - Mashina o'tgandan so'ng normal rejimga qaytadi
        """
        for intersection_id, eta in route_with_eta:
            # 30 sekund oldin yashilga o'tkazish
            preempt_time = eta - timedelta(seconds=30)
            
            self.schedule_signal_change(
                intersection_id=intersection_id,
                change_time=preempt_time,
                phase='EMERGENCY_GREEN',
                direction=self.get_approach_direction(intersection_id)
            )
    
    def notify_nearby_vehicles(self, emergency_vehicle_id, route):
        """
        Atrofdagi mashinalarga ogohlantirish yuborish
        
        - Dashboard'da ogohlantirish ko'rsatish
        - Ovozli signal (agar ilova o'rnatilgan bo'lsa)
        - Alternativ yo'nalish tavsiyasi
        """
        nearby_vehicles = self.get_vehicles_on_route(route, radius=500)  # 500m
        
        for vehicle in nearby_vehicles:
            self.send_notification(
                vehicle_id=vehicle.id,
                message="⚠️ Tez yordam yaqinlashmoqda! Yo'l bering!",
                alternative_route=self.suggest_alternative(vehicle, route)
            )
```

**Tizim ishlash diagrammasi:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MAXSUS TRANSPORT USTUVORLIGI                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  🚑 Tez yordam chaqiruv                                                 │
│         │                                                               │
│         ▼                                                               │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│  │ GPS joylashuv│────▶│  Marshrut    │────▶│   ETA        │            │
│  │ aniqlash     │     │  hisoblash   │     │  bashorati   │            │
│  └──────────────┘     └──────────────┘     └──────┬───────┘            │
│                                                   │                     │
│         ┌─────────────────────────────────────────┘                     │
│         ▼                                                               │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │              Yo'ldagi chorrahalar                        │          │
│  │   🚦──────🚦──────🚦──────🚦──────🚦                     │          │
│  │   30s     60s     90s    120s    150s  (ETA)             │          │
│  │   oldin   oldin   oldin  oldin   oldin                   │          │
│  │   ▼       ▼       ▼      ▼       ▼                       │          │
│  │   🟢      🟢      🟢     🟢      🟢  (barchasi yashil)   │          │
│  └──────────────────────────────────────────────────────────┘          │
│                                                                         │
│         📱 Atrofdagi mashinalarga ogohlantirish                         │
│         "⚠️ Tez yordam yaqinlashmoqda!"                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Qo'shimcha fayllar:**

```
src/
├── 📁 emergency/                      # Maxsus transport moduli
│   ├── evp_controller.py             # Ustuvorlik boshqaruvi
│   ├── route_predictor.py            # Marshrut bashorati
│   ├── notification_service.py       # Ogohlantirish xizmati
│   └── vehicle_registry.py           # Maxsus mashinalar ro'yxati
```

---

## 🌐 API Endpointlar

| Endpoint | Method | Tavsif |
|----------|--------|--------|
| `/api/vehicles` | GET | Barcha mashinalar joylashuvi |
| `/api/vehicles/{id}` | GET | Bitta mashina ma'lumoti |
| `/api/traffic/congestion` | GET | Tirbandlik xaritasi |
| `/api/traffic/predict` | POST | Tirbandlik bashorati |
| `/api/signals` | GET | Svetoforlar holati |
| `/api/signals/{id}/optimize` | POST | Svetofor optimallashtirish |
| `/api/routes/optimal` | POST | Optimal yo'nalish |
| `/api/emergency/activate` | POST | Maxsus mashina yo'lga chiqdi |
| `/api/emergency/route` | GET | Maxsus mashina marshruti |
| `/api/emergency/preempt` | POST | Svetoforlarni oldindan o'zgartirish |
| `/ws/realtime` | WebSocket | Real-time yangilanishlar |

---

## ⚠️ Muhim E'tibordan Chetda Qolgan Narsalar

> [!CAUTION]
> Quyidagi masalalar loyiha muvaffaqiyati uchun juda muhim!

### 1. 🔐 Xavfsizlik va Maxfiylik
- **Ma'lumotlar shifrlash** - GPS ma'lumotlari shifrlanishi kerak (AES-256)
- **Anonim ID** - Mashina egasi aniqlanmasligi kerak
- **GDPR/Maxfiylik qonuni** - O'zbekiston ma'lumotlar himoyasi qonunlari
- **Kiberhujumlardan himoya** - DDoS, man-in-the-middle

### 2. 🔋 Quvvat Ta'minoti
- GPS datchik **24/7** ishlashi kerak
- Mashina o'chirilganda ham ma'lumot yuborish
- Akkumulyator zaryadsizlanishi muammosi
- **Yechim:** Kam quvvat sarflaydigan rejim + quyosh panel

### 3. 📶 Tarmoq Qamrovi
- Shaharning **hamma joyida** 4G/5G yo'q
- Yer osti yo'llari, tunnellar
- **Yechim:** Offline bufer + LoRaWAN backup

### 4. 📜 Qonuniy Baza
- Majburiy GPS o'rnatish uchun qonun kerak
- Davlat tomonidan moliyalashtirish
- Texnik standartlar va sertifikatsiya

### 5. 💰 Moliyaviy Tahlil
| Element | Taxminiy narx (so'm) |
|---------|---------------------|
| 1 ta GPS datchik | 200,000 - 500,000 |
| O'rnatish | 50,000 |
| Server infratuzilmasi | 50,000,000+ |
| Yillik xizmat | 10,000,000 |

### 6. 🚀 Bosqichma-bosqich Joriy Etish
1. **Pilot loyiha** - 1 tumanda 1000 ta mashina
2. **Kengaytirish** - Butun shahar
3. **Integratsiya** - YHX, Soliq, Sug'urta tizimlari

---

## ✅ Tekshirish Rejasi

### Avtomatik Testlar
```bash
# Barcha testlarni ishga tushirish
python -m pytest tests/ -v

# Simulyatsiyani ishga tushirish
python src/simulation/city_simulator.py --vehicles 1000 --duration 3600
```

### Demo Senariylar
1. **Normal trafik** - Kundalik holat
2. **Rush hour** - Ertalab/kechqurun tirbandlik
3. **Avariya** - Yo'l yopilganda qayta yo'naltirish
4. **Tadbir** - Stadion atrofida ko'p transport

### Muvaffaqiyat Mezonlari
- [ ] O'rtacha kutish vaqti **30%** kamayishi
- [ ] Tirbandlik aniqlik darajasi **95%+**
- [ ] Svetofor javob vaqti **< 5 sekund**
- [ ] Tizim uptime **99.9%**

---

## 📅 Amalga Oshirish Jadvali

| Bosqich | Vazifa | Vaqt |
|---------|--------|------|
| 1️⃣ | Loyiha strukturasi va asosiy fayllar | 30 min |
| 2️⃣ | GPS datchik simulyatsiyasi (IoT) | 45 min |
| 3️⃣ | Markaziy server va MQTT | 45 min |
| 4️⃣ | AI modellari (tahlil + bashorat) | 1 soat |
| 5️⃣ | Svetofor boshqaruv tizimi | 45 min |
| 6️⃣ | Web Dashboard (xarita + grafiklar) | 1 soat |
| 7️⃣ | Shahar simulyatsiyasi | 45 min |
| 8️⃣ | Test va dokumentatsiya | 30 min |

**Jami: ~6-7 soat**

---

> [!IMPORTANT]
> Bu reja simulyatsiya/demo loyihasi uchun. Real tizim uchun qo'shimcha infratuzilma va davlat miqyosida ish kerak bo'ladi.

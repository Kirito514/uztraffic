# OQIM Dashboard — API kontrakti (v1)

Frontend (`frontend/`, React) va backend (`src/`, FastAPI) shu kontrakt bo‘yicha ishlaydi.
Koordinatalar — `[lat, lng]` (WGS84). Vaqt — ISO 8601. Barcha matnlar o‘zbek lotinida (o‘ g‘ uchun U+2018).

## Shahar
Toshkent markazi, Amir Temur xiyoboni atrofi (`41.3111, 69.2797`), radius ≈ 2.5 km, OSM `drive` tarmog‘i.
Signal boshqariladigan **12–20 ta asosiy chorraha** (OSM `highway=traffic_signals` yoki yirik ko‘chalar kesishmasi), har biriga o‘zbekcha nom (ko‘cha nomlaridan: masalan “Amir Temur — Shahrisabz”).

## WebSocket `GET /ws/realtime`
Har **1 s** da bitta xabar — `Snapshot`:

```ts
type Snapshot = {
  t: string                    // server vaqti
  mode: 'ai' | 'fixed'         // global svetofor rejimi
  stats: {
    vehicles: number           // xaritadagi mashinalar
    avgSpeed: number           // km/soat
    avgWait: number            // s — joriy rejimdagi o‘rtacha kutish (oxirgi 5 daqiqa simulyatsiya vaqti)
    avgWaitAi: number          // s — xuddi shu oqimda AI rejimi (soya simulyatsiyasi)
    avgWaitFixed: number       // s — xuddi shu oqimda fiks taymer (soya simulyatsiyasi)
    congestion: number         // 0–100, o‘rtacha tirbandlik
  }
  vehicles: Vehicle[]
  intersections: Intersection[]
  zones: Zone[]                // DBSCAN tirbandlik zonalari
  emergency: Emergency | null
  events: Event[]              // oxirgi 20 ta, yangisi birinchi
}

type Vehicle = { id: string; lat: number; lng: number; heading: number; speed: number; type: 'car'|'bus'|'truck'|'ambulance'; emergency: boolean }

type Intersection = {
  id: string; name: string; lat: number; lng: number
  phase: 'NS' | 'EW'                       // hozir qaysi o‘q yashil
  state: 'green' | 'yellow' | 'allred'
  remaining: number                        // joriy fazagacha qolgan s
  queue: { ns: number; ew: number }        // kutayotgan mashinalar
  wait: number                             // s, shu chorrahada o‘rtacha kutish
  action: 0 | 1 | 2 | 3                     // oxirgi DQN harakati: NS15, EW15, NS30, EW30
  q: [number, number, number, number]      // oxirgi Q-qiymatlar (fiks rejimda ham hisoblanadi — ko‘rsatish uchun)
  preempted: boolean                        // tez yordam uchun majburiy yashil
}

type Zone = { id: string; lat: number; lng: number; radius: number /* m */; count: number; level: 'light'|'moderate'|'heavy' }
type Emergency = { id: string; route: [number, number][]; intersections: string[]; eta: number /* s */; vehicleId: string }
type Event = { id: string; t: string; kind: 'phase'|'zone'|'emergency'|'mode'|'gps'; text: string; intersectionId?: string }
```

## REST
| Metod | Yo‘l | Javob |
|---|---|---|
| GET | `/api/state` | `Snapshot` (WebSocket bilan bir xil) |
| GET | `/api/roads` | GeoJSON `FeatureCollection` — ko‘chalar `LineString`, `properties: { highway, name }` |
| GET | `/api/intersections/{id}/history?minutes=10` | `{ points: { t, queueNs, queueEw, wait, action, phase }[] }` |
| POST | `/api/mode` | body `{ mode: 'ai' \| 'fixed' }` → `{ mode }` |
| POST | `/api/emergency/route` | body `{ from: [lat,lng], to: [lat,lng] }` → `Emergency` (eng qisqa yo‘l, yo‘ldagi chorrahalar oldindan yashil) |
| DELETE | `/api/emergency` | tez yordamni bekor qilish → `{ ok: true }` |
| POST | `/api/vehicles/update` | (mavjud) telefon GPS’i — xaritada haqiqiy mashina sifatida chiqadi |

## Halollik qoidalari
- Hamma raqam simulyatsiyadan keladi; “real Toshkent trafigi” deb da’vo qilinmaydi.
- `avgWaitAi` va `avgWaitFixed` — **bir xil kelish oqimida** parallel yuritilgan ikki soya simulyatsiyadan (adolatli taqqoslash).
- Fiks taymer: har yo‘nalishga 30 s yashil (uzun yashil), qisqa yashil bilan sun’iy yomonlashtirilmaydi.

# Aqlli Shahar Trafik Boshqaruv Tizimi 🚦

# OQIM AI — To'liq Kod va Qatorlar Tahlili

---

## 1-qism: Kutubxonalar va Sozlamalar

```python
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import matplotlib.pyplot as plt
from sklearn.cluster import DBSCAN
from collections import deque
import random
import copy

EPISODES      = 500
BATCH_SIZE    = 64
GAMMA         = 0.99
EPSILON_START = 1.0
EPSILON_END   = 0.01
EPSILON_DECAY = 0.995
LEARNING_RATE = 0.0005
MEMORY_SIZE   = 5000
TARGET_UPDATE = 10
```

### 1. Kutubxonalar — Har biri nima uchun?

`import torch` — PyTorch asosi. Neyron tarmoq tensorlarini yaratadi va hisoblaydi.

`import torch.nn as nn` — Qatlamlar: `Linear`, `ReLU`, `Sequential`. Neyron tarmoq shu orqali quriladi.

`import torch.optim as optim` — Adam optimizatori. Modelni o'qitadi, parametrlarni yangilaydi.

`import numpy as np` — Matematik hisob-kitoblar. `np.random.poisson()` — mashinalar kelishini simulyatsiya qiladi.

`from sklearn.cluster import DBSCAN` — Tirbandlik zonalarini aniqlash algoritmi.

`from collections import deque` — AI xotirasi (Replay Memory). To'lganda eskisini o'zi o'chiradi.

`import copy` — Target Network uchun modelning to'liq nusxasini oladi.

---

### 2. Sozlamalar — Har bir qiymat nima qiladi?

`EPISODES = 500` — AI 500 marta o'rganishga urinadi. `300` qilsak — yetarli o'rganmaydi. `1000` qilsak — ko'proq vaqt ketadi, aniqroq natija.

`BATCH_SIZE = 64` — Har o'qitishda xotiradan 64 ta tajriba olinadi. `16` qilsak — tez lekin beqaror. `256` qilsak — sekin lekin barqaror.

`GAMMA = 0.99` — Kelajak mukofotining og'irligi. `0.99` → kelajak deyarli hozirgi kabi muhim. `0.5` qilsak → AI faqat hozirgi tsiklni ko'radi. `1.0` qilsak → matematik muammo yuzaga keladi.

`EPSILON_START = 1.0` — Boshida AI 100% tasodifiy harakat qiladi. `0.5` qilsak — boshdan yarmi tasodifiy, AI kam o'rganadi.

`EPSILON_END = 0.01` — Oxirida AI 1% tasodifiy qoladi. `0.0` qilsak — AI yangi sharoitga moslasha olmaydi.

`EPSILON_DECAY = 0.995` — Har epizodda `epsilon × 0.995`. `0.99` qilsak — epsilon tezroq tushadi. `0.999` qilsak — AI uzoq vaqt tasodifiy ishlaydi.

`LEARNING_RATE = 0.0005` — Adam optimallashtiruvchining qadami. `0.01` qilsak — model beqaror. `0.00001` qilsak — juda sekin o'rganadi.

`MEMORY_SIZE = 5000` — Xotirada 5000 ta tajriba saqlanadi. `500` qilsak — AI tarixni tez unutadi. `50000` qilsak — ko'p RAM kerak.

`TARGET_UPDATE = 10` — Har 10 epizodda Target Network yangilanadi. `1` qilsak — maqsad beqaror. `100` qilsak — target juda eskiradi.

---

## 2-qism: Chorraha Muhiti

```python
class Intersection:
    def __init__(self):
        self.ns_queue   = 0
        self.ew_queue   = 0
        self.step_count = 0
        self.max_steps  = 60

    def reset(self):
        self.ns_queue   = 0
        self.ew_queue   = 0
        self.step_count = 0
        return self.get_state()

    def get_state(self):
        return np.array([
            self.ns_queue / 40.0,
            self.ew_queue / 40.0,
            (self.step_count % 10) / 10.0
        ])

    def step(self, action):
        ns_incoming = np.random.poisson(8)
        ew_incoming = np.random.poisson(6)
        self.ns_queue += ns_incoming
        self.ew_queue += ew_incoming

        if   action == 0: ns_pass, ew_pass = 8,  0
        elif action == 1: ns_pass, ew_pass = 0,  8
        elif action == 2: ns_pass, ew_pass = 15, 0
        else:             ns_pass, ew_pass = 0,  15

        self.ns_queue = max(0, self.ns_queue - ns_pass)
        self.ew_queue = max(0, self.ew_queue - ew_pass)

        total_queue = self.ns_queue + self.ew_queue
        reward = 10.0 - total_queue * 0.5

        self.step_count += 1
        done = self.step_count >= self.max_steps
        return self.get_state(), reward, done
```

### Muhit kodi — Har bir qator nima qiladi?

`self.ns_queue = 0` — Shimol-Janub navbatidagi mashinalar soni. Noldan boshlanadi. `10` qilsak — epizod allaqachon tirbandlikdan boshlanadi.

`self.max_steps = 60` — Har epizod 60 tsikl. `30` qilsak — AI qisqa muddatli strategiyani o'rganadi. `120` qilsak — har epizod uzoq.

`self.ns_queue / 40.0` — Normalizatsiya. 20 mashina → 0.5, 40+ → 1.0. Neyron tarmoq 0-1 orasida aniq ishlaydi. `1.0` ga bo'lsak — normalizatsiya yo'q, gradient portlashi mumkin.

`np.random.poisson(8)` — Data qayerdan keladi: real sensor emas, matematik model. O'rtacha 8 ta mashina, har safar boshqacha. Bu haqiqiy transport oqimiga mos.

`np.random.poisson(6)` — EW dan o'rtacha 6 ta. NS dan kam — asosiy va yonaki yo'lni modellashtiradi.

`if action == 0: ns_pass, ew_pass = 8, 0` — 4 ta harakat:
- Harakat 0 → NS qisqa yashil: 8 mashina o'tadi
- Harakat 1 → EW qisqa yashil: 8 mashina o'tadi
- Harakat 2 → NS uzun yashil: 15 mashina o'tadi
- Harakat 3 → EW uzun yashil: 15 mashina o'tadi

`max(0, self.ns_queue - ns_pass)` — Navbat manfiy bo'lmasligi uchun. 5 mashina bo'lsa, 8 o'tkazilsa — 0 bo'ladi, -3 emas.

`reward = 10.0 - total_queue * 0.5` — Mukofot: 0 mashina → +10, 20 mashina → 0, 40 mashina → -10, 80 mashina → -30. `0.5` ni `1.0` qilsak — AI qattiqroq jazolanadi, tezroq lekin beqaror o'rganadi.

`done = self.step_count >= self.max_steps` — 60 tsikl to'lganda `True`. AI yangi epizod boshlaydi. Bu bo'lmasa AI cheksiz o'ynab ketadi.

`return self.get_state(), reward, done` — Uchta qaytaradi: yangi holat, mukofot, tugadimi. Bu RL standart interfeysi.

---

## 3-qism: Neyron Tarmoq (DQN)

```python
class DQN(nn.Module):
    def __init__(self, state_size=3, action_size=4):
        super(DQN, self).__init__()
        self.network = nn.Sequential(
            nn.Linear(state_size, 128),
            nn.ReLU(),
            nn.Linear(128, 128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, action_size)
        )

    def forward(self, x):
        return self.network(x)
```

### Neyron tarmoq kodi — Har bir qator nima qiladi?

`class DQN(nn.Module)` — `nn.Module` dan meros oladi. PyTorch da har bir model shunday yaratiladi.

`super(DQN, self).__init__()` — Asosiy `nn.Module` klassini ishga tushiradi. Bu bo'lmasa PyTorch qatlamlarni ko'rmaydi.

`nn.Sequential(...)` — Qatlamlar ketma-ket joylashadi. Biri chiqishi keyingisiga kiradi.

`nn.Linear(state_size, 128)` — 3 ta kirish → 128 ta signal. Ichida `3×128 + 128 = 512` ta o'rganuvchi parametr. `64` qilsak — kam parametr, murakkab qonuniyatlarni o'rgana olmaydi. `512` qilsak — ko'p parametr, sekin.

`nn.ReLU()` — `f(x) = max(0, x)`. Manfiy signallarni 0 ga tushiradi. Bu bo'lmasa — barcha qatlamlar bitta chiziqli funksiyaga teng bo'ladi, AI murakkab qonuniyat o'rgana olmaydi. `Sigmoid` qilsak — gradient yo'qolib ketishi muammosi yuzaga keladi.

`nn.Linear(64, action_size)` — `action_size=4`. 64 ta signal → 4 ta Q-qiymat. Har bir qiymat — bir harakatning baholari. `6` qilsak — 6 ta harakat kerak bo'lardi.

`def forward(self, x)` — `model(state)` chaqirilganda avtomatik ishga tushadi. Kirish → tarmoq → chiqish.

---

## 4-qism: Replay Memory (AI Xotirasi)

```python
class ReplayMemory:
    def __init__(self, capacity):
        self.memory = deque(maxlen=capacity)

    def push(self, state, action, reward, next_state, done):
        self.memory.append((state, action, reward, next_state, done))

    def sample(self, batch_size):
        return random.sample(self.memory, batch_size)

    def __len__(self):
        return len(self.memory)
```

### Replay Memory kodi — Har bir qator nima qiladi?

`deque(maxlen=5000)` — Ikkala tomoni bor navbat. `maxlen` to'lganda avtomatik eng eskisini o'chiradi. Oddiy `list` ishlatilsa — qo'lda o'chirish kerak bo'lardi.

`self.memory.append((state, action, reward, next_state, done))` — Har tsiklda 5 elementli tajriba yoziladi. Faqat `(state, action)` saqlasak — Bellman tenglamasi hisoblanmaydi.

`random.sample(self.memory, batch_size)` — 5000 tajribadan tasodifiy 64 tasi olinadi. `list(self.memory)[:64]` qilsak — faqat eng so'nggi 64 ta olinar edi — ketma-ket tajribalar korrelyatsiyali, neyron tarmoq siljib ketadi.

`def __len__` — `len(memory)` chaqirilganda ishlaydi. O'qitishni boshlash uchun xotirada 64 tajriba borligini tekshirishda ishlatiladi.

---

## 5-qism: O'qitish Funksiyasi

```python
def train_step(model, target_model, memory, optimizer):
    if len(memory) < BATCH_SIZE:
        return

    batch       = memory.sample(BATCH_SIZE)
    states      = torch.FloatTensor([b[0] for b in batch])
    actions     = torch.LongTensor([b[1] for b in batch])
    rewards     = torch.FloatTensor([b[2] for b in batch])
    next_states = torch.FloatTensor([b[3] for b in batch])
    dones       = torch.FloatTensor([b[4] for b in batch])

    current_q = model(states).gather(1, actions.unsqueeze(1))

    with torch.no_grad():
        next_q = target_model(next_states).max(1)[0]

    target_q = rewards + GAMMA * next_q * (1 - dones)

    loss = nn.SmoothL1Loss()(current_q, target_q.unsqueeze(1))
    optimizer.zero_grad()
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    optimizer.step()
```

### O'qitish funksiyasi — Har bir qator nima qiladi?

`if len(memory) < BATCH_SIZE: return` — Xotirada 64 tajribadan kam bo'lsa o'qitmaymiz. Boshida xotira bo'sh.

`torch.FloatTensor([b[0] for b in batch])` — 64 ta tajribadan holatlarni olib tensor yasaydi. `FloatTensor` — neyron tarmoq kasr son bilan ishlaydi.

`torch.LongTensor([b[1] for b in batch])` — Harakatlar butun son (0,1,2,3). `gather` uchun `LongTensor` kerak.

`model(states).gather(1, actions.unsqueeze(1))` — `model(states)` → 64×4 ta Q-qiymat matritsasi. `.gather` → har holat uchun faqat bajarilgan harakatning Q-qiymatini oladi. Masalan holat 5 da harakat 2 bo'lsa — faqat `q[5][2]` olinadi.

`with torch.no_grad(): next_q = target_model(next_states).max(1)[0]` — Target model orqali keyingi holatdagi maksimal Q-qiymat. `no_grad()` — gradient hisoblanmaydi, tezroq. `.max(1)[0]` — har qator bo'yicha maksimum, qiymatlar (indekslar emas).

`target_q = rewards + GAMMA * next_q * (1 - dones)` — Bellman tenglamasi: `target = r + 0.99 × next_q`. `(1 - dones)` — epizod tugagan bo'lsa kelajak mukofoti nol.

`nn.SmoothL1Loss()(current_q, target_q.unsqueeze(1))` — Hisoblangan va maqsad Q-qiymat orasidagi xatolik. `MSELoss` qilsak — katta xatolarda gradient portlaydi. `SmoothL1` katta xatolarda chiziqli ishlaydi.

`optimizer.zero_grad()` — Oldingi gradientlarni tozalaydi. Bo'lmasa — gradientlar qo'shiladi, noto'g'ri yangilanish.

`loss.backward()` — Backpropagation. Xatolikni har parametrga nisbatan differensiallab gradient hisoblaydi.

`clip_grad_norm_(model.parameters(), 1.0)` — Gradient normi 1.0 dan oshsa qisqartiradi. `2.0` qilsak — katta gradientlarga ruxsat, beqaror. `0.1` qilsak — juda kichik, sekin o'rganadi.

`optimizer.step()` — Gradientlar asosida parametrlar yangilanadi: `θ = θ - lr × gradient`. Bu bo'lmasa — hisoblangan lekin hech narsa o'zgarmaydi.

---

## 6-qism: Asosiy O'qitish Sikli

```python
env          = Intersection()
model        = DQN(state_size=3, action_size=4)
target_model = copy.deepcopy(model)
optimizer    = optim.Adam(model.parameters(), lr=LEARNING_RATE)
memory       = ReplayMemory(MEMORY_SIZE)
epsilon      = EPSILON_START
reward_log   = []

for episode in range(EPISODES):
    state        = env.reset()
    total_reward = 0

    for step in range(env.max_steps):
        if random.random() < epsilon:
            action = random.randint(0, 3)
        else:
            with torch.no_grad():
                q_values = model(torch.FloatTensor(state))
                action   = q_values.argmax().item()

        next_state, reward, done = env.step(action)
        memory.push(state, action, reward, next_state, done)
        state         = next_state
        total_reward += reward

        train_step(model, target_model, memory, optimizer)

        if done:
            break

    epsilon = max(EPSILON_END, epsilon * EPSILON_DECAY)

    if episode % TARGET_UPDATE == 0:
        target_model.load_state_dict(model.state_dict())

    reward_log.append(total_reward)

    if episode % 50 == 0:
        print(f"Epizod {episode:3d} | Reward: {total_reward:7.1f} | Epsilon: {epsilon:.3f}")
```

### Asosiy sikl — Har bir qator nima qiladi?

`copy.deepcopy(model)` — Asosiy modelning to'liq nusxasi. Target Network shu. `copy.copy()` qilsak — faqat havola nusxalanadi, haqiqiy nusxa emas — bir o'zgarganda ikkinchisi ham o'zgaradi.

`optim.Adam(model.parameters(), lr=LEARNING_RATE)` — Adam optimizatori. `SGD` qilsak — har parametrga bir xil o'rganish tezligi, DQN da kam samarali.

`env.reset()` — Har epizod boshida muhit nolga qaytadi. Birinchi holat qaytariladi.

`if random.random() < epsilon: action = random.randint(0, 3)` — Tasodifiy son epsilondan kichik bo'lsa — tasodifiy harakat (eksploratsiya). Boshida epsilon = 1.0 → hammasi tasodifiy.

`q_values.argmax().item()` — 4 ta Q-qiymatdan eng kattasining indeksini oladi. `.item()` — Python songa aylantiradi.

`memory.push(state, action, reward, next_state, done)` — Har tsikl tajribasi xotiraga yoziladi.

`state = next_state` — Holat yangilanadi. Bu bo'lmasa — AI bir joyda qotib qoladi.

`train_step(...)` — Har tsiklda o'qitish. Agar faqat epizod oxirida o'qitilsa — AI sekinroq o'rganadi.

`if done: break` — Epizod tugasa, qolgan tsikllarni o'tkazib yuboradi.

`epsilon = max(EPSILON_END, epsilon * EPSILON_DECAY)` — Epsilon kamayadi. `max(0.01, ...)` — 0.01 dan pastga tushmaydi.

`target_model.load_state_dict(model.state_dict())` — Har 10 epizodda asosiy model parametrlari target ga nusxalanadi.

`reward_log.append(total_reward)` — Har epizod mukofoti saqlanadi. Grafik uchun kerak.

---

## 7-qism: DBSCAN — Tirbandlik Aniqlash

```python
n_cars = 80
car_positions = np.random.randn(n_cars, 2) * 10

jam_center = np.random.uniform(-5, 5, (3, 2))
for center in jam_center:
    cluster = center + np.random.randn(15, 2) * 1.5
    car_positions = np.vstack([car_positions, cluster])

dbscan = DBSCAN(eps=6, min_samples=8)
labels = dbscan.fit_predict(car_positions)

n_jams = len(set(labels)) - (1 if -1 in labels else 0)
print(f"Aniqlangan tirbandlik zonalari: {n_jams} ta")
print(f"Erkin mashinalar: {(labels == -1).sum()} ta")
```

### DBSCAN kodi — Har bir qator nima qiladi?

`np.random.randn(n_cars, 2) * 10` — 80 ta mashinaning (x, y) koordinatasi. Tasodifiy tarqalgan — erkin harakatlanayotgan mashinalar.

`np.random.uniform(-5, 5, (3, 2))` — 3 ta tirbandlik markazini tasodifiy joylashtiradi.

`center + np.random.randn(15, 2) * 1.5` — Har markaz atrofida 15 ta mashina. `1.5` — qancha yaqin joylashgani. `0.5` qilsak — juda zich probka. `5` qilsak — siyrak, probka aniqlanmasligi mumkin.

`DBSCAN(eps=6, min_samples=8)` — `eps=6`: 6 metr radius. `min_samples=8`: kamida 8 mashina bo'lsa probka. `eps=2` qilsak — juda mayda probkalar. `eps=20` qilsak — butun yo'l bir klaster.

`labels = dbscan.fit_predict(car_positions)` — Har mashina uchun klaster raqami. `-1` → erkin mashina. `0`, `1`, `2` → probka zonalari.

`len(set(labels)) - (1 if -1 in labels else 0)` — Nechta unique klaster bor. `-1` shovqin bo'lgani uchun 1 ta ayriladi.

---

## 8-qism: Natijalar va Grafik

```python
plt.figure(figsize=(12, 4))

plt.subplot(1, 2, 1)
window = 20
smoothed = np.convolve(reward_log, np.ones(window)/window, mode='valid')
plt.plot(reward_log, alpha=0.3, color='steelblue', label='Har epizod')
plt.plot(range(window-1, len(reward_log)), smoothed,
         color='steelblue', lw=2, label=f"{window}-epizod o'rtacha")
plt.title("DQN O'qitish: Mukofot Dinamikasi")
plt.xlabel('Epizod')
plt.ylabel('Umumiy Mukofot')
plt.legend()
plt.grid(True, alpha=0.3)

plt.subplot(1, 2, 2)
scenarios = ['Hozirgi\n(Fiks)', 'AI\n(DQN)', 'Kelajak\n(V2X)']
values    = [233, 11, 6.7]
colors    = ['#e74c3c', '#3498db', '#2ecc71']
bars = plt.bar(scenarios, values, color=colors, width=0.5)
for bar, val in zip(bars, values):
    plt.text(bar.get_x() + bar.get_width()/2,
             bar.get_height() + 3, str(val), ha='center', fontweight='bold')
plt.title("O'rtacha Kutayotgan Mashinalar Soni")
plt.ylabel('Mashinalar soni')
plt.grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.show()
```

### Grafik kodi — Har bir qator nima qiladi?

`figsize=(12, 4)` — Grafik kengligi 12, balandligi 4 dyuym. Kichiklashtirsa — yozuvlar ustma-ust tushadi.

`plt.subplot(1, 2, 1)` — 1 qator, 2 ustun, birinchi katak. Ikki grafik yonma-yon joylashadi.

`np.convolve(reward_log, np.ones(window)/window, mode='valid')` — 20 epizodlik skользящий o'rtacha. Grafik silliqlashadi, shovqin kamayadi. `window=5` qilsak — kam silinqlashtiradi. `window=100` qilsak — juda silliq, tafsilotlar yo'qoladi.

`alpha=0.3` — Shaffoflik. Xom reward past shaffof, o'rtacha ustida to'q chiziq — ikkalasi ko'rinadi.

`plt.bar(scenarios, values, color=colors, width=0.5)` — Uch stsenariy taqqoslama bar diagrammasi: qizil (yomon), ko'k (AI), yashil (kelajak).

---

## 9. NIMA UCHUN AYNAN SHU ALGORITMLAR?

### DQN — nima uchun? (Q-Table emas)
Q-Table minglab holat uchun juda katta jadval kerak. DQN neyron tarmoq bilan istalgan holatni bashorat qiladi. Yangi ko'rilmagan holatlarda ham ishlaydi.

### PyTorch — nima uchun? (TensorFlow emas)
Dinamik grafik — debug oson. Akademik standart. Kod qisqa va tushunarli.

### DBSCAN — nima uchun? (K-Means emas)
K-Means da klaster soni oldindan berilishi kerak. Probka soni noma'lum. DBSCAN o'zi topadi, har qanday shaklda ishlaydi.

### SmoothL1Loss — nima uchun? (MSE emas)
Q-qiymatlar ba'zan juda katta. MSE da gradient portlaydi. SmoothL1 katta xatolarda chiziqli ishlaydi — xavfsiz.

### Puasson taqsimoti — nima uchun? (Uniform emas)
Real transport oqimi Puasson qonuniga bo'ysunadi. Uniform sun'iy va noto'g'ri.

### Adam — nima uchun? (SGD emas)
Har parametrga adaptiv o'rganish tezligi. DQN da parametrlar juda farqli — Adam buni hisobga oladi.

### Target Network — nima uchun? (Bitta model emas)
Bitta model bilan maqsad va hisob bir joydan — beqarorlik. Target "barqaror nishon" bo'lib xizmat qiladi.


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

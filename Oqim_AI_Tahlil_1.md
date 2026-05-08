# OQIM AI — TO'LIQ KOD TAHLILI VA SAVOL-JAVOB QO'LLANMASI
## Qism 1: Asoslar, Muhit va Neyron Tarmoq

---

## MUQADDIMA: Data qayerdan keladi?

**Qisqa javob:** Biz real kamera yoki sensor datasi ishlatmaymiz. Ma'lumotlarni **matematik model (Puasson taqsimoti)** yordamida o'zimiz generatsiya qilamiz.

**Nima uchun bu to'g'ri?** Bu "Proof of Concept" loyihasi — algoritmning ishlashini isbotlash maqsadida qurilgan. Real tizimda faqat bitta qator o'zgaradi: `np.random.poisson(8)` o'rniga kamera sensori ma'lumoti beriladi.

**Puasson taqsimoti nima?** Statistikada isbotlangan qonun: yo'lga mashinalarning kelishi Puasson qonuniga bo'ysunadi. O'rtacha 8 ta keladi, lekin tasodifiy ravishda 3 ta ham, 15 ta ham kelishi mumkin — xuddi haqiqiy hayotdagi kabi.

---

## BO'LIM 1: KUTUBXONALAR

### 1.1. Har bir import nima uchun kerak?

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
```

**`torch`** — PyTorch asosiy moduli. Neyron tarmoq tensorlarini (ko'p o'lchovli massivlar) yaratadi va hisob-kitob qiladi. GPU ga ham o'tkazish mumkin.

**`torch.nn`** — Neyron tarmoq qatlamlarini (`Linear`, `ReLU`, `Sequential`) o'z ichiga oladi. `nn.Linear(3, 128)` deb yozsak, 3 kirishdan 128 chiqish yasaydigan qatlam tayyor.

**`torch.optim`** — Modelni o'qituvchi optimallashtiruvchi. Biz `Adam` ishlatamiz — u har bir parametrning o'rganish tezligini avtomatik moslaydi.

**`numpy`** — Matematik massivlar va hisob-kitoblar. `np.random.poisson(8)` — Puasson taqsimoti.

**`matplotlib.pyplot`** — Reward grafigi va tirbandlik taqqoslash diagrammasini chizadi.

**`sklearn.cluster.DBSCAN`** — Tirbandlik zonalarini aniqlash. Zichlikka asoslangan klasterlash.

**`collections.deque`** — AI ning xotirasi (Replay Memory). Eski tajribalarni avtomatik o'chiradi.

**`random`** — Xotiradan tasodifiy tajriba tanlash uchun.

**`copy`** — Target Network uchun asosiy modelning nusxasini olish.

---

### 1.2. Global Sozlamalar (Hyperparameters)

```python
EPISODES       = 500
BATCH_SIZE     = 64
GAMMA          = 0.99
EPSILON_START  = 1.0
EPSILON_END    = 0.01
EPSILON_DECAY  = 0.995
LEARNING_RATE  = 0.0005
MEMORY_SIZE    = 5000
TARGET_UPDATE  = 10
```

**`EPISODES = 500`**
AI 500 marta chorrahani boshidan oxirigacha o'ynaydi. Har epizod 60 tsikldan iborat. Agar 300 ga tushirsak — AI yetarli o'rganmaydi. 1000 qilsak — ko'proq vaqt ketadi, lekin aniqroq.

**`BATCH_SIZE = 64`**
Har o'qitish bosqichida xotiradan 64 ta tajriba olinadi. Kichik batch (16) — tez lekin beqaror. Katta batch (256) — sekin lekin barqaror. 64 — muvozanat.

**`GAMMA = 0.99`**
Kelajak mukofotining "hozirgi qiymati". 0.99 = kelajak deyarli hozirgi kabi muhim. 0.5 = AI faqat hozirni ko'radi, keyingi tsiklni e'tiborsiz qoldiradi.

**`EPSILON_START = 1.0`**
Boshida AI 100% tasodifiy harakat qiladi — hamma variantni sinab ko'radi (Eksploratsiya).

**`EPSILON_END = 0.01`**
Oxirida AI 99% o'zi bilgan eng yaxshi harakatni tanlaydi, faqat 1% sinab ko'radi (Eksploatatsiya).

**`EPSILON_DECAY = 0.995`**
Har epizodda `epsilon *= 0.995`. Epsilon 1.0 dan 0.01 ga qancha sekin tushishini belgilaydi. Kichik qiymat = tezroq tushadi = AI erta "aqllilashadi" lekin kam o'rganadi.

**`LEARNING_RATE = 0.0005`**
Adam optimizatorining qadami. Juda katta (0.01) = model "sakrashlar" qiladi, beqaror. Juda kichik (0.00001) = juda sekin o'rganadi. 0.0005 — DQN uchun standart.

**`MEMORY_SIZE = 5000`**
Xotiraga maximum 5000 tajriba sig'adi. Yangi tajriba kelganda eng eskisi o'chadi (`deque` avtomatik qiladi).

**`TARGET_UPDATE = 10`**
Har 10 epizodda Target Network yangilanadi. Kichik qiymat = Target tez o'zgaradi = beqarorlik. Katta qiymat = Target eskiradi = sekin o'rganish.

---

## BO'LIM 2: CHORRAHA MUHITI (Environment)

### 2.1. Class tuzilmasi

```python
class Intersection:
    def __init__(self):
        self.ns_queue   = 0
        self.ew_queue   = 0
        self.step_count = 0
        self.max_steps  = 60
```

**`ns_queue`** — Shimol-Janub yo'nalishida kutayotgan mashinalar soni. Bu AI ko'radigan asosiy ma'lumot.

**`ew_queue`** — Sharq-G'arb yo'nalishidagi navbat.

**`step_count`** — Epizod ichida necha tsikl o'tganini sanaydi.

**`max_steps = 60`** — Har epizod 60 tsiklda tugaydi. Bu bir "o'yin seansi". Har tsikl ≈ 30 soniya bo'lsa, 60 tsikl ≈ 30 daqiqa real vaqt.

---

### 2.2. `reset()` — Epizodni qayta boshlash

```python
def reset(self):
    self.ns_queue   = 0
    self.ew_queue   = 0
    self.step_count = 0
    return self.get_state()
```

Har yangi epizod boshida navbatlar nolga tushadi va boshlanish holati qaytariladi. `get_state()` ni qaytaradi — AI birinchi ko'radigan ma'lumot.

---

### 2.3. `get_state()` — AI nima ko'radi?

```python
def get_state(self):
    return np.array([
        self.ns_queue / 40.0,
        self.ew_queue / 40.0,
        (self.step_count % 10) / 10.0
    ])
```

AI uchta son ko'radi:

**`self.ns_queue / 40.0`** — NS navbatini 0 dan 1 gacha normalizatsiya qiladi. Agar 20 mashina bo'lsa → 20/40 = 0.5. Agar 40 va undan ko'p bo'lsa → 1.0. **Nima uchun normalizatsiya?** Neyron tarmoqlar kichik (0-1) sonlar bilan yaxshiroq ishlaydi. 200 va 5 o'rniga 1.0 va 0.125 — gradient hisobi aniqroq.

**`(self.step_count % 10) / 10.0`** — Vaqt tsikli. 0 dan 1 gacha takrorlanadi. AI "tsiklning qaysi qismidamiz" ni biladi — pik soat siklmi, tushgan vaqtmi.

---

### 2.4. `step()` — Bir tsikl o'tkazish

```python
def step(self, action):
    # Yangi mashinalar keladi
    ns_incoming = np.random.poisson(8)
    ew_incoming = np.random.poisson(6)
    self.ns_queue += ns_incoming
    self.ew_queue += ew_incoming
```

**`np.random.poisson(8)`** — O'rtacha 8 ta mashina keladi, lekin har safar boshqacha. Bu haqiqiy transport oqimini modellashtiradi.

```python
    # Harakat 4 ta variant
    if   action == 0: ns_pass, ew_pass = 8,  0
    elif action == 1: ns_pass, ew_pass = 0,  8
    elif action == 2: ns_pass, ew_pass = 15, 0
    else:             ns_pass, ew_pass = 0,  15
```

**Harakat 0** — NS ga qisqa yashil (8 mashina o'tadi)
**Harakat 1** — EW ga qisqa yashil (8 mashina o'tadi)
**Harakat 2** — NS ga uzun yashil (15 mashina o'tadi)
**Harakat 3** — EW ga uzun yashil (15 mashina o'tadi)

```python
    self.ns_queue = max(0, self.ns_queue - ns_pass)
    self.ew_queue = max(0, self.ew_queue - ew_pass)
```

**`max(0, ...)`** — Navbat manfiy bo'lib ketmasligi uchun. Agar 5 mashina kutayotgan bo'lsa va 8 tasi o'tkazilsa — 0 qoladi, -3 emas.

```python
    total_queue = self.ns_queue + self.ew_queue
    reward = 10.0 - total_queue * 0.5
```

**Mukofot formulasi:**
- 0 mashina kutsa: `10 - 0*0.5 = +10` (maksimal)
- 20 mashina kutsa: `10 - 20*0.5 = 0`
- 40 mashina kutsa: `10 - 40*0.5 = -10`
- 80 mashina kutsa: `10 - 80*0.5 = -30` (juda yomon)

AI mukofotni maksimallashtirishga harakat qilgani uchun, navbatni kamaytirishga intiladi.

```python
    self.step_count += 1
    done = self.step_count >= self.max_steps
    return self.get_state(), reward, done
```

**`done`** — 60 tsikl tugadimi? Tugasa `True`, AI yangi epizod boshlaydi.

**`return`** — Uch narsa qaytaradi: yangi holat, mukofot, tugadimi. Bu standard Reinforcement Learning interfeysi (OpenAI Gym standartiga mos).

---

## BO'LIM 3: NEYRON TARMOQ (DQN)

### 3.1. Arxitektura

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
```

**`nn.Module`** dan meros oladi — PyTorch da har bir model shunday yaratiladi. `super().__init__()` asosiy klassni ishga tushiradi.

**`nn.Sequential`** — Qatlamlar ketma-ket joylashadi. Birinchi qatlamdan chiqish ikkinchisiga kiradi va hokazo.

**`nn.Linear(3, 128)`** — Chiziqli qatlam. 3 ta son kiradi, 128 ta son chiqadi. Ichida 3×128 = 384 ta o'rganuvchi parametr bor.

**`nn.ReLU()`** — Aktivatsiya funksiyasi. `f(x) = max(0, x)`. Manfiy sonlarni 0 ga aylantiradi. Bu neyron tarmoqqa nochiziqlilik beradi — aks holda barcha qatlamlar bitta chiziqli funksiyaga teng bo'lib qoladi.

**`nn.Linear(64, 4)`** — Chiqish qatlami. 4 ta son qaytaradi — har bir harakatning Q-qiymati.

### 3.2. `forward()` — Oldinga o'tish

```python
    def forward(self, x):
        return self.network(x)
```

Kirish tensor `x` (holat) ni qabul qilib, network orqali o'tkazadi va 4 ta Q-qiymat qaytaradi. `model(state)` deb chaqirilganda avtomatik ishga tushadi.

---

## BO'LIM 4: REPLAY MEMORY

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

**`deque(maxlen=5000)`** — Oxiridan element qo'shiladi, to'lib ketsa boshidan o'chadi. Eski tajribalar avtomatik yo'qoladi.

**`push()`** — Har tsikldan keyin (holat, harakat, mukofot, keyingi holat, tugadimi) xotiraga yoziladi. Bu 5-element tuple "tajriba" deyiladi.

**`sample(64)`** — 5000 ta tajribadan tasodifiy 64 tasini oladi. **Nima uchun tasodifiy?** Ketma-ket tajribalar bir-biriga korrelyatsiyalangan. Tasodifiy aralash olish o'rganishni barqarorlashtiradi — bu "Experience Replay" texnikasi.

**`__len__()`** — `len(memory)` chaqirilganda ishlaydi. O'qitishni boshlash uchun xotirada kamida `BATCH_SIZE` (64) tajriba bo'lishi kerakligini tekshirishda ishlatiladi.

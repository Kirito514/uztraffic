# OQIM AI — Epsilon Kamayishi va Loss Funksiyasi: To'liq Matematik Tahlil

---

## 1. EPSILON NIMA?

Epsilon (ε) — bu AI ning **tasodifiy harakat qilish ehtimoli**. 

- `ε = 1.0` → AI **100% tasodifiy** harakat qiladi (hech narsa bilmaydi)
- `ε = 0.5` → AI **50% tasodifiy**, 50% aqlli harakat qiladi
- `ε = 0.01` → AI **99% aqlli**, faqat 1% tasodifiy (to'liq o'rgangan)

Bu strategiya **Epsilon-Greedy** deb ataladi.

---

## 2. EPSILON-GREEDY ALGORITMI

```
Har tsiklda:
    tasodifiy_son = random.random()   # 0.0 dan 1.0 gacha

    AGAR tasodifiy_son < epsilon:
        → TASODIFIY harakat tanlash (Eksploratsiya — yangi narsalarni sinash)
    AKS HOLDA:
        → ENG YAXSHI harakatni tanlash (Eksploatatsiya — bilganini qilish)
```

**Nima uchun tasodifiy kerak?**
Agar AI faqat "eng yaxshi" harakatni qilsa — u hech qachon yangi strategiya sinab ko'rmaydi. Tasodifiylik AI ga "boshqa variantlar ham bormi?" deb tekshirishga imkon beradi.

**Hayotiy misol:**
Siz har kuni bir restoranga borasiz (eksploatatsiya). Lekin ba'zan yangi restoran sinab ko'rasiz (eksploratsiya). Agar hech qachon sinab ko'rmasangiz — eng yaxshi restoranni topa olmaysiz.

---

## 3. EPSILON QANDAY KAMAYADI? (Matematik formula)

### Formula:
```
epsilon = max(EPSILON_END, epsilon × EPSILON_DECAY)
```

### v2.0 qiymatlari:
```
EPSILON_START = 1.0      # Boshlang'ich
EPSILON_END   = 0.01     # Eng past chegara
EPSILON_DECAY = 0.99     # Kamayish koeffitsiyenti
```

### Qadam-ba-qadam hisoblash:

```
Epizod 0:   ε = 1.0
Epizod 1:   ε = max(0.01, 1.0 × 0.99)    = 0.990
Epizod 2:   ε = max(0.01, 0.99 × 0.99)   = 0.980
Epizod 3:   ε = max(0.01, 0.980 × 0.99)  = 0.970
...
Epizod 50:  ε = max(0.01, 1.0 × 0.99^50) = 0.605
Epizod 100: ε = max(0.01, 1.0 × 0.99^100)= 0.366
Epizod 200: ε = max(0.01, 1.0 × 0.99^200)= 0.134
Epizod 300: ε = max(0.01, 1.0 × 0.99^300)= 0.049
Epizod 400: ε = max(0.01, 1.0 × 0.99^400)= 0.018
Epizod 460: ε = max(0.01, 1.0 × 0.99^460)= 0.010  ← MAQSADGA YETDI!
Epizod 500: ε = max(0.01, ...)             = 0.010  (pastga tushmaydi)
```

### Umumiy formula:
```
ε(n) = max(0.01, 1.0 × 0.99^n)
```

Bu **eksponensial kamayish** (Exponential Decay) deyiladi. Boshida tez kamayadi, oxirida sekinlashadi.

### Nechta epizodda maqsadga yetadi?

```
0.01 = 1.0 × 0.99^n
0.01 = 0.99^n
ln(0.01) = n × ln(0.99)
n = ln(0.01) / ln(0.99)
n = -4.605 / -0.01005
n ≈ 458 epizod
```

### Eski versiya (v1.0) muammosi:

```
EPSILON_DECAY = 0.995 (eski)

n = ln(0.01) / ln(0.995)
n = -4.605 / -0.005013
n ≈ 919 epizod  ← 500 epizodda yetmaydi!

500-epizodda ε = 0.995^500 = 0.082 (8.2% tasodifiy — hali o'rganmagan)
```

**Shuning uchun 0.995 dan 0.99 ga tuzatildi.**

---

## 4. KODDA QAYERDA AMALGA OSHIRILADI?

```python
# O'qitish sikli ichida (har epizod oxirida):
epsilon = max(EPSILON_END, epsilon * EPSILON_DECAY)
#         ↑                  ↑          ↑
#    Eng past chegara   Hozirgi ε    Kamayish tezligi
#    (0.01 dan pastga   
#     tushmaydi)
```

**`max()` funksiyasi nima uchun kerak?**
`max(0.01, ...)` — epsilon hech qachon 0.01 dan pastga tushmaydi. Agar bu bo'lmasa:
- 0.99^1000 = 0.00004 — AI deyarli umuman tasodifiy qilmaydi
- Muhit o'zgarsa — AI moslasha olmaydi
- 1% tasodifiylik — "xavfsizlik tarmoq"i

---

## 5. LOSS FUNKSIYASI — SmoothL1Loss (Huber Loss)

### Nima qiladi?
Loss (xatolik) — neyron tarmoq bashoratining **haqiqiy javobdan qanchalik uzoqligini** o'lchaydi.

### Formulasi:

```
AGAR |x| < 1:
    Loss = 0.5 × x²          (kvadratik — kichik xatolarda aniq)
AKS HOLDA:
    Loss = |x| - 0.5          (chiziqli — katta xatolarda xavfsiz)
```

Bu yerda `x = current_q - target_q` (bashorat va maqsad orasidagi farq).

### Nima uchun MSELoss emas?

| | MSELoss | SmoothL1Loss (Huber) |
|---|---|---|
| Formula | `x²` | Kichikda `0.5x²`, kattada `|x|-0.5` |
| Katta xatolarda | **Gradient portlaydi** (100² = 10,000) | Chiziqli (xavfsiz) |
| Kichik xatolarda | Aniq | Aniq |
| DQN uchun | ❌ xavfli | ✅ barqaror |

**Misol:**
```
Xatolik = 50 bo'lsa:
  MSE:       50² = 2500     (juda katta gradient!)
  SmoothL1:  50 - 0.5 = 49.5  (boshqariladigan)

Xatolik = 0.3 bo'lsa:
  MSE:       0.3² = 0.09
  SmoothL1:  0.5 × 0.3² = 0.045  (deyarli bir xil)
```

### Kodda qayerda?

```python
# 1. Hozirgi Q-qiymatni hisoblash:
current_q = model(states).gather(1, actions.unsqueeze(1)).squeeze(1)
#           ↑                ↑
#    Neyron tarmoq     Bajarilgan harakat
#    4 ta Q-qiymat     uchun faqat bitta
#    chiqaradi         Q-qiymat olinadi

# 2. Maqsad Q-qiymatni hisoblash (Bellman tenglamasi):
with torch.no_grad():
    next_q = target_model(next_states).max(1)[0]
target_q = rewards + GAMMA * next_q * (1 - dones)
#          ↑         ↑        ↑          ↑
#    Hozirgi    Kelajak   Keyingi    Epizod tugagan
#    mukofot    ahamiyati  holatdagi  bo'lsa kelajak
#              (0.99)     eng yaxshi  mukofoti = 0
#                         Q-qiymat

# 3. Xatolikni hisoblash:
loss = nn.SmoothL1Loss()(current_q, target_q)
#      ↑                  ↑           ↑
#   Huber Loss     Bashorat      Maqsad
#   funksiyasi     (neyron       (Bellman
#                  tarmoq)       tenglamasi)
```

---

## 6. BELLMAN TENGLAMASI — Loss nima asosida hisoblanadi?

### Formula:
```
Q(s, a) = r + γ × max Q(s', a')
   ↑       ↑   ↑        ↑
   Hozirgi  Mukofot Kelajak  Keyingi holatdagi
   Q-qiymat        ahamiyati eng yaxshi Q
```

### Tushuntirish:
- `Q(s, a)` — "Shu holatda shu harakatni qilsam, kelajakda qancha mukofot olaman?"
- `r` — hozir olingan mukofot (reward)
- `γ = 0.99` — kelajak mukofotining ahamiyati (99% muhim)
- `max Q(s', a')` — keyingi holatda eng yaxshi harakat qancha mukofot beradi

### Misol:
```
Chorraha holati: NS=20 mashina, EW=5 mashina
AI harakat qildi: action=2 (NS ga uzun yashil)
Reward oldi: +3.5
Keyingi holatda eng yaxshi Q: +8.0

target_q = 3.5 + 0.99 × 8.0 = 3.5 + 7.92 = 11.42

Neyron tarmoq bashorat qildi: current_q = 9.0

Xatolik: |11.42 - 9.0| = 2.42
SmoothL1: 2.42 - 0.5 = 1.92  ← shu loss backpropagation qilinadi
```

---

## 7. BACKPROPAGATION — Loss dan neyron tarmoq qanday o'rganadi?

```python
optimizer.zero_grad()   # 1. Oldingi gradientlarni tozalash
loss.backward()         # 2. Loss dan har parametr uchun gradient hisoblash
clip_grad_norm_(...)    # 3. Gradient juda katta bo'lsa, qisqartirish
optimizer.step()        # 4. Parametrlarni yangilash
```

### Qadam-ba-qadam:

**1-qadam: `optimizer.zero_grad()`**
- Oldingi tsikldagi gradientlarni tozalaydi
- Bu bo'lmasa gradientlar qo'shiladi (noto'g'ri yangilanish)

**2-qadam: `loss.backward()`**
- **Backpropagation** — Loss qiymatidan barcha neyron tarmoq parametrlarigacha gradient hisoblanadi
- Har bir parametr uchun: "Shu parametrni o'zgartirsam, loss qancha o'zgaradi?"
- Zanjir qoidasi (Chain Rule) orqali hisoblaydi

**3-qadam: `clip_grad_norm_(model.parameters(), 1.0)`**
- Gradient normasi 1.0 dan oshsa — barcha gradientlarni proporsional qisqartiradi
- Bu **gradient portlashi** (gradient explosion) dan himoya qiladi
- DQN da Q-qiymatlar katta farq qilishi mumkin — shu sababli zarur

**4-qadam: `optimizer.step()`**
- Adam optimizatori yordamida parametrlarni yangilaydi:
- `θ_yangi = θ_eski - learning_rate × gradient`
- Adam har parametrga **adaptiv** o'rganish tezligi beradi

---

## 8. TARGET NETWORK — Nima uchun ikki model?

```python
# Asosiy model — har tsiklda yangilanadi (o'rganadi)
model = DQN()

# Target model — har 10 epizodda nusxalanadi (barqaror maqsad)
target_model = copy.deepcopy(model)

# Har 10 epizodda:
target_model.load_state_dict(model.state_dict())
```

### Muammo (bitta model bilan):
```
Q(s,a) = r + γ × max Q(s', a')  ← Q o'zgarsa, maqsad ham o'zgaradi!
  ↑                      ↑
  Bu Q ni yangilayman    Bu ham o'sha Q
```

O'rgatish paytida maqsad o'zi ham o'zgarib ketadi — "harakatlanuvchi nishon"ga o'q otishday. Hech qachon barqaror bo'lmaydi.

### Yechim (Target Network):
```
current_q = model(states)           ← O'rganayotgan model (har tsikl yangilanadi)
next_q = target_model(next_states)  ← Barqaror model (faqat har 10 epizodda yangilanadi)
```

Target model **10 epizod davomida o'zgarmaydi** — barqaror "nishon" bo'lib xizmat qiladi. 

---

## 9. XULOSA — BUTUN JARAYON

```
1. Muhit holati keladi: [NS=20, EW=5, vaqt=3]
                ↓
2. Epsilon-Greedy:
   - ε = 0.3 → 30% ehtimol tasodifiy, 70% ehtimol aqlli
   - random() = 0.8 > 0.3 → AQLLI harakat
                ↓
3. Model bashorat qiladi: Q = [2.1, 1.5, 8.7, 3.2]
   - action = argmax = 2 (NS uzun yashil)
                ↓
4. Muhit javob beradi: reward = +3.5, yangi_holat = [12, 11, 4]
                ↓
5. Xotiraga yoziladi: (holat, 2, 3.5, yangi_holat, False)
                ↓
6. Xotiradan 64 ta tajriba olinadi (Experience Replay)
                ↓
7. Bellman: target_q = r + 0.99 × max(target_model(next))
                ↓
8. Loss = SmoothL1(current_q, target_q) = 1.92
                ↓
9. Backpropagation: gradient hisoblash + parametrlar yangilash
                ↓
10. Epizod oxirida: ε = max(0.01, 0.3 × 0.99) = 0.297
                ↓
11. Har 10 epizodda: target_model ← model (nusxalash)
                ↓
12. 500 epizoddan keyin: AI chorrahani optimal boshqaradi
```

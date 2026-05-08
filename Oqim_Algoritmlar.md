# OQIM AI TRANSPORT TIZIMI: ALGORITMLAR TAVSIFI VA ISHLASH PRINSIPLARI

**Loyiha:** OQIM AI — Shahar Trafigini Sun'iy Intellekt Yordamida Boshqarish  
**Guruh:** 4  
**Maqsad:** Loyihada qo'llanilgan har bir algoritmning mohiyatini va tanlanish sababini to'liq yoritish

---

## 1. DEEP Q-NETWORK (DQN) — Svetaforlarni Aqlli Boshqarish

### Algoritm nima?
DQN — Kuchaytirib O'rganish (Reinforcement Learning) va Chuqur O'rganish (Deep Learning) ning kombinatsiyasi. Agent muhit bilan o'zaro ta'sirlashib, mukofot (reward) olish orqali o'rganadi.

### Nima uchun aynan shu algoritm?
Svetafor boshqaruvi — dinamik muammo. Qancha mashina kelishi oldindan ma'lum emas. Shu sababli:
- Statik qoida (30 soniya yashil, 30 soniya qizil) samarasiz
- Supervised learning uchun "to'g'ri javob" ma'lumotlari yo'q
- DQN esa atrof-muhitdan o'rganadi — xuddi inson haydovchisi kabi

### Qanday ishlaydi?

**Asosiy komponentlar:**
| Komponent | Funksiyasi |
|---|---|
| Agent | Svetafor boshqaruvchisi (AI) |
| Muhit (Environment) | Chorraha — mashinalar keladi va ketadi |
| Holat (State) | NS navbat, EW navbat, vaqt tsikli |
| Harakat (Action) | 4 ta variant: NS qisqa/uzun, EW qisqa/uzun yashil |
| Mukofot (Reward) | `10 - (total_queue × 0.5)` — kam mashina = ko'p mukofot |

**O'rganish jarayoni:**
```
1. AI holatni ko'radi (3 ta son: NS navbat, EW navbat, vaqt)
2. Neyron tarmoq orqali 4 ta harakatning Q-qiymatini hisoblaydi
3. Epsilon-greedy: ba'zan tasodifiy, ko'pincha eng yuqori Q-qiymatli harakat
4. Harakat amalga oshiriladi, mukofot olinadi, yangi holat kuzatiladi
5. Tajriba (s, a, r, s') xotiraga yoziladi
6. 64 ta tasodifiy tajriba olinib, Bellman tenglamasi bilan model yangilanadi
```

### Bellman Tenglamasi
```
Q(s, a) = r + γ × max Q(s', a')
```
- `Q(s, a)` — hozirgi holatda `a` harakatini bajarishning qiymati
- `r` — darhol olingan mukofot
- `γ = 0.99` — kelajak mukofotlarining hozirgi qiymati (Discount Factor)
- `max Q(s', a')` — keyingi holatdagi eng yaxshi harakatning qiymati

### Neyron Tarmoq Arxitekturasi
```
Kirish: 3 ta neyron  (NS navbat, EW navbat, vaqt)
    ↓
Yashirin 1: 128 neyron + ReLU
    ↓
Yashirin 2: 128 neyron + ReLU
    ↓
Yashirin 3: 64 neyron + ReLU
    ↓
Chiqish: 4 ta neyron (har bir harakatning Q-qiymati)
```

### Natija qanday o'lchanadi?
| Metrika | Boshlang'ich | Yakuniy | O'zgarish |
|---|---|---|---|
| Epizod Mukofoti | -2319 | +60 | +2379 |
| O'rtacha Kutish | 233 mashina | 11 mashina | 95.1% kamaydi |
| V2X Kelajak | — | 6.7 mashina | 97.1% kamaydi |

---

## 2. DBSCAN — Tirbandlik Zonalarini Aniqlash

### Algoritm nima?
DBSCAN (Density-Based Spatial Clustering of Applications with Noise) — zichlikka asoslangan klasterlash algoritmi. K-Means dan farqli ravishda, klaster sonini oldindan bilish shart emas va ixtiyoriy shaklda klaster topa oladi.

### Nima uchun aynan shu algoritm?
Tirbandlik zonalari tartibsiz shaklda bo'ladi — doira yoki to'rtburchak emas. DBSCAN:
- Har qanday shaklda tirbandlik "qorachasi" ni ajratib oladi
- Yolg'izcha ketayotgan mashinalarni "shovqin" (noise) sifatida belgilaydi
- Klaster soni o'zi aniqlanadi — nechta probka bo'lsa shuncha

### Qanday ishlaydi?
```python
dbscan = DBSCAN(eps=6, min_samples=8)
```
- `eps=6` — 6 metr radiusdagi qo'shnilar qidiriladi
- `min_samples=8` — kamida 8 ta mashina bo'lsa "probka" deb qabul qilinadi
- `labels == -1` — yolg'iz ketayotgan mashina (shovqin, probkaga kiritilmaydi)

**Ishlash:**
```
1. Har bir mashina uchun eps radiusdagi qo'shnilar sanaladi
2. Agar ≥ min_samples qo'shni bo'lsa — bu "yadro nuqtasi"
3. Yadro nuqtalari bir-biriga ulansa — bir klaster hosil qiladi
4. labels=-1 bo'lganlar alohida, erkin ketayotgan mashinalar
```

---

## 3. REPLAY MEMORY — Xotira Mexanizmi (DQN ning bir qismi)

### Nima uchun kerak?
DQN da ketma-ket tajribalardan o'rganish xavfli — har ikki ketma-ket holat bir-biriga o'xshash bo'ladi, bu neyron tarmoqni "mahalliy minimum" ga olib kiradi.

### Qanday ishlaydi?
```python
memory = deque(maxlen=5000)  # 5000 ta tajribani saqlaydi
memory.append((state, action, reward, next_state, done))
batch = random.sample(memory, 64)  # 64 ta TASODIFIY tajriba
```
Tasodifiy namuna olish orqali tajribalar aralashtiriladi — bu "Experience Replay" deb ataladi va o'rganishni barqarorlashtiradi.

---

## 4. TARGET NETWORK — O'rganish Barqarorligi

### Nima uchun kerak?
Bellman tenglamasida "maqsad" (`target`) va "hozirgi taxmin" bir xil modeldan kelsa, model o'zini ta'qib qiladi — bu beqarorlikka olib keladi.

### Qanday ishlaydi?
```python
target_model = copy.deepcopy(model)  # Asosiy modelning nusxasi
# Har 10 epizodda bir marta yangilanadi
if episode % 10 == 0:
    target_model.load_state_dict(model.state_dict())
```
Target Network asosiy modeldan 10 epizodda bir marta yangilanadi — bu maqsadni "barqaror nishon" ga aylantiradi.

---

## ALGORITMLAR QIYOSIY JADVALI

| Algoritm | Turi | Maqsad | Asosiy Metrika |
|---|---|---|---|
| DQN (PyTorch) | Reinforcement Learning | Svetaforlarni optimallashtirish | Reward, Tirbandlik % |
| DBSCAN | Unsupervised, Klasterlash | Probka zonalarini aniqlash | Silhouette, Klaster soni |
| Replay Memory | DQN komponenti | O'rganish barqarorligi | Loss (SmoothL1) |
| Target Network | DQN komponenti | Bellman maqsadini barqarorlashtirish | AUC of Training Curve |
| Epsilon-Greedy | Strategiya | Eksploratsiya/Eksploatatsiya muvozanati | Epsilon qiymati |

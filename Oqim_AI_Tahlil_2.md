# OQIM AI — TO'LIQ KOD TAHLILI VA SAVOL-JAVOB QO'LLANMASI
## Qism 2: O'qitish, DBSCAN, Natijalar va Savol-Javoblar

---

## BO'LIM 5: O'QITISH JARAYONI (Training Loop)

### 5.1. Model va Optimallashtiruvchi yaratish

```python
model        = DQN(state_size=3, action_size=4)
target_model = copy.deepcopy(model)
optimizer    = optim.Adam(model.parameters(), lr=LEARNING_RATE)
memory       = ReplayMemory(MEMORY_SIZE)
epsilon      = EPSILON_START
```

**`model`** — Asosiy neyron tarmoq. Har o'qitish bosqichida yangilanadi.

**`target_model = copy.deepcopy(model)`** — Asosiy modelning to'liq nusxasi. Har 10 epizodda yangilanadi. Bellman tenglamasidagi "maqsad" shu modeldan olinadi. Bu ikki model bo'lmasa — model o'z quyrug'ini ta'qib qiladi, beqarorlik yuzaga keladi.

**`optim.Adam(...)`** — Adam optimizatori. SGD dan farqi: har bir parametr uchun alohida o'rganish tezligini saqlab boradi. DQN uchun standart tanlov.

---

### 5.2. Asosiy O'qitish Sikli

```python
for episode in range(EPISODES):
    state = env.reset()
    total_reward = 0
```

Har epizod boshida muhit qayta ishga tushiriladi, mukofot nolga o'rnatiladi.

```python
    for step in range(env.max_steps):
        # Epsilon-Greedy harakat tanlash
        if random.random() < epsilon:
            action = random.randint(0, 3)
        else:
            with torch.no_grad():
                q_values = model(torch.FloatTensor(state))
                action = q_values.argmax().item()
```

**`random.random()`** — 0 dan 1 gacha tasodifiy son. Agar epsilon = 0.5 bo'lsa, 50% ehtimol bilan tasodifiy harakat qilinadi.

**`torch.no_grad()`** — Bu blokda gradient hisoblanmaydi. Harakat tanlashda gradient kerak emas — faqat o'qitishda kerak. Bu hisoblashni tezlashtiradi va xotirani tejaydi.

**`q_values.argmax().item()`** — 4 ta Q-qiymatdan eng kattasining indeksini oladi. Masalan `[2.1, 0.3, 3.7, 1.2]` → indeks 2 → Harakat 2 (NS uzun yashil).

```python
        next_state, reward, done = env.step(action)
        memory.push(state, action, reward, next_state, done)
        state = total_reward += reward
```

Harakat bajariladi, natija xotiraga yoziladi, holat yangilanadi.

---

### 5.3. O'qitish funksiyasi (train_step)

```python
def train_step():
    if len(memory) < BATCH_SIZE:
        return

    batch      = memory.sample(BATCH_SIZE)
    states     = torch.FloatTensor([b[0] for b in batch])
    actions    = torch.LongTensor([b[1] for b in batch])
    rewards    = torch.FloatTensor([b[2] for b in batch])
    next_states = torch.FloatTensor([b[3] for b in batch])
    dones      = torch.FloatTensor([b[4] for b in batch])
```

**`len(memory) < BATCH_SIZE`** — Xotirada 64 tajribadan kam bo'lsa o'qitmaymiz. Dastlabki tsikllarda xotira to'lmagan.

**Batch tensori yaratish:**
- `b[0]` — holat (3 ta son)
- `b[1]` — harakat (0,1,2,3 dan biri)
- `b[2]` — mukofot (float)
- `b[3]` — keyingi holat
- `b[4]` — tugadimi (True/False → 1.0/0.0)

```python
    current_q = model(states).gather(1, actions.unsqueeze(1))
```

**`model(states)`** — 64 ta holatdan 64×4 ta Q-qiymat matritsasi.

**`.gather(1, actions.unsqueeze(1))`** — Har bir holat uchun faqat bajarilgan harakatning Q-qiymatini oladi. Masalan holat 3 da harakat 2 tanlangan bo'lsa — faqat `q[3][2]` olinadi.

```python
    with torch.no_grad():
        next_q = target_model(next_states).max(1)[0]
    target_q = rewards + GAMMA * next_q * (1 - dones)
```

**`target_model(next_states).max(1)[0]`** — TARGET model (eski nusxa) orqali keyingi holatdagi maksimal Q-qiymat. `.max(1)` — har qator bo'yicha maksimum. `[0]` — qiymatlar (indekslar emas).

**Bellman tenglamasi:** `target_q = r + γ × max Q(s', a')`

**`(1 - dones)`** — Agar epizod tugagan bo'lsa (`done=1`), kelajak mukofoti nol bo'ladi. Tugagan holatning kelajagi yo'q.

```python
    loss = nn.SmoothL1Loss()(current_q, target_q.unsqueeze(1))
    optimizer.zero_grad()
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    optimizer.step()
```

**`SmoothL1Loss`** — Huber Loss ham deyiladi. MSE (kvadrat xato) dan farqi: katta xatolarda chiziqli, kichik xatolarda kvadratik. DQN da Q-qiymatlar ba'zan juda katta bo'ladi — SmoothL1 bu holatda barqaror ishlaydi.

**`optimizer.zero_grad()`** — Oldingi hisoblangan gradientlarni tozalaydi. PyTorch gradientlarni to'plab boradi — har o'qitishdan oldin tozalash shart.

**`loss.backward()`** — Backpropagation. Xatolik har bir parametrga nisbatan differensiallanadi. Zanjir qoidasi (Chain Rule) orqali gradientlar hisoblangai.

**`clip_grad_norm_(model.parameters(), 1.0)`** — Gradient norm 1.0 dan oshsa, uni 1.0 ga qisqartiradi. Bu "Gradient Explosion" ni oldini oladi — DQN da Q-qiymatlar portlab ketishi mumkin.

**`optimizer.step()`** — Hisoblangan gradientlar asosida parametrlar yangilanadi: `θ = θ - lr × ∇θ`

---

### 5.4. Epsilon Decay va Target Update

```python
    epsilon = max(EPSILON_END, epsilon * EPSILON_DECAY)

    if episode % TARGET_UPDATE == 0:
        target_model.load_state_dict(model.state_dict())
```

**`max(EPSILON_END, epsilon * EPSILON_DECAY)`** — Epsilon 0.01 dan pastga tushmaydi. Minimal darajada eksploratsiya saqlanadi.

**`load_state_dict(model.state_dict())`** — Asosiy modelning barcha parametrlari Target Network ga nusxalanadi. Bu "hard update" deyiladi. Alternativa "soft update": `θ_target = τ × θ + (1-τ) × θ_target`

---

## BO'LIM 6: DBSCAN — TIRBANDLIK ZONALARINI ANIQLASH

```python
dbscan = DBSCAN(eps=6, min_samples=8)
labels = dbscan.fit_predict(mashina_koordinatalari)
```

**DBSCAN qanday ishlaydi (5 ta qadam):**

1. Birinchi mashina olinadi
2. Uning `eps=6` metr radiusidagi barcha qo'shnilar topiladi
3. Agar ≥ `min_samples=8` qo'shni bo'lsa — bu "yadro nuqtasi", klaster boshlanadi
4. Yadro nuqtasining qo'shnilari ham tekshiriladi, ular ham yadro bo'lsa klaster kengayadi
5. Yangi kiruvchi nuqta yo'q bo'lganda klaster yakunlanadi

**`eps=6`** — 6 metr radius. Agar 6 metrdan yaqin ko'p mashina bo'lsa — "probka".

**`min_samples=8`** — Kamida 8 ta mashina bo'lmasa — probka emas, yolg'iz mashina.

**`labels == -1`** — Bu mashina hech qaysi klasterga kirmagan. Erkin ketayotgan mashina — "shovqin" (noise).

**K-Means dan farqi:**
- K-Means: klaster soni oldindan beriladi (`n_clusters=3`)
- DBSCAN: klaster soni o'zi topiladi, har qanday shaklda klaster topadi, probkani boshqa mashinalardan ajratadi

---

## BO'LIM 7: NATIJALAR VA TAQQOSLASH

### 7.1. Reward grafigi nima ko'rsatadi?

```
Epizod 1:   Reward ≈ -2319  (AI hamma narsani tasodifiy qiladi)
Epizod 100: Reward ≈ -706   (Biroz o'rganib qoldi)
Epizod 300: Reward ≈ -106   (Yaxshi o'rganmoqda)
Epizod 500: Reward ≈ +60    (AI optimal ishlamoqda)
```

Reward manfiydan musbatga o'tishi — AI navbatlarni boshqarishni o'rganganini bildiradi.

### 7.2. Loss grafigi nima ko'rsatadi?

Loss avval oshadi, keyin tushadi — bu NORMAL:
- **Boshi:** AI narsalarni sinayapti, kutilmagan natijalar → katta xatolik
- **O'rtasi:** AI qonuniyatlarni topa boshlaydi → loss tushadi
- **Oxiri:** AI barqarorlashadi → loss past va tekis

### 7.3. Uch bosqich taqqoslash

| Holat | O'rtacha kutish | Kamaytirish |
|---|---|---|
| Hozirgi (Fiks svetafor) | 233 mashina | — |
| AI (DQN) | 11 mashina | 95.1% |
| Kelajak (V2X) | 6.7 mashina | 97.1% |

**V2X nima?** Vehicle-to-Everything — mashinalar bir-biri va infratuzilma bilan bevosita aloqa qiladi. Svetafor mashinaga to'g'ridan-to'g'ri signal yuboradi, GPS kutilmaydi.

---

## BO'LIM 8: TUSHUNCHA-ATAMALAR

**Q-qiymat (Q-value):** Muayyan holatda muayyan harakat bajarilganda kutilayotgan umumiy mukofot. Qanchalik katta bo'lsa, shuncha yaxshi harakat.

**Bellman Tenglamasi:** `Q(s,a) = r + γ × max Q(s',a')`. Hozirgi harakatning qiymati = darhol mukofot + eng yaxshi kelajak mukofotining diskontlangan qiymati.

**Eksploratsiya vs Eksploatatsiya:** AI yangi narsalarni sinab ko'rishi (Eksploratsiya) bilan bilganini qo'llashi (Eksploatatsiya) o'rtasidagi muvozanat. Epsilon-greedy bu muvozanatni boshqaradi.

**Overfitting:** Model o'quv dataga juda moslashadi, yangi ma'lumotda yomon ishlaydi. DQN da Target Network va Replay Memory bu xavfni kamaytiradi.

**Gradient:** Xatolik funksiyasining parametrlarga nisbatan hosilasi. Gradient yo'nalishida parametrlar yangilanadi.

---

## BO'LIM 9: TEZKOR SAVOL-JAVOBLAR

**S: Nima uchun PyTorch ishlatildi?**
J: PyTorch — eng mashhur Deep Learning kutubxonasi. Dinamik hisoblash grafigi, oson debug, akademik va industrial standart. TensorFlow alternativ, lekin PyTorch kodi tushunarli.

**S: Neyron tarmoqda nechta qatlam bor?**
J: 4 ta chiziqli qatlam: `3→128`, `128→128`, `128→64`, `64→4`. Jami 3 ta ReLU aktivatsiya.

**S: AI nima ko'rib qaror qiladi?**
J: Faqat 3 ta son: NS navbat (normalizatsiyalangan), EW navbat (normalizatsiyalangan), vaqt tsikli.

**S: AI nechta harakat qila oladi?**
J: 4 ta: NS qisqa yashil, EW qisqa yashil, NS uzun yashil, EW uzun yashil.

**S: Bitta epizod qancha davom etadi?**
J: 60 tsikl. Har tsikl ≈ real hayotda 30 soniya.

**S: Nima uchun Replay Memory kerak?**
J: Ketma-ket tajribalar korrelyatsiyalangan bo'ladi — neyron tarmoq bir tomonga "siljib" ketadi. Tasodifiy aralash o'qitish barqarorlikni ta'minlaydi.

**S: Nima uchun 2 ta model (asosiy va target)?**
J: Bitta model ishlatilsa, Bellman tenglamasidagi "maqsad" har qadamda o'zgaradi — bu beqarorlik. Target Network "barqaror nishon" bo'lib xizmat qiladi.

**S: Data qayerdan olingan?**
J: Haqiqiy sensor yoki kamera datasi yo'q. Puasson taqsimoti bilan sintetik generatsiya qilingan. Bu ilmiy isbotlash uchun to'g'ri yondashuv.

**S: Natijalar ishonchli ekanligini qanday isbotlash mumkin?**
J: Reward grafigi manfiydan musbatga o'tishi, Loss grafigi pasayishi va 3 bosqichli taqqoslama (233→11→6.7 mashina) statistik dalil bo'lib xizmat qiladi.

**S: Loyihani real shahrda qo'llash uchun nima kerak?**
J: Faqat `np.random.poisson(8)` o'rniga haqiqiy kamera sensori ma'lumoti berish yetarli. Neyron tarmoq arxitekturasi va o'qitish jarayoni o'zgarmaydi.

**S: DBSCAN nima uchun K-Means emas?**
J: Tirbandlik zonalari doira shaklida bo'lmaydi. K-Means faqat doira shaklida klaster topadi. DBSCAN har qanday shaklda, va klaster soni oldindan berilishi shart emas.

**S: SmoothL1Loss nima uchun MSE emas?**
J: DQN da Q-qiymatlar ba'zan juda katta bo'ladi. MSE katta xatolarda gradientni portlatadi. SmoothL1 katta xatolarda chiziqli ishlaydi — bu gradient explosion xavfini oldini oladi.

**S: `clip_grad_norm_(model.parameters(), 1.0)` nima qiladi?**
J: Gradient vektorining normi (uzunligi) 1.0 dan oshsa, uni 1.0 ga proporsional qisqartiradi. Bu "Gradient Clipping" — modelni beqarorlikdan saqlaydi.

**S: Epsilon 0.01 da nima uchun nolga tushirilmadi?**
J: Minimal darajada eksploratsiya saqlanadi — yangi holatlar paydo bo'lganda AI qotib qolmasligi uchun. 1% tasodifiylik muhit o'zgarishlariga moslashish imkonini beradi.

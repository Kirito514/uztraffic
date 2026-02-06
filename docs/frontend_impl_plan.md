# Web Feature Integration Plan

## Maqsad
Eski `web/` papkasidagi **barcha** funksiyalarni React frontendga qo'shish.

## Qo'shiladigan Funksiyalar

### 1. **Grafiklar (Charts)**
- `CongestionChart.tsx` - Tirbandlik dinamikasi (real-time line chart)
- `SpeedChart.tsx` - O'rtacha tezlik grafigi
- Chart.js + react-chartjs-2 ishlatiladi

---

### 2. **Hodisalar Paneli (Events Panel)**
- `EventsPanel.tsx` - O'ng tomondagi hodisalar jurnali
- Yangi hodisalar yuqorida ko'rinadi
- Turlar: `info`, `warning`, `emergency`

---

### 3. **Xarita Yaxshilanishlari**
- **Yo'l tarmog'i** - Toshkent ko'chalari chiziqlari (Amir Temur, Navoiy, va h.k.)
- **Svetoforlar** - Chorrahalarda marker qo'shish
- **Tirbandlik xaritasi (Heatmap)** - Rangli zonalar

---

### 4. **Favqulodda Modal**
- `EmergencyModal.tsx` - Tez yordam chaqirilganda chiqadigan oyna
- Animatsiya va ovoz signali

---

### 5. **Toggle Boshqaruvlari**
- Transport ko'rsatish/yashirish
- Tirbandlik xaritasi ko'rsatish/yashirish
- Yo'llar ko'rsatish/yashirish

---

### 6. **Demo Rejim**
- Server ishlamasa avtomatik demo ma'lumotlar generatsiya qilish
- 450 ta simulyatsiya avtomobil

---

## O'zgartiriladigan Fayllar

| Fayl | Harakat |
|------|---------|
| [NEW] `src/components/CongestionChart.tsx` | Tirbandlik grafigi |
| [NEW] `src/components/SpeedChart.tsx` | Tezlik grafigi |
| [NEW] `src/components/EventsPanel.tsx` | Hodisalar jurnali |
| [NEW] `src/components/EmergencyModal.tsx` | Favqulodda oyna |
| [MODIFY] `src/components/Map.tsx` | Yo'llar, svetoforlar, heatmap |
| [MODIFY] `src/pages/Dashboard.tsx` | Yangi komponentlar integratsiya |
| [MODIFY] `src/hooks/useTrafficData.ts` | Demo rejim, events |

---

## Tekshirish Rejasi

### Brauzer Test
1. `http://localhost:5173/dashboard` ochish
2. Grafiklar paydo bo'lishi kerak (pastda)
3. Hodisalar paneli o'ng tomonda ko'rinishi kerak
4. "Tez yordam chaqirish" bosilganda modal chiqishi kerak
5. Xaritada ko'chalar chiziqlari ko'rinishi kerak

### Manual Test
- [ ] Grafiklar real vaqtda yangilanadi
- [ ] Hodisalar ro'yxati to'ldiriladi
- [ ] Emergency modal animatsiya bilan ochiladi
- [ ] Toggle tugmalari ishlaydi

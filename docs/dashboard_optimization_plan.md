# Dashboard Performance Redesign Plan

Foydalanuvchi talabi: "Animatsiyalar kerakmas, u tez ishlashi kerak".
Maqsad: Dashboardni maksimal darajada tezlashtirish va "instant" (darhol) javob beradigan qilish.

## 🚀 Optimizatsiya Strategiyasi

1.  **Animatsiyalarni Olib Tashlash (Zero-Animation)**
    - Barcha `transition-all`, `duration-500`, `animate-pulse` kabi klasslarni olib tashlash.
    - Sidebar va Map o'rtasidagi o'tishlarni keskin (instant) qilish.

2.  **Vizual Soddalashtirish (Low-Overhead UI)**
    - `backdrop-blur` va og'ir `shadow` effektlarini olib tashlash.
    - Solid ranglar va oddiy borderlardan foydalanish.
    - GPU-intensive effektlarni minimallashtirish.

3.  **Render Optimizatsiyasi (React Performance)**
    - **`React.memo`**: Barcha asosiy komponentlarni (`StatsPanel`, `EventsPanel`, `MapControls`) memoization qilish.
    - **Layout Stability**: Layout shift (CLS) oldini olish uchun qat'iy grid o'lchamlar.

## 🛠️ O'zgarishlar Ro'yxati

### [MODIFY] frontend/src/pages/Dashboard.tsx
- CSS transitionlarni olib tashlash.
- Sidebar ochilish/yopilish logikasini soddalashtirish.
- Fon rangi va stillarni "flat" dizaynga o'tkazish.

### [MODIFY] frontend/src/components/StatsPanel.tsx
- `memo` bilan o'rash.
- Ikonka effektlarini soddalashtirish.

### [MODIFY] frontend/src/components/EventsPanel.tsx
- `memo` bilan o'rash.

### [MODIFY] frontend/src/components/Map.tsx
- Xarita atrofidagi soyalarni kamaytirish.

## ✅ Verification Plan

### Manual Verification
1.  **Load Time**: Dashboard sahifasi yangilanganda elementlar qanchalik tez chiqishini tekshirish.
2.  **Sidebar Toggle**: Sidebar ochilib-yopilganda kechikish (lag) yo'qligini tekshirish.
3.  **Map Interaction**: Xarita bilan ishlaganda (zoom/pan) boshqa elementlar qotib qolmasligini tekshirish.

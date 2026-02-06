# Xarita Imkoniyatlarini Kengaytirish Rejasi

Ushbu reja xaritani kattalashtirish (Full Screen) va qo'shimcha boshqaruv funksiyalarini qo'shishni o'z ichiga oladi.

## Proposed Changes

### 1. [MODIFY] Dashboard.tsx (file:///home/bekhruz/Desktop/loyihalar/uztraffic/frontend/src/pages/Dashboard.tsx)
- `isMapExpanded` state'ini qo'shish.
- Stats va Sidebarni yashirish orqali xaritani butun ekranga yoyish (Animate transition).
- Xarita uslubini (Map Style) tanlash uchun yangi boshqaruv tugmalarini qo'shish.

### 2. [MODIFY] Map.tsx (file:///home/bekhruz/Desktop/loyihalar/uztraffic/frontend/src/components/Map.tsx)
- `mapStyle` (Dark, Light, Satellite) prop'ini qabul qilish va TileLayer URL'ini shunga mos yangilash.
- Xarita ustiga minimalist qidiruv paneli (Search Bar) qo'shish (Tashkent ko'chalarini qidirish uchun).
- "Fly To" funksiyasi: Qidirilgan manzilga silliq o'tish (Zoom/Pan).
- Leaflet masshtab chizig'ini (Scale) yoqish.

### 3. [NEW] MapControls.tsx (file:///home/bekhruz/Desktop/loyihalar/uztraffic/frontend/src/components/MapControls.tsx)
- Xarita ustidagi barcha floating tugmalarni (Full screen, Style, Home) bitta komponentga jamlash.

---

## Verification Plan

### Automated Tests
- Brauzer orqali xaritani kattalashtirish tugmasini bosib, sidebarni yashirilganini va xaritani to'liq ekranni egallaganini tekshirish.
- Qidiruv bariga "Chilonzor" yoki "Amir Temur" deb yozib, xarita o'sha koordinataga o'tganini (FlyTo) tekshirish.

### Manual Verification
1. Dashboardda "Kattalashtirish" (Expand) tugmasini bosing.
2. Xarita uslubini "Satellite" rejimiga o'tkazib ko'ring.
3. Qidiruv baridan foydalanib ma'lum bir chorrahani toping.
4. Xaritada masshtab chizig'i ko'rinayotganini tekshiring.

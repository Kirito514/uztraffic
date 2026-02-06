# Full-Screen Map Mode Fix Rejasi

Muammo: Xarita kattalashtirilganda bo'yiga to'lmayapti (horizontal strip) va kulrang hududlar (gray tiles) qolib ketyapti.

## Proposed Changes

### 1. [MODIFY] Map.tsx (file:///home/bekhruz/Desktop/loyihalar/uztraffic/frontend/src/components/Map.tsx)
- `useEffect` qo'shish: `isExpanded` o'zgarganda `map.invalidateSize()` funksiyasini chaqirish.
- `MapController` ichida `isExpanded` propini kuzatish.

### 2. [MODIFY] Dashboard.tsx (file:///home/bekhruz/Desktop/loyihalar/uztraffic/frontend/src/pages/Dashboard.tsx)
- Grid konteyneriga `h-full` qo'shish (faqat `isMapExpanded` holatida).
- Flex-yonalishdagi elementlar orasidagi `gap` va `margin`larni `isMapExpanded` holatida to'liq nolga tenglashtirish.
- Tranzitsiya paytida layout buzilmasligi uchun `overflow-hidden`ni parent konteynerlarda qat'iy tekshirish.

---

## Verification Plan

### Automated Tests
- Brauzer orqali 'Kattalashtirish' tugmasini bosish.
- Xarita balandligi brauzer oynasi balandligiga (~100vh) teng ekanligini JS orqali tekshirish.
- Xaritaning o'ng tomonida kulrang hududlar yo'qligini vizual tasdiqlash.

### Manual Verification
1. 'Kattalashtirish' tugmasini bosing.
2. Xarita butun ekranni (stats va charts'larsiz) egallashiga ishonch hosil qiling.
3. 'Kichraytirish' tugmasini bosing va hamma narsa joyiga silliq qaytayotganini kuzating.

# Premium Landing Page Redesign Plan

Foydalanuvchi "juda kuchli" dizayn istamoqda. Maqsad: Apple/Linear-style, zamonaviy, qorong'u rejim (dark mode), va boy animatsiyalar.

## ✨ Yangi Dizayn Elementlari

1.  **Hero Section (Ultra-Modern)**
    - **Orqa fon**: Oddiy blur o'rniga "Mesh Gradient" yoki "Aurora" effektlari.
    - **Matn**: Katta, qalin tipografiya (Inter/Plus Jakarta Sans), gradientli sarlavhalar.
    - **Animatsiya**: Framer Motion yordamida harflar va elementlarning ketma-ket chiqishi (Staggered fade-up).

2.  **Bento Grid (Features)**
    - Xususiyatlarni oddiy ro'yxat emas, balki "Bento Box" stilidagi turli o'lchamdagi kartalarda ko'rsatish.
    - Har bir karta ichida kichik vizualizatsiya yoki ikonka bo'ladi.

3.  **Jonli Statistika (Stats)**
    - Tizimning kuchi haqida gapiruvchi raqamlar (Svetoforlar soni, tejalgann vaqt).
    - Raqamlarni 0 dan o'sish animatsiyasi bilan ko'rsatish.

## 🛠️ O'zgarishlar Ro'yxati

### [MODIFY] frontend/src/components/Navbar.tsx
- Dizaynni "floating" (suzuvchi) uslubga o'tkazish.
- "Glow" effektli tugmalar qo'shish.

### [MODIFY] frontend/src/components/Hero.tsx
- Butunlay qayta yoziladi.
- Yangi `Hero` komponenti ichida murakkab fon va animatsiyalar bo'ladi.

### [NEW] frontend/src/components/BentoGrid.tsx
- Yangi komponent. Feature'larni grid ko'rinishida chiqarish uchun.

### [NEW] frontend/src/components/Stats.tsx
- Statistika bo'limi uchun komponent.

### [MODIFY] frontend/src/pages/Landing.tsx
- Barcha yangi komponentlarni (Hero, BentoGrid, Stats) birlashtirish.

---

## ✅ Verification Plan

### Manual Verification
1.  **Hero**: Sayt yuklanganda matnlar silliq chiqishini va orqa fon harakatlanishini tekshirish.
2.  **Bento Grid**: Grid chiroyli ko'rinishini va mobil versiyada (responsive) buzilmasligini tekshirish.
3.  **Stats**: Sahifani pastga skroll qilganda raqamlar o'ynab chiqishini tekshirish.

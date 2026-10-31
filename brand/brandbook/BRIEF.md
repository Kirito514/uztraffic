# OQIM AI — Brand Book brifi (v2, Apple uslubi) — barcha agentlar uchun umumiy

## Loyiha
**OQIM AI** — Toshkent chorrahalaridagi svetoforlarni sun’iy intellekt (Deep Q-Network) bilan real vaqtda boshqaruvchi tizim. GPS → DBSCAN tirbandlik zonalari → DQN qarori → svetofor fazasi; tez yordam uchun “yashil to‘lqin”. Muallif: “Guruh 4” talabalar jamoasi (Sun’iy intellekt asoslari, 2025–2026).
Shior: **“Toshkent tirbandliksiz. Har chorrahada aqlli qaror.”**
Atributlar: **Oqimli · Aqlli · Ishonchli · Toshkentcha · Ochiq.**
Ovoz: qisqa, aniq, xotirjam; mubolag‘asiz; texnik atamani oddiy tilda tushuntiradi. Uydirma raqam, uydirma hamkor logotiplari, uydirma odam portretlari — taqiqlangan.

## Jonli namuna — dizayn tili shu yerdan olinadi
Landing (React): **http://localhost:5173/** (dev server ishlab turibdi). Manba: `E:\uztraffic\frontend\src\` (`index.css` tokenlar, `sections/*.tsx`).
Uslub: **Apple** (Refero’dagi Apple tizimi + “Nepalora” Pinterest referensi): oq va och kulrang yuzalar, katta havodor bo‘shliqlar, 28 px radiusli kartalar, pill tugmalar va pill yorliqlar, shaffof “shisha” materiallar foto ustida, deyarli soyasiz (faqat yumshoq katta soya), to‘q karta kontrast uchun. Har sahifada bitta asosiy g‘oya.

## Logo — “Chorraha”
Yuqoridan ko‘rilgan chorraha: to‘rt yo‘nalishdan kelgan oqim (to‘rtta GPS-tomchi) markazdagi bitta aqlli nuqtada (AI qarori) uchrashadi; o‘zbek naqshidagi to‘rt bargli gulni ham eslatadi. So‘z belgisi: geometrik “oqim” (i nuqtasi — o‘rik rangli signal) + kichik “AI”.
Fayllar `E:\uztraffic\brand\logo\` (outline SVG): `oqim-symbol(.svg|-dark|-black|-white|-small)`, `oqim-horizontal*`, `oqim-stacked*`, `oqim-wordmark*`, `favicon.svg`, `web/` (ico, png, app-icon).
Geometriya (256 kanvas): tomchi doirasi markazi markazdan 58, r = 30; uchi markazdan 18; markaz nuqta r = 10; belgi 40…216.
Bo‘sh maydon = tomchi diametri (belgi balandligining ~1/3). Minimal o‘lcham: belgi 16 px (small versiya), gorizontal lockup 96 px; bosma: 6 mm / 25 mm.
Noto‘g‘ri: cho‘zish, burish, tomchilarni qayta ranglash, soya/gradient, tomchilar sonini o‘zgartirish, past kontrast fon, so‘z belgisini boshqa shriftda yozish, kontur qilish.

## Rang — “Shom o‘rigi”
| Nom | HEX | RGB | CMYK (taxm.) | Vazifa |
|---|---|---|---|---|
| Tun qorasi | #0C0B0A | 12 11 10 | 0 8 17 95 | matn, to‘q kartalar, bo‘lim muqovalari |
| Oq | #FFFFFF | 255 255 255 | 0 0 0 0 | asosiy fon |
| Tuman | #F4F2EF | 244 242 239 | 0 1 2 4 | ikkilamchi yuza, kartalar |
| Krem | #F4EFE9 | 244 239 233 | 0 2 5 4 | to‘q fonda matn |
| O‘rik | #F2A07B | 242 160 123 | 0 34 49 5 | urg‘u (to‘q fonda) |
| O‘rik to‘q | #D9714A | 217 113 74 | 0 48 66 15 | urg‘u (oq fonda) |
| Shom binafsha | #2A2230 | 42 34 48 | 13 29 0 81 | chuqurlik, gradientlar |
| Kul | #736D66 | 115 109 102 | 0 5 11 55 | ikkilamchi matn |
| Chiziq | #E8E4DF | 232 228 223 | 0 2 4 9 | ajratuvchilar |
| Signal yashil / sariq / qizil | #4CC38A / #F0A43A / #E5534B | — | — | faqat UI/ma’lumot holati |
Nisbat: ~55% Oq, 20% Tuman, 15% Tun qorasi, 7% O‘rik, 3% qolgan.

## Tipografiya
- **Inter** (Google Fonts, variable, optik o‘lcham 14–32) — SF Pro o‘rnini bosadi. Sarlavha 600, matn 400/500.
  Tracking o‘lchamga bog‘liq: 80–96 px → −0.035em; 40–64 px → −0.03em; 17 px matn → −0.022em; 11–13 px yorliqlar → 0 yoki +0.08em (KATTA HARF).
  Leading: katta sarlavha 1.04; matn 1.47.
  OpenType: standart (cv11/ss01 ishlatilmaydi — bir qavatli “a” brendga mos emas).
- **Instrument Serif Italic** (Google Fonts) — faqat urg‘u so‘zlar uchun, 1–3 so‘z, sarlavha ichida; Inter’dan 1.12× katta (x-balandlik tenglash), og‘irlik 400.
- Google Fonts: `https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..700;1,14..32,400..600&family=Instrument+Serif:ital@1&display=swap`
- O‘zbek lotin: o‘ g‘ uchun U+2018 (‘), tutuq belgisi U+2019 (’).

## Ikonografiya
Tabler Icons (iconify.design, `tabler:*`), 1.75–2 px chiziq, yumaloq uchlar. Asosiy to‘plam: traffic-lights, map-pin, chart-dots-3, sparkles, ambulance, route, device-mobile, message-circle, clock, adjustments, alert-triangle, arrow-right. SVG’lar: `https://api.iconify.design/tabler/<nom>.svg`.

## Tasvir uslubi
Haqiqiy fotosuratlar (Unsplash litsenziyasi): Toshkent, Chimyon, chorrahalar tepadan, svetofor, tez yordam, navigatsiya. Yorqin, toza, tabiiy ranglar; ko‘k osmon yoki tun chiroqlari. Taqiqlangan: sovuq “stock” texnologiya rasmlari, miya/mikrosxema/robot klishelari, uydirma portretlar.
Fayllar `img/` (webp): `hero` (Toshkent + qorli Chimyon), `tlNight` (tunda yashil svetofor), `tl` (svetofor + chiroq izlari), `aerial` (chorraha tepadan, kunduz), `nightHw` (tungi magistral tepadan), `aerialNight` (tungi shahar tepadan), `amb` (tez yordam), `phone` (navigatsiyali telefon), `tcity` (Toshkent City), `temur` (Amir Temur haykali); `photo-map.jpg` (Toshkent markazi xaritasi, OSM).
Mualliflar: `img/photo-credits.txt` — brand book oxirida “Fotosuratlar: … / Unsplash”, xarita uchun “© OpenStreetMap hissadorlari”.

## Brand book formati
- 1600 × 1000 px gorizontal sahifalar, HTML → PDF (`@page { size: 1600px 1000px; margin: 0 }`), ~40 sahifa.
- Papka `E:\uztraffic\brand\brandbook\`: `index.html`, `book.css`, `build.py`, `img/`, `pages/`, `OQIM-AI-Brand-Book.pdf`.

### Referens tuzilishi (Pinterest “Brand Guidelines” — Apple uslubida qayta talqin)
- **Muqova**: to‘q (Tun qorasi) yoki to‘liq foto (hero.webp) ustida; katta Inter 600 “Brand” + Instrument Serif italik “Guidelines”/“qo‘llanma”; yuqori o‘ng burchakda logo belgisining katta, kesilgan bo‘lagi; pastda 5 nuqtali ko‘rsatkich.
- **Bo‘lim muqovalari** (01 Logo, 02 Rang, 03 Tipografiya, 04 Tasvir, 05 Brend qo‘llanilishi, 06 Ish yuritish): to‘q fon, pastki chapda katta raqam + nom (nomning bir so‘zi Instrument Serif italik, O‘rik rangda), mayda mundarija qatori, kesilgan belgi bo‘lagi.
- **Ichki sahifalar**: oq fon; yuqorida mayda “OQIM AI · Brend qo‘llanmasi” va yil; chapda ~34% ustun (pill yorliq + sarlavha + qisqa matn), o‘ngda katta vizual (28 px radiusli karta/foto/maket); pastda sahifa raqami. Juda havodor.
- Ketma-ketlik: muqova → kirish maktubi (Guruh 4 jamoasi imzosi, portretsiz) → mundarija → brend atributlari → missiya/ovoz → 01 Logo (g‘oya, asosiy logo, qurilish va bo‘sh maydon, minimal o‘lcham, variantlar, to‘g‘ri/noto‘g‘ri ✓/✗, fonlar) → 02 Rang (umumiy bloklar nisbatda, asosiy, ikkilamchi + kulrang, signal ranglari, kontrast/WCAG) → 03 Tipografiya (Inter, Instrument Serif, shkala va ierarxiya, o‘zbek imlosi) → 04 Tasvir (tamoyillar ✓/✗, 2–3 foto kollaj, naqsh) → 05 Brend (ijtimoiy tarmoq, panjara tizimi, postlar, veb-sayt, mobil, UI komponentlar: pill tugma, yorliq, karta, shisha) → 06 Ish yuritish (vizitka, blank, konvert, banner, ikonografiya, aloqa) → “Rahmat”.

### Maket fayllari (`img/`, maket agenti yaratadi)
`mock-business-card.jpg` 1600×1000 · `mock-letterhead.jpg` 1200×1500 · `mock-envelope.jpg` 1600×1000 · `mock-laptop.jpg` 1600×1000 (yangi landing) · `mock-phone.jpg` 1000×1400 (landing mobil) · `social-1.png`, `social-2.png`, `social-3.png` 1080×1080 · `social-story.png` 1080×1920 · `mock-signage.jpg` 1600×1000.

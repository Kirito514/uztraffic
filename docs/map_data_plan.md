# Toshkent Xarita Ma'lumotlari Integratsiyasi

Ushbu reja xaritada haqiqiy ko'chalar va svetoforlarni aniq ko'rsatish uchun ikki xil variantni taklif qiladi.

## Proposed Changes

### 1. [NEW] Map Editor (Aniq chizish varianti)
Dashboardda "Tahrirlash rejimi"ni (Edit Mode) qo'shish. Bu orqali:
- **Svetofor qo'shish**: Xaritaning istalgan nuqtasiga (real chorrahaga) bosish orqali svetofor markerini joylashtirish.
- **Yo'l chizish**: Svetoforlar orasida chiziqlar (Polyline) chizish.
- **Eksport**: Chizilgan ma'lumotlarni `map_data.json` fayliga saqlash.

#### [NEW] [MapEditor.tsx](file:///home/bekhruz/Desktop/loyihalar/uztraffic/frontend/src/components/MapEditor.tsx)
Yangi komponent, `leaflet-geoman` yoki oddiy `useMapEvents` orqali chizish funksiyasini ta'minlaydi.

---

### 2. [NEW] OSM Data Importer (Tayyorini olish varianti)
Backendda yoki alohida script orqali OpenStreetMap (OSM) ma'lumotlarini qismlarga bo'lib yuklab olish.
- Toshkentni 4 ta kvadrantga bo'lib query yuboriladi (timeout'ni oldini olish uchun).
- Olingan barcha `highway=traffic_signals` va `highway=primary/secondary` yo'llari bitta GeoJSON faylga jamlanadi.

#### [NEW] [import_osm_data.py](file:///home/bekhruz/Desktop/loyihalar/uztraffic/scripts/import_osm_data.py)
OSM'dan real vaqtda ma'lumotlarni tortadigan Python script.

---

## Verification Plan

### Automated Tests
- `scripts/import_osm_data.py` ishga tushirilib, `map_data.json` yaratilganini tekshirish.
- Frontendda `map_data.json` fayli muvaffaqiyatli o'qilayotganini brauzer konsoli orqali tekshirish.

### Manual Verification
1. Dashboardda "Tahrirlash" tugmasini bosish.
2. Xaritada 3 ta svetofor nuqtasini belgilash.
3. Ular orasida yo'l chizish.
4. "Saqlash" tugmasi bosilganda ma'lumotlar saqlanganini tekshirish.

> [!TIP]
> **Yandex ma'lumotlari** bo'yicha: Yandex Maps API orqali raw ko'cha chiziqlarini olish qiyin (litsenziya cheklovlari bor). Shuning uchun **OSM (OpenStreetMap)** ma'lumotlari eng maqbul "tayyor" variant hisoblanadi.

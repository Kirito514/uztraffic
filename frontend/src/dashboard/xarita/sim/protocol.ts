/* Simulyatsiya oqimi (worker) va xarita orasidagi xabarlar.
   Koordinatalar — “Merkator metrlari” (Merkator birligi × Yer aylanasi), boshlang‘ich nuqtaga nisbatan:
   bu maplibre’ning Merkator koordinatasi bilan chiziqli bog‘langan, shuning uchun mashina xaritada aynan
   o‘z bo‘lagida chiziladi. Float32 bilan ham ~2 mm aniqlik (shahar bo‘ylab ±20 km). */
import type { Tile } from '../roads'

export const EARTH = 40075016.686 // Merkator birligini metrga
export const ORIGIN_LNG = 69.2797 // Toshkent markazi — barcha pozitsiyalar shunga nisbatan
export const ORIGIN_LAT = 41.3111

/* lng/lat → Merkator metrlari (boshlang‘ich nuqtaga nisbatan; y — janubga qarab o‘sadi, maplibre kabi) */
export const mercX = (lng: number) => ((lng + 180) / 360) * EARTH
export const mercY = (lat: number) => ((180 - (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))) / 360) * EARTH
export const ORIGIN_X = mercX(ORIGIN_LNG)
export const ORIGIN_Y = mercY(ORIGIN_LAT)

export type Rect = [number, number, number, number] // x0, y0, x1, y1 (Merkator metri)

export const CAR_STRIDE = 6 // x, y, yo‘nalish (rad), rang indeksi, avlod (qayta tug‘ilganda o‘zgaradi), tezlik
export const SIGNAL_STRIDE = 4 // x, y, holat (0 qizil, 1 sariq, 2 yashil), yo‘nalish

export type ToWorker =
  | { type: 'tiles'; tiles: Record<string, Tile> } // faol kataklar (yangi kelganlari bilan); ro‘yxatda yo‘qlari o‘chiriladi
  | { type: 'run'; running: boolean } // zoom kichik yoki tab yashirin — to‘xtaydi
  // box — ekran + zaxira (mashinalar faqat shu yerda), screen — aynan ko‘rinib turgan qism:
  // mashina ko‘z oldida paydo bo‘lmasin va yo‘qolmasin — tug‘ilish va olib tashlash faqat ekrandan tashqarida
  | { type: 'view'; box: Rect; screen: Rect }
  | { type: 'density'; perLaneKm: number }

export type FromWorker = {
  type: 'frame'
  t: number // simulyatsiya vaqti, s
  cars: Float32Array
  signals: Float32Array
  stats: { cars: number; links: number; signals: number; stopped: number; ms: number } // ms — bitta qadam hisobi
}

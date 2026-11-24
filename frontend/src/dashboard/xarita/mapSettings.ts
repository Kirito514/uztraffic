/* Foydalanuvchi sozlaydigan xarita ko‘rinishi */
export type MapStyle = 'auto' | 'qum' | 'grafit' // auto — dashboard mavzusiga ergashadi
export type ResolvedStyle = Exclude<MapStyle, 'auto'>
export type MapSettings = { style: MapStyle; labels: boolean; lanes: boolean; cars: boolean; traffic: boolean; density: number }

// density — bir bo‘lak-kilometrdagi mashinalar soni (simulyatsiya zichligi)
export const DEFAULT_SETTINGS: MapSettings = { style: 'auto', labels: true, lanes: true, cars: true, traffic: true, density: 14 }
export const DENSITY = { min: 4, max: 28 }

/* “auto” ni aniq uslubga aylantiradi: och mavzuda Qum, to‘q mavzuda Grafit */
export const resolveStyle = (s: MapStyle, tone: 'light' | 'dark'): ResolvedStyle => (s === 'auto' ? (tone === 'dark' ? 'grafit' : 'qum') : s)

/* tanlov ro‘yxati (xarita menyusi va Sozlamalar sahifasi) — namunada fon va asfalt rangi */
export const STYLE_OPTIONS: { id: MapStyle; label: string; swatch: string }[] = [
  { id: 'auto', label: 'Mavzu', swatch: 'linear-gradient(135deg,#ebe3d5 50%,#17181a 50%)' },
  { id: 'qum', label: 'Qum', swatch: 'linear-gradient(135deg,#ebe3d5 50%,#817970 50%)' },
  { id: 'grafit', label: 'Grafit', swatch: 'linear-gradient(135deg,#17181a 50%,#5a5c61 50%)' },
]

/* Foydalanuvchi sozlaydigan xarita ko‘rinishi */
export type MapStyle = 'auto' | 'oqim' | 'kunduzgi' | 'tungi' // auto — dashboard mavzusiga ergashadi
export type ResolvedStyle = Exclude<MapStyle, 'auto'>
export type MapSettings = { style: MapStyle; labels: boolean; lanes: boolean; cars: boolean; density: number }

// density — bir bo‘lak-kilometrdagi mashinalar soni (simulyatsiya zichligi)
export const DEFAULT_SETTINGS: MapSettings = { style: 'auto', labels: true, lanes: true, cars: true, density: 14 }
export const DENSITY = { min: 4, max: 28 }

/* “auto” ni aniq uslubga aylantiradi: och mavzuda OQIM, to‘q mavzuda tungi */
export const resolveStyle = (s: MapStyle, tone: 'light' | 'dark'): ResolvedStyle => (s === 'auto' ? (tone === 'dark' ? 'tungi' : 'oqim') : s)

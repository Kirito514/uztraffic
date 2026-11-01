/* Foydalanuvchi sozlaydigan xarita ko‘rinishi */
export type MapStyle = 'auto' | 'oqim' | 'kunduzgi' | 'tungi' // auto — dashboard mavzusiga ergashadi
export type ResolvedStyle = Exclude<MapStyle, 'auto'>
export type MapSettings = { style: MapStyle; labels: boolean; lanes: boolean }

export const DEFAULT_SETTINGS: MapSettings = { style: 'auto', labels: true, lanes: true }

/* “auto” ni aniq uslubga aylantiradi: och mavzuda OQIM, to‘q mavzuda tungi */
export const resolveStyle = (s: MapStyle, tone: 'light' | 'dark'): ResolvedStyle => (s === 'auto' ? (tone === 'dark' ? 'tungi' : 'oqim') : s)

/* NAMUNAVIY ma’lumot — faqat dizayn variantlarini ko‘rsatish uchun. Chorrahalar va ularning
   koordinatalari haqiqiy (OpenStreetMap, Toshkent markazi); navbat, faza va holatlar esa
   qo‘lda yozilgan, hech qanday o‘lchov emas. Jonli manba ulanganda bu fayl olib tashlanadi. */

export type Level = 'erkin' | 'ortacha' | 'tirband'
export type Axis = 'NS' | 'EW'
export type Spot = {
  id: string
  name: string
  lat: number
  lng: number
  level: Level
  ns: number // shimol–janub navbati, mashina
  ew: number // g‘arb–sharq navbati
  green: Axis // hozir yashil yo‘nalish
  left: number // yashil tugashiga, s
}

export const LEVEL: Record<Level, { label: string; color: string; soft: string; text: string }> = {
  erkin: { label: 'Erkin', color: '#4cc38a', soft: '#e3f4ea', text: '#1d6b45' },
  ortacha: { label: 'O‘rtacha', color: '#f0a43a', soft: '#fbefd9', text: '#8a5a10' },
  tirband: { label: 'Tirband', color: '#e5534b', soft: '#fbe3e1', text: '#9c2f28' },
}

export const SPOTS: Spot[] = [
  { id: 'A-01', name: 'Amir Temur — Shahrisabz', lat: 41.316641, lng: 69.281055, level: 'ortacha', ns: 14, ew: 9, green: 'NS', left: 18 },
  { id: 'A-02', name: 'Amir Temur — Islom Karimov', lat: 41.305311, lng: 69.278428, level: 'tirband', ns: 27, ew: 19, green: 'EW', left: 7 },
  { id: 'A-03', name: 'Islom Karimov — Taras Shevchenko', lat: 41.307578, lng: 69.274918, level: 'erkin', ns: 4, ew: 6, green: 'EW', left: 22 },
  { id: 'A-04', name: 'Istiqbol — Shahrisabz', lat: 41.30669, lng: 69.28415, level: 'erkin', ns: 3, ew: 5, green: 'NS', left: 12 },
  { id: 'A-05', name: 'Mahtumquli — Shahrisabz', lat: 41.309301, lng: 69.286231, level: 'ortacha', ns: 11, ew: 8, green: 'EW', left: 25 },
  { id: 'A-06', name: 'Mustaqillik — Shahrisabz', lat: 41.31398, lng: 69.286116, level: 'erkin', ns: 5, ew: 2, green: 'NS', left: 9 },
  { id: 'A-07', name: 'Shahrisabz — Taras Shevchenko', lat: 41.301148, lng: 69.276514, level: 'erkin', ns: 2, ew: 4, green: 'EW', left: 15 },
  { id: 'A-08', name: 'Navoiy — Sharof Rashidov', lat: 41.318761, lng: 69.271805, level: 'tirband', ns: 22, ew: 24, green: 'NS', left: 4 },
  { id: 'A-09', name: 'Istiqbol — Sodiq Azimov', lat: 41.303157, lng: 69.287637, level: 'erkin', ns: 3, ew: 3, green: 'NS', left: 20 },
  { id: 'A-10', name: 'Mustaqillik — Shastri', lat: 41.315619, lng: 69.290103, level: 'ortacha', ns: 8, ew: 13, green: 'EW', left: 11 },
  { id: 'A-11', name: 'Amir Temur — Fidokor', lat: 41.299974, lng: 69.282369, level: 'erkin', ns: 6, ew: 2, green: 'NS', left: 27 },
  { id: 'A-12', name: 'Islom Karimov — Sharof Rashidov', lat: 41.30947, lng: 69.267637, level: 'ortacha', ns: 12, ew: 10, green: 'EW', left: 6 },
  { id: 'A-13', name: 'Mahtumquli — Sodiq Azimov', lat: 41.307456, lng: 69.291986, level: 'erkin', ns: 1, ew: 4, green: 'EW', left: 19 },
  { id: 'A-14', name: 'Fidokor — Taras Shevchenko', lat: 41.298249, lng: 69.279639, level: 'erkin', ns: 4, ew: 1, green: 'NS', left: 13 },
  { id: 'A-15', name: 'Abdulla Qodiriy — Sharof Rashidov', lat: 41.322374, lng: 69.272748, level: 'ortacha', ns: 9, ew: 12, green: 'NS', left: 21 },
]

const SEVERITY: Record<Level, number> = { tirband: 2, ortacha: 1, erkin: 0 }
/* eng og‘irlaridan boshlab: avval holat, keyin umumiy navbat */
export const BY_SEVERITY = [...SPOTS].sort((a, b) => SEVERITY[b.level] - SEVERITY[a.level] || b.ns + b.ew - (a.ns + a.ew))

export const COUNTS = SPOTS.reduce((c, s) => ({ ...c, [s.level]: c[s.level] + 1 }), { erkin: 0, ortacha: 0, tirband: 0 } as Record<Level, number>)
export const TOTAL_QUEUE = SPOTS.reduce((n, s) => n + s.ns + s.ew, 0)

/* AI tahlil sahifasi uchun NAMUNAVIY ma’lumot — dizayn variantlarini ko‘rsatish uchun, o‘lchov emas.
   Ataylab “AI har doim yutadi” qilinmagan: ba’zi chorraha va vaqtlarda fiks taymer yaxshiroq —
   haqiqiy natija ham shunday aralash bo‘lishi mumkin, sahifa buni yashirmasligi kerak. */
import { SPOTS } from '../xarita/sample'
import { waitOf } from '../chorrahalar/shared'

let seed = 20261101
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)

export const SERIES = {
  ai: { label: 'AI', light: '#d9714a', dark: '#d9714a' },
  fixed: { label: 'Fiks taymer', light: '#2a78d6', dark: '#3987e5' },
} as const

/* 24 soat: o‘rtacha kutish (s). Ertalab 8–9 va kechqurun 18–19 da cho‘qqi */
export const HOURLY = Array.from({ length: 24 }, (_, h) => {
  const peak = Math.exp(-((h - 8.5) ** 2) / 3) * 22 + Math.exp(-((h - 18.5) ** 2) / 4) * 26
  const fixed = Math.round((12 + peak + rnd() * 3) * 10) / 10
  // tig‘izda AI ozgina yutadi, tunda — biroz yutqazadi (bo‘sh ko‘chada keraksiz almashish)
  const ai = Math.round(fixed * (peak > 8 ? 0.86 + rnd() * 0.08 : 1.02 + rnd() * 0.08) * 10) / 10
  return { h, ai, fixed }
})

/* chorrahalar bo‘yicha: AI − fiks (s); manfiy = AI tezroq */
export const BY_SPOT = SPOTS.map((s) => {
  const fixed = waitOf(s)
  const ai = Math.max(4, Math.round(fixed + (rnd() * 10 - 6)))
  return { id: s.id, name: s.name, ai, fixed, diff: ai - fixed }
}).sort((a, b) => a.diff - b.diff)

export const avg = (k: 'ai' | 'fixed') => Math.round((HOURLY.reduce((n, r) => n + r[k], 0) / HOURLY.length) * 10) / 10

import { useId } from 'react'
import { cn } from '@/lib/utils'
import { useTheme } from '../theme'
import { LEVEL, type Spot } from '../xarita/sample'

/* Chorrahalar sahifasi uchun umumiy qismlar. Raqamlar NAMUNAVIY (xarita/sample.ts) —
   kutish vaqti va tarix shu namunadan deterministik hisoblanadi, o‘lchov emas. */

export function useTone() {
  const dark = useTheme().tone === 'dark'
  return {
    dark,
    card: dark ? 'bg-white/[0.04] ring-1 ring-inset ring-white/8' : 'bg-white ring-1 ring-inset ring-line',
    sub: dark ? 'bg-white/[0.05]' : 'bg-mist',
    muted: dark ? 'text-krem/55' : 'text-ash',
    line: dark ? 'border-white/8' : 'border-line',
    hover: dark ? 'hover:bg-white/[0.05]' : 'hover:bg-mist',
    active: dark ? 'bg-white/[0.08]' : 'bg-mist',
    chipOn: dark ? 'bg-krem text-ink' : 'bg-ink text-krem',
    chipOff: dark ? 'bg-white/8 text-krem/70 hover:bg-white/12' : 'bg-ink/5 text-ink/70 hover:bg-ink/8',
    input: dark ? 'bg-white/8 placeholder:text-krem/40' : 'bg-ink/5 placeholder:text-ash',
  }
}

/* o‘rtacha kutish (s) — navbat uzunligidan taxminiy */
export const waitOf = (s: Spot) => Math.round(8 + (s.ns + s.ew) * 0.9)

/* oxirgi 2 soat (har 5 daqiqa) — chorraha id’sidan deterministik, hozirgi navbat bilan tugaydi */
export function history(s: Spot, n = 24) {
  let h = [...s.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)
  const rnd = () => ((h = (h * 1103515245 + 12345) % 2147483648) / 2147483648)
  const now = s.ns + s.ew
  return Array.from({ length: n }, (_, i) => {
    const wave = Math.sin((i / n) * Math.PI * 1.6 + rnd()) * 0.35
    const v = now * (0.7 + wave + rnd() * 0.25) * (0.75 + (i / n) * 0.25)
    return i === n - 1 ? now : Math.max(0, Math.round(v))
  })
}

export function Sparkline({ data, color, className, height = 32 }: { data: number[]; color: string; className?: string; height?: number }) {
  const id = useId()
  const w = 120
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, height - 2 - (v / max) * (height - 6)] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('')
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={cn('h-8 w-full overflow-visible', className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L${w},${height}L0,${height}Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/* 4 tomonlama chorraha sxemasi: har kirishda svetofor va navbatdagi mashinalar (yuqoridan ko‘rinish) */
export function Junction({ spot, size = 200, className }: { spot: Spot; size?: number; className?: string }) {
  const { dark } = useTone()
  const road = dark ? '#34302c' : '#d9d2c8'
  const mark = dark ? 'rgba(244,239,233,0.35)' : 'rgba(255,255,255,0.9)'
  const carFill = dark ? '#cfc8bf' : '#6f6a64'
  const green = '#4cc38a'
  const red = '#e5534b'
  const ns = spot.green === 'NS'
  // har yo‘nalishga navbatning yarmi; ko‘rinadigan mashinalar — 5 tagacha (qo‘l uzunligiga sig‘adi)
  const q = { n: Math.ceil(spot.ns / 2), s: Math.floor(spot.ns / 2), e: Math.ceil(spot.ew / 2), w: Math.floor(spot.ew / 2) }
  const cars = (k: number) => Math.min(5, Math.ceil(k / 2))
  // kiruvchi bo‘lak (o‘ng qo‘l harakati) markazdan o‘ngda; navbat to‘xtash chizig‘idan orqaga
  const arms: { key: 'n' | 's' | 'e' | 'w'; rot: number; on: boolean }[] = [
    { key: 'n', rot: 180, on: ns },
    { key: 's', rot: 0, on: ns },
    { key: 'e', rot: 270, on: !ns },
    { key: 'w', rot: 90, on: !ns },
  ]
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} role="img" aria-label={`${spot.name}: ${ns ? 'shimol–janub' : 'g‘arb–sharq'} yashil`}>
      <rect x="78" y="0" width="44" height="200" rx="2" fill={road} />
      <rect x="0" y="78" width="200" height="44" rx="2" fill={road} />
      {[0, 90].map((r) => (
        <g key={r} transform={`rotate(${r} 100 100)`}>
          <line x1="100" y1="0" x2="100" y2="74" stroke={mark} strokeWidth="1.2" strokeDasharray="5 6" />
          <line x1="100" y1="126" x2="100" y2="200" stroke={mark} strokeWidth="1.2" strokeDasharray="5 6" />
        </g>
      ))}
      {arms.map((a) => (
        // pastki kirish (janubdan shimolga) asosida chiziladi, qolganlari aylantiriladi
        <g key={a.key} transform={`rotate(${a.rot} 100 100)`}>
          <line x1="101" y1="124" x2="121" y2="124" stroke={mark} strokeWidth="2" />
          {Array.from({ length: cars(q[a.key]) }, (_, i) => (
            // mashina yo‘l bo‘ylab: eni 8, bo‘yi 12 — to‘xtash chizig‘idan orqaga navbat
            <rect key={i} x="107" y={128 + i * 15} width="8" height="12" rx="2.4" fill={carFill} opacity={1 - i * 0.08} />
          ))}
          <circle cx="129" cy="122" r="5.5" fill={dark ? '#0c0b0a' : '#ffffff'} />
          <circle cx="129" cy="122" r="3.6" fill={a.on ? green : red} />
        </g>
      ))}
      <circle cx="100" cy="100" r="7" fill={LEVEL[spot.level].color} opacity="0.9" />
    </svg>
  )
}

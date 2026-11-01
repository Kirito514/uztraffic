import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useTone } from '../chorrahalar/shared'

/* Kichik SVG grafiklar (kutubxonasiz). Qoidalar: bitta o‘q, ingichka 2 px chiziq, sust to‘r,
   ≥2 seriyada legenda + oxirida to‘g‘ridan-to‘g‘ri yorliq, matn — seriya rangida emas, matn rangida.
   Har grafikda hover: chiziqda vertikal kursor + tooltip, ustunda — har ustun uchun tooltip. */

export type Series = { key: string; label: string; color: string }

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(600)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

// o‘qning yuqori chegarasi: yaxlit son; hamma qiymat manfiy bo‘lsa — 0
const nice = (max: number) => {
  if (max <= 0) return 0
  const step = 10 ** Math.floor(Math.log10(max))
  return Math.ceil(max / step) * step
}

export function Legend({ series }: { series: Series[] }) {
  const t = useTone()
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
      {series.map((s) => (
        <span key={s.key} className={cn('inline-flex items-center gap-1.5', t.muted)}>
          <span className="h-[3px] w-3.5 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  )
}

function Tip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const t = useTone()
  const left = Math.min(Math.max(x + 12, 0), width - 170)
  return (
    <div
      className={cn('pointer-events-none absolute z-10 min-w-[150px] rounded-xl px-3 py-2 text-[12px] shadow-[0_12px_32px_-12px_rgb(12_11_10/0.45)] ring-1', t.dark ? 'bg-ink-2 text-krem ring-white/10' : 'bg-white text-ink ring-black/5')}
      style={{ left, top: Math.max(0, y - 10) }}
    >
      {children}
    </div>
  )
}

type LineProps = {
  rows: Record<string, number>[]
  x: string
  series: Series[]
  xLabel: (v: number) => string
  unit: string
  height?: number
  yMin?: number
}

export function LineChart({ rows, x, series, xLabel, unit, height = 220, yMin = 0 }: LineProps) {
  const t = useTone()
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { l: 36, r: series.length > 1 ? 74 : 12, t: 10, b: 24 }
  const iw = Math.max(10, width - pad.l - pad.r)
  const ih = height - pad.t - pad.b
  const vals = rows.flatMap((r) => series.map((s) => r[s.key]))
  const top = nice(Math.max(...vals))
  const lo = Math.min(yMin, Math.min(...vals))
  const sx = (i: number) => pad.l + (i / (rows.length - 1)) * iw
  const sy = (v: number) => pad.t + ih - ((v - lo) / (top - lo)) * ih
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + (top - lo) * f)
  const xEvery = Math.ceil(rows.length / Math.max(2, Math.floor(iw / 70)))
  const ink = t.dark ? 'rgba(244,239,233,0.55)' : '#736d66'
  const grid = t.dark ? 'rgba(244,239,233,0.08)' : 'rgba(12,11,10,0.07)'
  // oxiridagi yorliqlar ustma-ust tushmasin: kamida 14 px oraliq bilan surib qo‘yamiz
  const ends = series.map((s) => ({ key: s.key, y: sy(rows[rows.length - 1][s.key]) })).sort((a, b) => a.y - b.y)
  for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 14)
  const endY = Object.fromEntries(ends.map((e) => [e.key, e.y]))

  return (
    <div ref={ref} className="relative">
      <svg
        width={width}
        height={height}
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const i = Math.round(((e.clientX - r.left - pad.l) / iw) * (rows.length - 1))
          setHover(i >= 0 && i < rows.length ? i : null)
        }}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`${series.map((s) => s.label).join(' va ')} — ${unit}`}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={pad.l + iw} y1={sy(v)} y2={sy(v)} stroke={grid} />
            <text x={pad.l - 8} y={sy(v)} dy="0.32em" textAnchor="end" fontSize="11" fill={ink}>
              {Math.round(v * 10) / 10}
            </text>
          </g>
        ))}
        {rows.map((r, i) =>
          i % xEvery === 0 ? (
            <text key={i} x={sx(i)} y={height - 6} textAnchor="middle" fontSize="11" fill={ink}>
              {xLabel(r[x])}
            </text>
          ) : null,
        )}
        {hover !== null && <line x1={sx(hover)} x2={sx(hover)} y1={pad.t} y2={pad.t + ih} stroke={ink} strokeDasharray="3 3" />}
        {series.map((s) => (
          <g key={s.key}>
            <path d={rows.map((r, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(r[s.key]).toFixed(1)}`).join('')} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {series.length > 1 && (
              <text x={sx(rows.length - 1) + 8} y={endY[s.key]} dy="0.32em" fontSize="11.5" fontWeight="600" fill={t.dark ? '#f4efe9' : '#0c0b0a'}>
                {s.label}
              </text>
            )}
            {hover !== null && <circle cx={sx(hover)} cy={sy(rows[hover][s.key])} r="4.5" fill={s.color} stroke={t.dark ? '#1a1918' : '#ffffff'} strokeWidth="2" />}
          </g>
        ))}
      </svg>
      {hover !== null && (
        <Tip x={sx(hover)} y={pad.t} width={width}>
          <p className="mb-1 font-semibold">{xLabel(rows[hover][x])}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="font-semibold tabular-nums">
                {rows[hover][s.key]} {unit}
              </span>
            </p>
          ))}
        </Tip>
      )}
    </div>
  )
}

/* Ikki tomonga o‘suvchi ustunlar: 0 dan chapga — birinchi tomon yutadi, o‘ngga — ikkinchisi.
   Rang tomonni bildiradi (kim yaxshiroq), qiymat yorlig‘i — matn rangida. */
export function DivergingBars({
  rows,
  neg,
  pos,
  unit,
}: {
  rows: { label: string; value: number; detail?: string }[]
  neg: Series // manfiy qiymat — shu tomon yaxshiroq
  pos: Series
  unit: string
}) {
  const t = useTone()
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const label = Math.min(220, width * 0.38)
  const row = 26
  const iw = width - label - 16
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1)
  const zero = label + iw / 2
  // har tomonda qiymat yorlig‘iga 46 px joy qoladi — nom bilan to‘qnashmaydi
  const sx = (v: number) => (v / max) * (iw / 2 - 46)
  const ink = t.dark ? '#f4efe9' : '#0c0b0a'
  const muted = t.dark ? 'rgba(244,239,233,0.55)' : '#736d66'
  const height = rows.length * row + 22

  return (
    <div ref={ref} className="relative">
      <svg width={width} height={height} role="img" aria-label={`Chorrahalar bo‘yicha farq, ${unit}`}>
        <line x1={zero} x2={zero} y1={0} y2={height - 18} stroke={muted} strokeOpacity="0.5" />
        <text x={zero - 6} y={height - 4} textAnchor="end" fontSize="11" fill={muted}>
          ← {neg.label} tezroq
        </text>
        <text x={zero + 6} y={height - 4} fontSize="11" fill={muted}>
          {pos.label} tezroq →
        </text>
        {rows.map((r, i) => {
          const y = i * row + 4
          const w = Math.abs(sx(r.value))
          const s = r.value < 0 ? neg : pos
          const x = r.value < 0 ? zero - w : zero
          return (
            <g key={r.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <rect x={0} y={y - 2} width={width} height={row} fill={hover === i ? (t.dark ? 'rgba(255,255,255,0.04)' : 'rgba(12,11,10,0.03)') : 'transparent'} />
              <text x={label - 10} y={y + 10} dy="0.32em" textAnchor="end" fontSize="12" fill={ink}>
                {r.label.length > 30 ? `${r.label.slice(0, 29)}…` : r.label}
              </text>
              <rect x={x} y={y + 3} width={Math.max(w, 2)} height={14} rx={4} fill={s.color} />
              <text x={r.value < 0 ? x - 6 : x + w + 6} y={y + 10} dy="0.32em" textAnchor={r.value < 0 ? 'end' : 'start'} fontSize="11.5" fontWeight="600" fill={ink}>
                {r.value > 0 ? '+' : ''}
                {r.value} {unit}
              </text>
            </g>
          )
        })}
      </svg>
      {hover !== null && rows[hover].detail && (
        <Tip x={zero} y={hover * row + 22} width={width}>
          <p className="font-semibold">{rows[hover].label}</p>
          <p className={cn('mt-0.5', t.muted)}>{rows[hover].detail}</p>
        </Tip>
      )}
    </div>
  )
}

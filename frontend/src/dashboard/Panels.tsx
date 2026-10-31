import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@iconify/react'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { SeriesPoint } from './useDashboard'
import { ACTIONS, ORTACHA, TIRBAND, type DashEvent, type Snapshot } from './types'

const card = 'rounded-[28px] bg-white p-6 ring-1 ring-inset ring-line'
const fmtS = (v: number) => (v > 0 ? v.toFixed(1) : '—')

/* =========================================================
   KPI: pastel kartalar (Coinview referensi)
   ========================================================= */
export function Kpis({ snap }: { snap: Snapshot }) {
  const { avgWaitAi: ai, avgWaitFixed: fx } = snap.stats
  const gain = fx > 0 && ai > 0 ? Math.round((1 - ai / fx) * 100) : null
  return (
    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
      <div className="rounded-[28px] bg-[#fbe4d6] p-6">
        <div className="flex items-start justify-between">
          <p className="text-[13px] font-medium text-ink/70">O‘rtacha kutish</p>
          <span className="grid size-10 place-items-center rounded-2xl bg-white/70">
            <Icon icon="tabler:hourglass-low" className="size-5 text-orik-deep" />
          </span>
        </div>
        <p className="mt-3 font-display text-[40px] font-bold leading-none tracking-[-0.04em] tabular-nums">
          {fmtS(snap.stats.avgWait)}
          <span className="ml-1 text-[16px] font-semibold text-ink/50">s</span>
        </p>
        <div className="mt-5 space-y-2 text-[12px]">
          {[
            ['AI', ai, 'bg-orik-deep'],
            ['Fiks taymer', fx, 'bg-ink/35'],
          ].map(([l, v, c]) => (
            <div key={l as string} className="grid grid-cols-[72px_1fr_44px] items-center gap-2">
              <span className="text-ink/65">{l}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-white/70">
                <motion.span animate={{ width: `${Math.min(100, ((v as number) / Math.max(ai, fx, 1)) * 100)}%` }} transition={spring} className={cn('block h-full rounded-full', c as string)} />
              </span>
              <span className="text-right font-semibold tabular-nums">{fmtS(v as number)} s</span>
            </div>
          ))}
        </div>
        {gain !== null && (
          <p className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[12px] font-semibold text-[#1d6b45]">
            <Icon icon={gain >= 0 ? 'tabler:trending-down' : 'tabler:trending-up'} className="size-4" />
            AI {Math.abs(gain)}% {gain >= 0 ? 'kamroq kutadi' : 'ko‘proq kutadi'}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:col-span-2 xl:col-span-1">
        <div className="rounded-[28px] bg-[#e1f1e7] p-5">
          <span className="grid size-10 place-items-center rounded-2xl bg-white/70">
            <Icon icon="tabler:car" className="size-5 text-[#1d6b45]" />
          </span>
          <p className="mt-5 font-display text-[30px] font-bold leading-none tracking-[-0.04em] tabular-nums">{snap.stats.vehicles}</p>
          <p className="mt-1.5 text-[12.5px] text-ink/65">mashina · {Math.round(snap.stats.avgSpeed)} km/soat</p>
        </div>
        <div className="rounded-[28px] bg-[#ece6f6] p-5">
          <span className="grid size-10 place-items-center rounded-2xl bg-white/70">
            <Icon icon="tabler:chart-donut-3" className="size-5 text-[#5b4a8a]" />
          </span>
          <p className="mt-5 font-display text-[30px] font-bold leading-none tracking-[-0.04em] tabular-nums">{Math.round(snap.stats.congestion)}%</p>
          <p className="mt-1.5 text-[12.5px] text-ink/65">tirbandlik</p>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   Tez yordam: to‘q aksent karta (Coinview “Earn” referensi)
   ========================================================= */
export function EmergencyCard({ snap, onPick, onCancel }: { snap: Snapshot; onPick: () => void; onCancel: () => void }) {
  const e = snap.emergency
  return (
    <div id="tez-yordam" className="relative scroll-mt-4 overflow-hidden rounded-[28px] bg-ink p-6 text-krem">
      <svg aria-hidden viewBox="0 0 200 120" className="pointer-events-none absolute -right-6 -top-4 h-[150px] w-[240px] opacity-40">
        <path d="M10 100 C60 100 70 30 120 30 S180 70 196 10" fill="none" stroke="#4cc38a" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 9" />
      </svg>
      <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 text-[12px] font-medium text-krem/80">
        <Icon icon="tabler:ambulance" className="size-4 text-signal-red" /> Tez yordam
      </span>
      <AnimatePresence mode="wait" initial={false}>
        {e ? (
          <motion.div key="on" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={spring} className="relative">
            <p className="mt-4 font-display text-[24px] font-bold leading-tight tracking-[-0.025em]">
              Yashil to‘lqin <span className="text-[#7fe0b0]">ochiq</span>
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-[16px] bg-white/6 p-3">
                <p className="text-krem/50">Yetib borish</p>
                <p className="mt-1 font-display text-[22px] font-bold tabular-nums">
                  {Math.floor(Math.round(e.eta) / 60)}:{String(Math.round(e.eta) % 60).padStart(2, '0')}
                </p>
              </div>
              <div className="rounded-[16px] bg-white/6 p-3">
                <p className="text-krem/50">Chorrahalar</p>
                <p className="mt-1 font-display text-[22px] font-bold tabular-nums">{e.intersections.length}</p>
              </div>
            </div>
            <button onClick={onCancel} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white/10 text-[14px] font-medium transition-colors hover:bg-white/15">
              <Icon icon="tabler:x" className="size-4" /> Bekor qilish
            </button>
          </motion.div>
        ) : (
          <motion.div key="off" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={spring} className="relative">
            <p className="mt-4 font-display text-[24px] font-bold leading-tight tracking-[-0.025em]">
              Yo‘lni <span className="text-orik">oldindan</span> oching
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-krem/60">Xaritada A va B nuqtani tanlang — marshrutdagi svetoforlar mashina yetib kelishidan oldin yashilga o‘tadi.</p>
            <button onClick={onPick} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-krem text-[14px] font-medium text-ink transition-colors hover:bg-white">
              <Icon icon="tabler:route" className="size-4" /> Marshrut chizish
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* =========================================================
   Kutish vaqti grafigi: AI va fiks (Dispatch referensi)
   ========================================================= */
export function WaitChart({ series }: { series: SeriesPoint[] }) {
  const box = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const W = 640
  const H = 200
  const pts = series.length > 1 ? series : []
  const max = Math.max(10, ...pts.map((p) => Math.max(p.ai, p.fixed))) * 1.15
  const x = (i: number) => (i / Math.max(1, pts.length - 1)) * W
  const y = (v: number) => H - (v / max) * H
  const line = (k: 'ai' | 'fixed') => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p[k]).toFixed(1)}`).join(' ')
  const area = pts.length ? `${line('ai')} L${W} ${H} L0 ${H} Z` : ''
  const h = hover !== null ? pts[hover] : null

  return (
    <div id="tahlil" className={cn(card, 'scroll-mt-4')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-[19px] font-bold tracking-[-0.02em]">Kutish vaqti</p>
          <p className="mt-0.5 text-[12.5px] text-ash">Bir xil oqimda AI va fiks taymer · so‘nggi 3 daqiqa</p>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-ink/70">
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-4 rounded-full bg-orik-deep" /> AI
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-0.5 w-4 rounded-full bg-ink/40" /> Fiks taymer
          </span>
        </div>
      </div>
      <div
        ref={box}
        className="relative mt-5 h-[200px]"
        onPointerMove={(e) => {
          const r = box.current!.getBoundingClientRect()
          setHover(pts.length ? Math.round(((e.clientX - r.left) / r.width) * (pts.length - 1)) : null)
        }}
        onPointerLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id="aiFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#d9714a" stopOpacity=".28" />
              <stop offset="1" stopColor="#d9714a" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="#e8e4df" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
          ))}
          {pts.length > 0 && (
            <>
              <path d={area} fill="url(#aiFill)" />
              <path d={line('fixed')} fill="none" stroke="#0c0b0a" strokeOpacity=".4" strokeWidth="1.6" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
              <path d={line('ai')} fill="none" stroke="#d9714a" strokeWidth="2.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </>
          )}
          {h && <line x1={x(hover!)} x2={x(hover!)} y1="0" y2={H} stroke="#0c0b0a" strokeOpacity=".25" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />}
        </svg>
        {h && (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-[14px] bg-ink px-3 py-2 text-[11.5px] text-krem shadow-lg"
            style={{ left: `clamp(0px, calc(${(x(hover!) / W) * 100}% - 70px), calc(100% - 150px))` }}
          >
            <p className="text-krem/50">{new Date(h.t).toLocaleTimeString('uz-UZ', { hour12: false })}</p>
            <p className="mt-1 flex justify-between gap-4">
              <span>AI</span> <b className="tabular-nums">{fmtS(h.ai)} s</b>
            </p>
            <p className="flex justify-between gap-4">
              <span>Fiks</span> <b className="tabular-nums">{fmtS(h.fixed)} s</b>
            </p>
          </div>
        )}
        {!pts.length && <p className="absolute inset-0 grid place-items-center text-[13px] text-ash">Ma’lumot yig‘ilmoqda…</p>}
      </div>
    </div>
  )
}

/* =========================================================
   Holat: chorrahalar taqsimoti (Dispatch “Status Overview”)
   ========================================================= */
const STATUS = [
  { key: 'free', label: 'Erkin', cls: 'bg-signal-green' },
  { key: 'mid', label: 'O‘rtacha', cls: 'bg-signal-amber' },
  { key: 'heavy', label: 'Tirband', cls: 'bg-signal-red' },
  { key: 'wave', label: 'Yashil to‘lqin', cls: 'bg-[#7fe0b0]' },
] as const

export function StatusCard({ snap }: { snap: Snapshot }) {
  const counts = useMemo(() => {
    const c = { free: 0, mid: 0, heavy: 0, wave: 0 }
    for (const x of snap.intersections) {
      const n = x.queue.ns + x.queue.ew
      if (x.preempted) c.wave++
      else if (n >= TIRBAND) c.heavy++
      else if (n >= ORTACHA) c.mid++
      else c.free++
    }
    return c
  }, [snap])
  const total = snap.intersections.length || 1
  return (
    <div className={cn(card, 'flex flex-col')}>
      <p className="font-display text-[19px] font-bold tracking-[-0.02em]">Chorrahalar holati</p>
      <p className="mt-0.5 text-[12.5px] text-ash">{snap.intersections.length} ta boshqariladigan chorraha</p>
      <div className="mt-6 flex h-10 gap-1">
        {STATUS.map((s) =>
          counts[s.key] ? (
            <motion.span key={s.key} layout transition={spring} style={{ flexGrow: counts[s.key] }} className={cn('rounded-[10px]', s.cls)} />
          ) : null,
        )}
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[12.5px]">
        {STATUS.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <i className={cn('size-2.5 rounded-full', s.cls)} />
            <span className="text-ink/70">{s.label}</span>
            <b className="ml-auto tabular-nums">{Math.round((counts[s.key] / total) * 100)}%</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* =========================================================
   Chorrahalar jadvali (Coinview “Market” referensi)
   ========================================================= */
export function IntersectionTable({ snap, onFocus }: { snap: Snapshot; onFocus: (id: string) => void }) {
  const [sort, setSort] = useState<'queue' | 'wait' | 'id'>('queue')
  const rows = useMemo(() => {
    const r = [...snap.intersections]
    if (sort === 'queue') r.sort((a, b) => b.queue.ns + b.queue.ew - (a.queue.ns + a.queue.ew))
    if (sort === 'wait') r.sort((a, b) => b.wait - a.wait)
    if (sort === 'id') r.sort((a, b) => a.id.localeCompare(b.id))
    return r
  }, [snap, sort])

  return (
    <div id="chorrahalar" className={cn(card, 'scroll-mt-4 p-0')}>
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-3">
        <div>
          <p className="font-display text-[19px] font-bold tracking-[-0.02em]">Chorrahalar</p>
          <p className="mt-0.5 text-[12.5px] text-ash">Qatorni bosing — xaritada ochiladi</p>
        </div>
        <div className="flex rounded-full bg-mist p-1 text-[12px] font-medium">
          {(
            [
              ['queue', 'Navbat'],
              ['wait', 'Kutish'],
              ['id', 'Raqam'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)} className={cn('relative rounded-full px-3 py-1.5 transition-colors', sort === k ? 'text-ink' : 'text-ink/50 hover:text-ink')}>
              {sort === k && <motion.span layoutId="tbl-sort" transition={spring} className="absolute inset-0 rounded-full bg-white shadow-sm" />}
              <span className="relative">{l}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="text-[11.5px] text-ash">
            <tr>
              <th className="py-2 pl-6 font-medium">Chorraha</th>
              <th className="font-medium">Faza</th>
              <th className="font-medium">Navbat NS / EW</th>
              <th className="font-medium">Kutish</th>
              <th className="pr-6 font-medium">AI qarori</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => {
              const n = x.queue.ns + x.queue.ew
              return (
                <motion.tr layout transition={spring} key={x.id} onClick={() => onFocus(x.id)} className="cursor-pointer border-t border-line transition-colors hover:bg-mist/70">
                  <td className="py-3 pl-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-ink text-krem">
                        <Icon icon="tabler:traffic-lights" className="size-5" />
                      </span>
                      <div>
                        <p className="font-semibold">{x.name}</p>
                        <p className="font-mono text-[11px] text-ash">{x.id}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium',
                        x.preempted ? 'bg-[#e1f1e7] text-[#1d6b45]' : x.state === 'green' ? 'bg-[#e1f1e7] text-[#1d6b45]' : x.state === 'yellow' ? 'bg-[#fdf0d8] text-[#8a5a10]' : 'bg-[#fbe2df] text-[#a33a33]',
                      )}
                    >
                      <i className={cn('size-1.5 rounded-full', x.state === 'green' ? 'bg-signal-green' : x.state === 'yellow' ? 'bg-signal-amber' : 'bg-signal-red')} />
                      {x.preempted ? 'Yashil to‘lqin' : x.remaining > 0 ? `${x.phase} · ${x.remaining} s` : `${x.phase} · ${x.state === 'green' ? 'yashil' : x.state === 'yellow' ? 'sariq' : 'qizil'}`}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="flex h-1.5 w-24 overflow-hidden rounded-full bg-mist">
                        <span className="h-full bg-ink/70" style={{ width: `${Math.min(100, (x.queue.ns / 16) * 100)}%` }} />
                        <span className="h-full bg-orik" style={{ width: `${Math.min(100, (x.queue.ew / 16) * 100)}%` }} />
                      </span>
                      <span className={cn('tabular-nums', n >= TIRBAND ? 'font-semibold text-[#a33a33]' : 'text-ink/70')}>
                        {x.queue.ns} / {x.queue.ew}
                      </span>
                    </div>
                  </td>
                  <td className="tabular-nums text-ink/80">{fmtS(x.wait)} s</td>
                  <td className="pr-6">
                    <span className="rounded-full bg-mist px-2.5 py-1 font-mono text-[11px]">{ACTIONS[x.action]}</span>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* =========================================================
   Hodisalar lentasi (Eduplex “Assignments” referensi)
   ========================================================= */
const KIND: Record<DashEvent['kind'], { icon: string; cls: string; label: string }> = {
  phase: { icon: 'tabler:traffic-lights', cls: 'bg-[#e1f1e7] text-[#1d6b45]', label: 'Faza' },
  zone: { icon: 'tabler:chart-dots-3', cls: 'bg-[#fdf0d8] text-[#8a5a10]', label: 'Zona' },
  emergency: { icon: 'tabler:ambulance', cls: 'bg-[#fbe2df] text-[#a33a33]', label: 'Tez yordam' },
  mode: { icon: 'tabler:sparkles', cls: 'bg-[#ece6f6] text-[#5b4a8a]', label: 'Rejim' },
  gps: { icon: 'tabler:device-mobile', cls: 'bg-[#dde9f5] text-[#2f5f8a]', label: 'GPS' },
}

export function EventsCard({ events, onFocus }: { events: DashEvent[]; onFocus: (id: string) => void }) {
  return (
    <div id="hodisalar" className={cn(card, 'scroll-mt-4')}>
      <p className="font-display text-[19px] font-bold tracking-[-0.02em]">Hodisalar</p>
      {/* faqat kirish animatsiyasi: chiqib ketayotgan hodisa sekundiga yangilanishda “qotib” qolmasin */}
      <ul className="mt-4 space-y-2">
          {events.slice(0, 6).map((e) => {
            const k = KIND[e.kind]
            return (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={spring}
                onClick={() => e.intersectionId && onFocus(e.intersectionId)}
                className={cn('flex items-center gap-3 rounded-[18px] bg-mist p-2.5 pr-3', e.intersectionId && 'cursor-pointer hover:bg-line/60')}
              >
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-[12px]', k.cls)}>
                  <Icon icon={k.icon} className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium">{e.text}</p>
                  <p className="text-[11px] text-ash">{new Date(e.t).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</p>
                </div>
              </motion.li>
            )
          })}
        {!events.length && <li className="py-6 text-center text-[13px] text-ash">Hozircha hodisa yo‘q</li>}
      </ul>
    </div>
  )
}

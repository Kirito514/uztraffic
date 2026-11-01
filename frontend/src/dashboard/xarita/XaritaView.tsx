import { lazy, Suspense, useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { glassClass, usePageActions } from '../chrome'
import { MapSettingsMenu } from './MapSettingsMenu'
import { resolveStyle, type MapSettings } from './mapSettings'
import { BY_SEVERITY, COUNTS, LEVEL, SPOTS, type Level } from './sample'
import { LevelChip, ModeToggle, SampleBadge, SignalPhase } from './ui'

// maplibre og‘ir (~800 KB) — faqat xarita sahifasi ochilganda yuklanadi
const LiveMap = lazy(() => import('./LiveMap').then((m) => ({ default: m.LiveMap })))

const PANEL_W = 340
const morph = { type: 'spring', bounce: 0, duration: 0.45 } as const
const swap = { type: 'spring', bounce: 0, duration: 0.35 } as const

type Tone = 'light' | 'dark'
/* panel ichidagi ranglar fon tusiga qarab */
const T = {
  light: {
    sub: 'bg-ink/[0.04]',
    hover: 'hover:bg-ink/5',
    muted: 'text-ash',
    input: 'bg-ink/5',
    chipOn: 'bg-ink text-krem',
    chipOff: 'bg-ink/5 text-ink/70 hover:bg-ink/8',
    icon: 'text-ink/60 hover:bg-ink/5 hover:text-ink',
    cta: 'bg-ink text-krem hover:bg-ink-2',
  },
  dark: {
    sub: 'bg-white/6',
    hover: 'hover:bg-white/6',
    muted: 'text-krem/55',
    input: 'bg-white/8',
    chipOn: 'bg-krem text-ink',
    chipOff: 'bg-white/8 text-krem/70 hover:bg-white/12',
    icon: 'text-krem/60 hover:bg-white/8 hover:text-krem',
    cta: 'bg-krem text-ink hover:bg-white',
  },
}

type Props = {
  selected: string | null
  onSelect: (id: string | null) => void
  settings: MapSettings
  onSettings: (p: Partial<MapSettings>) => void
  layout: 'card' | 'full' // full: xarita butun ekran fonida, ustidagi hamma narsa shisha
  tone: Tone
}

/* Jonli xarita (Apple Maps uslubi): chapda panel — qidiruv, filtr, ro‘yxat va tafsilot.
   Panelni pastga yig‘ish mumkin: u pastdagi kapsulaga “aylanadi” (layoutId morf). */
export function XaritaView({ selected, onSelect, settings, onSettings, layout, tone }: Props) {
  const full = layout === 'full'
  const t = T[tone]
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Level | 'all'>('all')
  const [open, setOpen] = useState(true)
  const [moving, setMoving] = useState(false) // panel morfi paytida blur o‘chadi
  const list = useMemo(
    () => BY_SEVERITY.filter((s) => (filter === 'all' || s.level === filter) && s.name.toLowerCase().includes(q.trim().toLowerCase())),
    [q, filter],
  )
  const spot = SPOTS.find((s) => s.id === selected)
  const mapStyle = resolveStyle(settings.style, tone)

  // xaritada chorraha bosilsa, yig‘ilgan panel tafsilot bilan ochiladi
  const select = useCallback(
    (id: string | null) => {
      onSelect(id)
      if (id) setOpen(true)
    },
    [onSelect],
  )

  /* to‘liq ekranda xarita butun oynani egallaydi — markazlash uchun sidebar, sarlavha va panel
     egallagan joyni hisobga olamiz (bu maydonning ekrandagi o‘rni) */
  const root = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ t: 0, r: 0, b: 0, l: 0 })
  useLayoutEffect(() => {
    if (!full || !root.current) return
    const el = root.current
    const update = () => {
      const r = el.getBoundingClientRect()
      setBox({ t: Math.round(r.top), r: Math.round(innerWidth - r.right), b: Math.round(innerHeight - r.bottom), l: Math.round(r.left) })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    addEventListener('resize', update)
    return () => {
      ro.disconnect()
      removeEventListener('resize', update)
    }
  }, [full])
  const margin = useMemo<[number, number, number, number]>(() => {
    const side = open ? PANEL_W + 24 : 0
    const bottom = open ? 0 : 64
    return full ? [box.t, box.r, box.b + bottom, box.l + side] : [0, 0, bottom, side]
  }, [open, full, box])

  const map = (
    <Suspense fallback={<div className={cn('absolute inset-0', mapStyle === 'tungi' ? 'bg-[#141312]' : 'bg-[#efe9e1]')} />}>
      <LiveMap
        key={full ? 'full' : 'card'}
        mapStyle={mapStyle}
        labels={settings.labels}
        lanes={settings.lanes}
        selected={selected}
        onSelect={select}
        padding={{ top: margin[0], right: margin[1], bottom: margin[2], left: margin[3] }}
      />
    </Suspense>
  )

  // panel sirti: kartada — deyarli oq; to‘liq ekranda — shisha (morf paytida blursiz, quyuqroq)
  const surface = full
    ? moving
      ? tone === 'light'
        ? 'bg-white/90 ring-1 ring-white/70 shadow-[0_16px_48px_-20px_rgb(12_11_10/0.35)]'
        : 'bg-ink/90 text-krem ring-1 ring-white/10'
      : glassClass(tone)
    : 'bg-white/95 shadow-[0_16px_48px_-20px_rgb(12_11_10/0.45)] ring-1 ring-black/5'

  const collapse = (
    <button onClick={() => setOpen(false)} aria-label="Panelni yashirish" title="Yashirish" className={cn('grid size-9 shrink-0 place-items-center rounded-full transition-colors', t.icon)}>
      <Icon icon="tabler:chevron-down" className="size-5" />
    </button>
  )

  return (
    <div ref={root} className={cn('relative min-h-[560px] flex-1', full ? 'pointer-events-none' : 'overflow-hidden rounded-[28px] ring-1 ring-line')}>
      {full ? <Backdrop>{map}</Backdrop> : map}

      <Actions>
        <SampleBadge tone={tone} />
        <ModeToggle id="xarita" tone={tone} />
        <MapSettingsMenu settings={settings} onChange={onSettings} tone={tone} />
      </Actions>

      <LayoutGroup>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.aside
              key="panel"
              layoutId="xarita-panel"
              transition={morph}
              onLayoutAnimationStart={() => setMoving(true)}
              onLayoutAnimationComplete={() => setMoving(false)}
              style={{ borderRadius: 22, width: PANEL_W }}
              className={cn('pointer-events-auto absolute bottom-3 left-3 top-3 flex flex-col overflow-hidden', surface)}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {spot ? (
                  <motion.div key="detail" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={swap} className="flex flex-1 flex-col p-4">
                    <div className="flex items-center justify-between">
                      <button onClick={() => onSelect(null)} className={cn('-ml-1 flex h-8 items-center gap-1 rounded-full pl-1 pr-3 text-[13px] font-medium', t.icon)}>
                        <Icon icon="tabler:chevron-left" className="size-4" /> Chorrahalar
                      </button>
                      {collapse}
                    </div>
                    <p className={cn('mt-4 text-[12px] font-medium', t.muted)}>{spot.id}</p>
                    <h2 className="mt-0.5 font-display text-[22px] font-bold leading-tight tracking-[-0.025em]">{spot.name}</h2>
                    <LevelChip level={spot.level} tone={tone} className="mt-3 self-start" />
                    <div className={cn('mt-6 rounded-2xl p-4', t.sub)}>
                      <p className={cn('mb-3 text-[12px] font-medium uppercase tracking-[0.06em]', t.muted)}>Svetofor fazasi</p>
                      <SignalPhase spot={spot} tone={tone} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <Stat label="Umumiy navbat" value={spot.ns + spot.ew} className={t.sub} muted={t.muted} />
                      <Stat label="Yashil tugashiga" value={`${spot.left} s`} className={t.sub} muted={t.muted} />
                    </div>
                    <button className={cn('mt-auto flex h-11 items-center justify-center gap-2 rounded-full text-[13.5px] font-medium', t.cta)}>
                      <Icon icon="tabler:ambulance" className="size-4" /> Yashil to‘lqin berish
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="list" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={swap} className="flex min-h-0 flex-1 flex-col">
                    <div className="p-4 pb-3">
                      <div className="flex items-center gap-2">
                        <label className={cn('flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full px-3.5 text-[13.5px] focus-within:ring-2 focus-within:ring-orik/60', t.input)}>
                          <Icon icon="tabler:search" className={cn('size-4', t.muted)} />
                          <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Chorraha qidirish"
                            className={cn('min-w-0 flex-1 bg-transparent outline-none', tone === 'dark' ? 'placeholder:text-krem/45' : 'placeholder:text-ash')}
                          />
                        </label>
                        {collapse}
                      </div>
                      <div className="mt-3 flex gap-1.5">
                        {(['all', 'tirband', 'ortacha', 'erkin'] as const).map((f) => (
                          <button key={f} onClick={() => setFilter(f)} className={cn('h-7 rounded-full px-2.5 text-[12px] font-medium transition-colors', filter === f ? t.chipOn : t.chipOff)}>
                            {f === 'all' ? `Hammasi ${SPOTS.length}` : `${LEVEL[f].label} ${COUNTS[f]}`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <ul
                      className={cn(
                        'min-h-0 flex-1 overflow-y-auto px-2 pb-2 [scrollbar-width:thin]',
                        tone === 'dark' ? '[scrollbar-color:rgb(244_239_233/0.2)_transparent]' : '[scrollbar-color:rgb(12_11_10/0.2)_transparent]',
                      )}
                    >
                      {list.map((s) => (
                        <li key={s.id}>
                          <button onClick={() => onSelect(s.id)} className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors', t.hover)}>
                            <span className="size-2.5 shrink-0 rounded-full" style={{ background: LEVEL[s.level].color }} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13.5px] font-medium">{s.name}</span>
                              <span className={cn('block text-[12px]', t.muted)}>
                                {s.id} · navbat {s.ns + s.ew}
                              </span>
                            </span>
                            <Icon icon="tabler:chevron-right" className={cn('size-4 opacity-60', t.muted)} />
                          </button>
                        </li>
                      ))}
                      {list.length === 0 && <li className={cn('px-3 py-6 text-center text-[13px]', t.muted)}>Hech narsa topilmadi</li>}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.aside>
          ) : (
            /* yig‘ilgan holat: pastda markazdagi kapsula — panel shu yerga “tushadi” */
            <div key="pill" className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <motion.button
                layoutId="xarita-panel"
                transition={morph}
                onLayoutAnimationStart={() => setMoving(true)}
                onLayoutAnimationComplete={() => setMoving(false)}
                style={{ borderRadius: 999 }}
                onClick={() => setOpen(true)}
                aria-label="Chorrahalar panelini ochish"
                className={cn('pointer-events-auto flex h-12 items-center gap-3 pl-4 pr-2 text-[13.5px] font-medium', surface)}
              >
                <motion.span layout="position" className="flex items-center gap-3">
                  <Icon icon="tabler:list" className="size-[18px] opacity-70" />
                  Chorrahalar
                  <span className={t.muted}>{SPOTS.length}</span>
                  <span className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: tone === 'dark' ? LEVEL.tirband.color : LEVEL.tirband.text }}>
                    <span className="size-1.5 rounded-full" style={{ background: LEVEL.tirband.color }} />
                    {COUNTS.tirband} tirband
                  </span>
                  <span className={cn('grid size-8 place-items-center rounded-full', t.cta)}>
                    <Icon icon="tabler:chevron-up" className="size-4" />
                  </span>
                </motion.span>
              </motion.button>
            </div>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  )
}

function Stat({ label, value, className, muted }: { label: string; value: ReactNode; className: string; muted: string }) {
  return (
    <div className={cn('rounded-2xl p-4', className)}>
      <p className={cn('text-[12px]', muted)}>{label}</p>
      <p className="mt-1 font-display text-[26px] font-bold tabular-nums tracking-[-0.03em]">{value}</p>
    </div>
  )
}

/* Xarita tugmalari sarlavha qatorining o‘ng tomoniga chiqadi; joy bo‘lmasa — xarita ustida */
function Actions({ children }: { children: ReactNode }) {
  const slot = usePageActions()
  if (slot) return createPortal(children, slot)
  return <div className="pointer-events-auto absolute right-3 top-3 flex items-center gap-2">{children}</div>
}

/* To‘liq ekranli xarita body’ga chiqariladi: sahifa o‘tish animatsiyasining transform’i
   `fixed` joylashuvni buzmasin. Dashboard qobig‘i (z-10) uning ustida turadi. */
function Backdrop({ children }: { children: ReactNode }) {
  return createPortal(<div className="fixed inset-0 z-0">{children}</div>, document.body)
}

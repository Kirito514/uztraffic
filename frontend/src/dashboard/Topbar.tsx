import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@iconify/react'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { Source } from './useDashboard'
import type { Intersection, Mode } from './types'

function useClock() {
  const fmt = () => new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Tashkent' })
  const [t, setT] = useState(fmt)
  useEffect(() => {
    const id = setInterval(() => setT(fmt()), 1000)
    return () => clearInterval(id)
  }, [])
  return t
}

type Props = {
  mode: Mode
  source: Source
  intersections: Intersection[]
  onMode: (m: Mode) => void
  onPick: (id: string) => void
}

export function Topbar({ mode, source, intersections, onMode, onPick }: Props) {
  const time = useClock()
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="flex items-center gap-1.5 text-[13px] text-ash">
          Toshkent <Icon icon="tabler:chevron-right" className="size-3.5" /> Markaz
        </p>
        <h1 className="mt-1 font-display text-[clamp(28px,3vw,38px)] font-bold leading-none tracking-[-0.035em]">Jonli boshqaruv</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Search intersections={intersections} onPick={onPick} />
        <ModeSwitch mode={mode} onMode={onMode} />
        <span
          className={cn(
            'inline-flex h-11 items-center gap-2 rounded-full px-4 text-[13px] font-medium',
            source === 'live' ? 'bg-[#e3f4ea] text-[#1d6b45]' : 'bg-white text-ink/70 ring-1 ring-inset ring-line',
          )}
          title={source === 'mock' ? 'Backend kontraktga mos javob bermadi — brauzer ichidagi namunaviy simulyatsiya' : undefined}
        >
          <span className={cn('size-2 rounded-full', source === 'live' ? 'animate-pulse bg-signal-green' : source === 'mock' ? 'bg-signal-amber' : 'bg-ink/30')} />
          {source === 'live' ? 'Jonli' : source === 'mock' ? 'Namunaviy' : 'Ulanmoqda…'}
          <span className="tabular-nums text-ink/50">{time}</span>
        </span>
      </div>
    </header>
  )
}

/* AI / Fiks: Apple segment boshqaruvi — tanlov ostidagi pill sirpanadi */
function ModeSwitch({ mode, onMode }: { mode: Mode; onMode: (m: Mode) => void }) {
  return (
    <div role="radiogroup" aria-label="Svetofor rejimi" className="flex h-11 items-center rounded-full bg-white p-1 ring-1 ring-inset ring-line">
      {(['ai', 'fixed'] as Mode[]).map((m) => (
        <button
          key={m}
          role="radio"
          aria-checked={mode === m}
          onClick={() => onMode(m)}
          className={cn('relative flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-colors', mode === m ? 'text-krem' : 'text-ink/60 hover:text-ink')}
        >
          {mode === m && <motion.span layoutId="dash-mode" transition={spring} className="absolute inset-0 -z-0 rounded-full bg-ink" />}
          <Icon icon={m === 'ai' ? 'tabler:sparkles' : 'tabler:clock'} className="relative size-4" />
          <span className="relative">{m === 'ai' ? 'AI' : 'Fiks taymer'}</span>
        </button>
      ))}
    </div>
  )
}

function Search({ intersections, onPick }: { intersections: Intersection[]; onPick: (id: string) => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? intersections.filter((x) => x.name.toLowerCase().includes(s) || x.id.toLowerCase().includes(s)).slice(0, 6) : []
  }, [q, intersections])
  useEffect(() => {
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    addEventListener('pointerdown', close)
    return () => removeEventListener('pointerdown', close)
  }, [])

  return (
    <div ref={box} className="relative">
      <label className="flex h-11 w-[min(280px,70vw)] items-center gap-2 rounded-full bg-white px-4 ring-1 ring-inset ring-line focus-within:ring-ink/30">
        <Icon icon="tabler:search" className="size-4 text-ash" />
        <input
          value={q}
          onChange={(e) => (setQ(e.target.value), setOpen(true))}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && hits[0]) (onPick(hits[0].id), setOpen(false), setQ(''))
            if (e.key === 'Escape') setOpen(false)
          }}
          placeholder="Chorraha qidirish…"
          className="w-full bg-transparent text-[14px] outline-none placeholder:text-ash"
        />
      </label>
      <AnimatePresence>
        {open && hits.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={spring}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-[20px] bg-white p-1.5 shadow-[0_20px_50px_-20px_rgb(12_11_10/0.35)] ring-1 ring-line"
          >
            {hits.map((h) => (
              <li key={h.id}>
                <button
                  onClick={() => (onPick(h.id), setOpen(false), setQ(''))}
                  className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-[13px] hover:bg-mist"
                >
                  <span className="font-mono text-[11px] text-ash">{h.id}</span>
                  <span className="font-medium">{h.name}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

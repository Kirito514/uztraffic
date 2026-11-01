import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@iconify/react'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { BY_SEVERITY, LEVEL, type Spot } from '../xarita/sample'
import { LevelChip } from '../xarita/ui'
import { history, Junction, Sparkline, useTone, waitOf } from './shared'

/* Chorrahalar — boshqaruv ko‘rinishi: chapda ro‘yxat, o‘ngda tanlangan chorrahaning “operator ekrani” —
   katta sxema, 60 s’lik faza tsikli, tarix va boshqaruv tugmalari. Bitta chorraha bilan chuqur ishlash uchun. */
export function ChorrahaControl() {
  const t = useTone()
  const [id, setId] = useState(BY_SEVERITY[0].id)
  const spot = BY_SEVERITY.find((s) => s.id === id)!
  const pick = (next: string) => {
    setId(next)
    // tor ekranda tafsilot ro‘yxat tepasida — tanlangach o‘sha yerga qaytamiz
    if (!matchMedia('(min-width: 1024px)').matches) scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="grid min-h-[60svh] gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <nav aria-label="Chorrahalar" className={cn('h-fit rounded-[24px] p-2 lg:sticky lg:top-3', t.card)}>
        <p className={cn('px-3 pb-1 pt-2 text-[11.5px] font-medium uppercase tracking-[0.06em]', t.muted)}>Og‘irlik bo‘yicha</p>
        <ul>
          {BY_SEVERITY.map((s) => {
            const on = s.id === id
            return (
              <li key={s.id}>
                <button onClick={() => pick(s.id)} aria-current={on} className={cn('relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left', !on && t.hover)}>
                  {on && <motion.span layoutId="control-pick" transition={spring} className={cn('absolute inset-0 rounded-2xl', t.active)} />}
                  <span className="relative size-2.5 shrink-0 rounded-full" style={{ background: LEVEL[s.level].color }} />
                  <span className="relative min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{s.name}</span>
                    <span className={cn('block text-[12px]', t.muted)}>
                      {s.id} · navbat {s.ns + s.ew}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <AnimatePresence mode="wait">
        <motion.section
          key={spot.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
          className="order-first space-y-4 lg:order-none" // tor ekranda tafsilot ro‘yxatdan oldin
        >
          <div className={cn('rounded-[24px] p-5 md:p-6', t.card)}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className={cn('text-[12px] font-medium', t.muted)}>{spot.id}</p>
                <h2 className="mt-0.5 font-display text-[clamp(22px,2.4vw,30px)] font-bold leading-tight tracking-[-0.025em]">{spot.name}</h2>
                <LevelChip level={spot.level} tone={t.dark ? 'dark' : 'light'} className="mt-2.5" />
              </div>
              <div className="flex gap-2">
                <button className={cn('inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium', t.chipOff)}>
                  <Icon icon="tabler:hand-stop" className="size-4" /> Qo‘lda boshqarish
                </button>
                <button className={cn('inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium', t.chipOn)}>
                  <Icon icon="tabler:ambulance" className="size-4" /> Yashil to‘lqin
                </button>
              </div>
            </div>

            <div className="mt-6 grid items-center gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
              <div className={cn('grid place-items-center rounded-[20px] p-3', t.sub)}>
                <Junction spot={spot} size={240} className="h-auto w-full max-w-[240px]" />
              </div>
              <div className="space-y-5">
                <Cycle spot={spot} />
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['Sh–J navbat', spot.ns],
                    ['G‘–Sh navbat', spot.ew],
                    ['O‘rt. kutish', `${waitOf(spot)} s`],
                  ].map(([k, v]) => (
                    <div key={k as string} className={cn('rounded-2xl p-3.5', t.sub)}>
                      <p className={cn('text-[12px]', t.muted)}>{k}</p>
                      <p className="mt-1 font-display text-[24px] font-bold leading-none tabular-nums tracking-[-0.03em]">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={cn('rounded-[24px] p-5', t.card)}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-[14px] font-semibold">Navbat — oxirgi 2 soat</h3>
              <span className={cn('text-[12px]', t.muted)}>har 5 daqiqa · namunaviy</span>
            </div>
            <Sparkline data={history(spot, 36)} color={LEVEL[spot.level].color} height={90} className="mt-4 h-28" />
          </div>
        </motion.section>
      </AnimatePresence>
    </div>
  )
}

/* 60 s’lik tsikl: Sh–J yashil · sariq · qizil, keyin G‘–Sh; hozirgi payt — ko‘rsatkich */
function Cycle({ spot }: { spot: Spot }) {
  const t = useTone()
  const seg = [
    { w: 25, c: 'bg-signal-green', label: 'Sh–J' },
    { w: 3, c: 'bg-signal-amber', label: '' },
    { w: 2, c: 'bg-signal-red', label: '' },
    { w: 25, c: 'bg-signal-green', label: 'G‘–Sh' },
    { w: 3, c: 'bg-signal-amber', label: '' },
    { w: 2, c: 'bg-signal-red', label: '' },
  ]
  const now = (spot.green === 'NS' ? 25 - spot.left : 55 - spot.left) / 60
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12.5px]">
        <span className="font-semibold">Faza tsikli · 60 s</span>
        <span className={t.muted}>
          hozir yashil: {spot.green === 'NS' ? 'shimol–janub' : 'g‘arb–sharq'}, {spot.left} s qoldi
        </span>
      </div>
      <div className="relative mt-3">
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
          {seg.map((s, i) => (
            <span key={i} className={cn(s.c, 'h-full opacity-80')} style={{ width: `${(s.w / 60) * 100}%` }} />
          ))}
        </div>
        <span className={cn('absolute -top-1 h-5 w-[3px] -translate-x-1/2 rounded-full', t.dark ? 'bg-krem' : 'bg-ink')} style={{ left: `${now * 100}%` }} />
      </div>
      <div className={cn('mt-1.5 flex text-[11.5px]', t.muted)}>
        <span style={{ width: '50%' }}>Shimol–janub</span>
        <span>G‘arb–sharq</span>
      </div>
    </div>
  )
}

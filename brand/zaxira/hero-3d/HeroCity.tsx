import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@iconify/react'
import { PillButton } from '@/components/PillButton'
import { spring, springSoft } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { Mode, Stats } from '@/three/cityScene'

/* 5 — 3D interaktiv chorraha: jonli simulyatsiya, AI / Fiks rejimini almashtirib natijani ko‘rish mumkin */
const LIGHT: Record<Stats['state'], string> = { green: 'bg-signal-green', yellow: 'bg-signal-amber', allred: 'bg-signal-red' }
const STATE_UZ: Record<Stats['state'], string> = { green: 'yashil', yellow: 'sariq', allred: 'hammasi qizil' }

export function HeroCity() {
  const mount = useRef<HTMLDivElement>(null)
  const api = useRef<{ setMode: (m: Mode) => void; dispose: () => void } | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [mode, setMode] = useState<Mode>('ai')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    // Three.js faqat hero ko‘ringanda yuklanadi (alohida chunk)
    import('@/three/cityScene')
      .then(({ createCityScene }) => {
        if (!alive || !mount.current) return
        try {
          api.current = createCityScene(mount.current, (s) => alive && setStats(s))
        } catch {
          setFailed(true) // WebGL yo‘q — statik fon qoladi
        }
      })
      .catch(() => setFailed(true))
    return () => {
      alive = false
      api.current?.dispose()
      api.current = null
    }
  }, [])

  const choose = (m: Mode) => {
    setMode(m)
    api.current?.setMode(m)
  }

  const maxQ = Math.max(8, stats?.qNS ?? 0, stats?.qEW ?? 0)

  return (
    <section className="relative isolate h-[100svh] min-h-[640px] max-h-[960px] overflow-hidden bg-[#efe9e1]">
      <div ref={mount} className="absolute inset-0 -z-10" aria-label="Jonli 3D chorraha simulyatsiyasi" role="img" />
      {failed && <img src="/photos/aerial.webp" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-80" />}
      {/* matn o‘qilishi uchun chapdan yumshoq yorug‘lik */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-[5] bg-[linear-gradient(90deg,#efe9e1_0%,rgb(239_233_225/0.85)_28%,rgb(239_233_225/0)_55%)] max-md:bg-[linear-gradient(180deg,#efe9e1_0%,rgb(239_233_225/0.9)_32%,rgb(239_233_225/0)_55%)]" />

      <div className="pointer-events-none mx-auto flex h-full max-w-[1200px] flex-col px-5 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSoft, delay: 0.1 }}
          className="pointer-events-auto mt-[16svh] max-w-[520px] max-md:mt-24"
        >
          <span className="inline-flex h-8 items-center gap-2 rounded-full bg-white/70 px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/70 backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-signal-green" />
            Jonli simulyatsiya
          </span>
          <h1 className="display mt-6 text-[clamp(42px,5.6vw,76px)]">
            Har chorrahada <span className="accent">aqlli</span> qaror.
          </h1>
          <p className="mt-5 max-w-[440px] text-[17px] text-ink/70">
            Bu — haqiqiy kichik simulyatsiya. Pastdagi tugma bilan AI va oddiy taymerni almashtiring: navbat va kutish vaqti qanday o‘zgarishini ko‘ring.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <PillButton href="/dashboard" variant="dark">
              Jonli xaritani ochish
            </PillButton>
            <span className="hidden items-center gap-1.5 text-[13px] text-ink/50 md:inline-flex">
              <Icon icon="tabler:hand-grab" className="size-4" /> Sahnani sudrab aylantiring
            </span>
          </div>
        </motion.div>
      </div>

      {/* boshqaruv paneli */}
      <motion.aside
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springSoft, delay: 0.35 }}
        className="absolute bottom-6 right-5 w-[min(340px,calc(100%-40px))] rounded-[28px] border border-white/70 bg-white/72 p-5 shadow-[0_24px_60px_-30px_rgb(12_11_10/0.45)] backdrop-blur-xl backdrop-saturate-150 md:bottom-10 md:right-8"
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-[17px] font-bold tracking-[-0.02em]">Chorraha · jonli</p>
          {/* AI / Fiks segment — tanlov ostidagi pill sirpanadi */}
          <div role="radiogroup" aria-label="Svetofor rejimi" className="flex rounded-full bg-ink/[0.06] p-1 text-[12px] font-semibold">
            {(['ai', 'fixed'] as Mode[]).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={mode === m}
                onClick={() => choose(m)}
                className={cn('relative rounded-full px-3.5 py-1.5 transition-colors', mode === m ? 'text-krem' : 'text-ink/60 hover:text-ink')}
              >
                {mode === m && <motion.span layoutId="mode-pill" transition={spring} className="absolute inset-0 -z-10 rounded-full bg-ink" />}
                {m === 'ai' ? 'AI' : 'Fiks'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {(['NS', 'EW'] as const).map((ax) => {
            const q = ax === 'NS' ? stats?.qNS ?? 0 : stats?.qEW ?? 0
            const isGreen = stats?.green === ax
            return (
              <div key={ax} className="grid grid-cols-[92px_1fr_24px] items-center gap-3 text-[12px]">
                <span className="flex items-center gap-2 text-ink/70">
                  <span className={cn('size-2 rounded-full', isGreen && stats ? LIGHT[stats.state] : 'bg-signal-red')} />
                  {ax === 'NS' ? 'Shimol–Janub' : 'Sharq–G‘arb'}
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-ink/10">
                  <motion.span
                    animate={{ width: `${(q / maxQ) * 100}%` }}
                    transition={spring}
                    className={cn('block h-full rounded-full', q > 6 ? 'bg-signal-red' : q > 3 ? 'bg-signal-amber' : 'bg-signal-green')}
                  />
                </span>
                <span className="text-right font-medium tabular-nums">{q}</span>
              </div>
            )
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink/10 pt-4">
          <div>
            <p className="text-[11px] text-ash">Hozirgi faza</p>
            <p className="mt-0.5 text-[14px] font-semibold">
              {stats ? `${stats.green === 'NS' ? 'NS' : 'EW'} · ${STATE_UZ[stats.state]}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-ash">O‘rtacha kutish</p>
            <p className="mt-0.5 font-display text-[22px] font-bold leading-none tracking-[-0.03em] tabular-nums">
              {stats && stats.avgWait > 0 ? stats.avgWait.toFixed(1) : '—'}
              <span className="ml-0.5 text-[12px] font-medium text-ash">s</span>
            </p>
          </div>
        </div>

        <AnimatePresence>
          {stats?.ambulance && (
            <motion.p
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={spring}
              className="flex items-center gap-2 overflow-hidden rounded-2xl bg-signal-red/10 px-3 py-2 text-[12px] font-medium text-[#b3322b]"
            >
              <Icon icon="tabler:ambulance" className="size-4" />
              Tez yordam · yashil to‘lqin ochildi
            </motion.p>
          )}
        </AnimatePresence>
      </motion.aside>
    </section>
  )
}

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { FEATURES } from '@/data/features'
import { spring, springSoft } from '@/lib/motion'
import { cn } from '@/lib/utils'

/* B — Tab galereya (Apple “Highlights”): chapda ro‘yxat, faol band ichida progress chizig‘i;
   o‘ngda katta foto. Tugagach keyingisiga o‘tadi — halqa cheksiz. Kursor ustida bo‘lsa pauza. */
const DURATION = 5.5

export function FeaturesTabs() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const inView = useInView(box, { amount: 0.4 })
  const reduce = useReducedMotion()
  const running = inView && !paused && !reduce

  useEffect(() => {
    if (!running) return
    const id = setTimeout(() => setI((v) => (v + 1) % FEATURES.length), DURATION * 1000)
    return () => clearTimeout(id)
  }, [i, running])

  const f = FEATURES[i]
  return (
    <div
      ref={box}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      className="mx-auto mt-14 grid max-w-[1200px] items-stretch gap-6 px-5 md:px-8 lg:grid-cols-[0.9fr_1.4fr]"
    >
      <ol className="flex flex-col gap-1.5">
        {FEATURES.map((it, k) => {
          const on = k === i
          return (
            <li key={it.title}>
              <button
                onClick={() => setI(k)}
                aria-current={on}
                className={cn(
                  'relative w-full overflow-hidden rounded-[22px] px-6 text-left transition-colors duration-300',
                  on ? 'bg-mist py-5' : 'py-3.5 hover:bg-mist/60',
                )}
              >
                <span className={cn('font-display text-[20px] font-bold tracking-[-0.02em] transition-colors', on ? 'text-ink' : 'text-ink/45')}>
                  {it.title}
                </span>
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={spring}
                      className="overflow-hidden pt-2 text-[15px] leading-relaxed text-ash"
                    >
                      {it.text}
                    </motion.p>
                  )}
                </AnimatePresence>
                {on && (
                  <span className="absolute inset-x-6 bottom-0 h-[3px] overflow-hidden rounded-full bg-ink/10">
                    <motion.span
                      key={`${k}-${running}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: running ? 1 : 0 }}
                      transition={{ duration: running ? DURATION : 0.2, ease: 'linear' }}
                      className="block h-full origin-left rounded-full bg-orik-deep"
                    />
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>

      <div className="relative min-h-[420px] overflow-hidden rounded-[32px] bg-ink lg:min-h-[560px]">
        <AnimatePresence initial={false}>
          <motion.img
            key={f.img}
            src={f.img}
            alt={f.alt}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ ...springSoft, duration: 0.9 }}
            className="absolute inset-0 h-full w-full object-cover will-change-transform"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgb(12_11_10/0.7))]" />
        <div className="absolute bottom-6 left-6 flex gap-2">
          <span className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-ink">{f.chip}</span>
          {f.meta.map((m) => (
            <span key={m} className="rounded-full bg-white/16 px-3 py-1.5 text-[12px] font-medium text-white ring-1 ring-inset ring-white/25">
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

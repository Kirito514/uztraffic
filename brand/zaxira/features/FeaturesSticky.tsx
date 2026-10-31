import { useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { FEATURES } from '@/data/features'
import { springSoft } from '@/lib/motion'
import { cn } from '@/lib/utils'

/* C — Scroll hikoya: bo‘lim ekranga qadaladi, scroll har bir imkoniyatni navbat bilan ochadi.
   Chap — raqam va matn, o‘ng — foto almashadi. Har band ~70svh scroll. */
export function FeaturesSticky() {
  const wrap = useRef<HTMLDivElement>(null)
  const [i, setI] = useState(0)
  const { scrollYProgress } = useScroll({ target: wrap, offset: ['start start', 'end end'] })
  useMotionValueEvent(scrollYProgress, 'change', (p) => setI(Math.min(FEATURES.length - 1, Math.floor(p * FEATURES.length))))
  const f = FEATURES[i]

  return (
    <div ref={wrap} style={{ height: `${FEATURES.length * 70 + 30}svh` }} className="relative mt-10">
      <div className="sticky top-16 mx-auto grid h-[calc(100svh-4rem)] max-w-[1200px] items-center gap-8 px-5 md:px-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <div className="flex items-baseline gap-3 font-display font-bold tabular-nums">
            <span className="text-[56px] leading-none tracking-[-0.04em] text-orik-deep">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-[17px] text-ink/30">/ {String(FEATURES.length).padStart(2, '0')}</span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={f.title} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={springSoft}>
              <h3 className="display mt-6 text-[clamp(34px,4vw,52px)]">{f.title}</h3>
              <p className="mt-4 max-w-[420px] text-[17px] leading-relaxed text-ash">{f.text}</p>
              <div className="mt-6 flex gap-2">
                {[f.chip, ...f.meta].map((m) => (
                  <span key={m} className="rounded-full bg-mist px-3 py-1.5 text-[12px] font-medium text-ink/70">
                    {m}
                  </span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="mt-10 flex gap-1.5">
            {FEATURES.map((it, k) => (
              <span key={it.title} className={cn('h-1 rounded-full transition-[width,background-color] duration-500 ease-out-soft', k === i ? 'w-10 bg-ink' : 'w-4 bg-ink/15')} />
            ))}
          </div>
        </div>

        <div className="relative h-[min(68svh,600px)] overflow-hidden rounded-[32px] bg-ink max-lg:h-[42svh]">
          <AnimatePresence initial={false}>
            <motion.img
              key={f.img}
              src={f.img}
              alt={f.alt}
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ ...springSoft, duration: 0.9 }}
              className="absolute inset-0 h-full w-full object-cover will-change-transform"
            />
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

/* Tasviriy namuna (haqiqiy o‘lchov emas): AI rejimida navbatlar qisqa va teng,
   Fiks rejimida yashil navbatga qaramay almashadi — bir tomonda tirbandlik to‘planadi. */
const AI = [
  { q: [3, 2], g: 0 },
  { q: [2, 3], g: 1 },
  { q: [3, 3], g: 0 },
  { q: [2, 2], g: 1 },
]
const FIXED = [
  { q: [2, 6], g: 0 },
  { q: [2, 8], g: 0 },
  { q: [6, 9], g: 1 },
  { q: [9, 6], g: 1 },
  { q: [11, 3], g: 0 },
  { q: [8, 6], g: 0 },
]
const SLOTS = 12
const LANES = ['Shimol–Janub', 'Sharq–G‘arb']

export function QueueDemo({ ai }: { ai: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5 })
  const reduce = useReducedMotion()
  const [t, setT] = useState(0)

  useEffect(() => {
    if (!inView || reduce) return
    const id = setInterval(() => setT((v) => v + 1), 1500)
    return () => clearInterval(id)
  }, [inView, reduce])
  useEffect(() => setT(0), [ai])

  const seq = ai ? AI : FIXED
  const frame = seq[t % seq.length]

  return (
    <div ref={ref} className="space-y-3">
      {LANES.map((lane, k) => {
        const green = frame.g === k
        const q = frame.q[k]
        return (
          <div key={lane}>
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-krem/60">
              <span className="flex items-center gap-1.5">
                <span className={cn('size-2 rounded-full transition-colors duration-300', green ? 'bg-signal-green shadow-[0_0_8px_var(--color-signal-green)]' : 'bg-signal-red')} />
                {lane}
              </span>
              <span className="tabular-nums">{q} mashina</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: SLOTS }, (_, i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: i < q ? 1 : 0.12, scaleY: i < q ? 1 : 0.6 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.45, delay: (i < q ? i : SLOTS - i) * 0.02 }}
                  className={cn('h-3 flex-1 rounded-[4px]', q > 7 ? 'bg-signal-red' : q > 4 ? 'bg-signal-amber' : 'bg-orik')}
                />
              ))}
            </div>
          </div>
        )
      })}
      <p className="pt-1 text-[10.5px] text-krem/40">Tasviriy namuna · haqiqiy o‘lchov emas</p>
    </div>
  )
}

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

/* "Qanday ishlaydi" qadamlari uchun kichik jonli illustratsiyalar.
   `on` — oqim chizig‘i shu qadamga yetib kelganmi. Hamma harakat transform/opacity. */
const sp = { type: 'spring' as const, bounce: 0, duration: 0.6 }

/* 1 — Ma’lumot: xarita to‘ri ustida GPS nuqtalari tushadi va pulslanadi */
const PINS = [
  [18, 30], [42, 62], [66, 26], [80, 70], [30, 78], [56, 44],
]
export function VizGps({ on }: { on: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-white">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d="M0 40 H100 M0 72 H100 M28 0 V100 M62 0 V100" stroke="#e8e4df" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        <path d="M0 20 Q50 30 100 12" stroke="#f0ebe5" strokeWidth="6" fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      {PINS.map(([x, y], i) => (
        <motion.span
          key={i}
          initial={false}
          animate={on ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -10, scale: 0.6 }}
          transition={{ ...sp, delay: on ? i * 0.08 : 0 }}
          className="absolute size-2.5 -translate-1/2"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-orik opacity-60" style={{ animationDelay: `${i * 0.35}s` }} />
          <span className="absolute inset-0 rounded-full bg-orik-deep ring-2 ring-white" />
        </motion.span>
      ))}
    </div>
  )
}

/* 2 — Tahlil: tarqoq nuqtalar orasidan zich guruh (klaster) ajralib, halqa bilan belgilanadi */
const DOTS: [number, number, boolean][] = [
  [58, 38, true], [64, 46, true], [55, 50, true], [68, 36, true], [61, 56, true], [70, 52, true], [52, 42, true],
  [16, 22, false], [28, 70, false], [84, 18, false], [88, 78, false], [20, 48, false], [40, 84, false], [36, 18, false],
]
export function VizCluster({ on }: { on: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-white">
      <motion.span
        initial={false}
        animate={on ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
        transition={{ ...sp, delay: on ? 0.35 : 0 }}
        className="absolute left-[61%] top-[46%] size-[42%] -translate-1/2 rounded-full border-[1.5px] border-dashed border-orik-deep/60 bg-orik/12"
      />
      {DOTS.map(([x, y, c], i) => (
        <span
          key={i}
          className={cn('absolute size-2 -translate-1/2 rounded-full transition-colors duration-500', on && c ? 'bg-orik-deep' : 'bg-ink/20')}
          style={{ left: `${x}%`, top: `${y}%`, transitionDelay: on ? `${i * 40}ms` : '0ms' }}
        />
      ))}
    </div>
  )
}

/* 3 — Qaror: to‘rt harakatning Q-qiymati; eng balandi (argmax) tanlanadi */
const Q = [
  { l: 'NS 15', h: 42 },
  { l: 'EW 15', h: 30 },
  { l: 'NS 30', h: 88, best: true },
  { l: 'EW 30', h: 56 },
]
export function VizDecision({ on }: { on: boolean }) {
  return (
    <div className="flex h-full w-full items-end gap-2 rounded-[18px] bg-white px-4 pb-3 pt-4">
      {Q.map((b, i) => (
        <div key={b.l} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <motion.span
            initial={false}
            animate={{ scaleY: on ? b.h / 100 : 0.08 }}
            transition={{ ...sp, delay: on ? i * 0.07 : 0 }}
            className={cn(
              'block h-full w-full origin-bottom rounded-[8px] transition-colors duration-500',
              on && b.best ? 'bg-orik-deep' : 'bg-ink/12',
            )}
          />
          <span className={cn('font-mono text-[9.5px] tracking-tight', on && b.best ? 'font-semibold text-orik-deep' : 'text-ash')}>{b.l}</span>
        </div>
      ))}
    </div>
  )
}

/* 4 — Ijro: svetofor qizildan yashilga o‘tadi, yonida “yashil to‘lqin” chiziqlari */
export function VizSignal({ on }: { on: boolean }) {
  const lamps = [
    { c: 'bg-signal-red', lit: !on },
    { c: 'bg-signal-amber', lit: false },
    { c: 'bg-signal-green', lit: on },
  ]
  return (
    <div className="relative flex h-full w-full items-center justify-center gap-5 overflow-hidden rounded-[18px] bg-white">
      <div className="grid gap-1.5 rounded-xl bg-ink p-2">
        {lamps.map((l, i) => (
          <span
            key={i}
            className={cn(
              'block size-5 rounded-full transition-[opacity,box-shadow] duration-500',
              l.c,
              l.lit ? 'opacity-100 shadow-[0_0_14px_currentColor]' : 'opacity-15',
            )}
            style={{ transitionDelay: on ? '250ms' : '0ms' }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            initial={false}
            animate={on ? { scaleX: 1, opacity: 1 } : { scaleX: 0.2, opacity: 0.2 }}
            transition={{ ...sp, delay: on ? 0.35 + i * 0.1 : 0 }}
            className="block h-1.5 w-20 origin-left rounded-full bg-signal-green"
          />
        ))}
      </div>
    </div>
  )
}

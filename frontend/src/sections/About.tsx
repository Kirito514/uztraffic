import { useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react'
import { Icon } from '@iconify/react'
import { SectionTag } from '@/components/SectionTag'
import { Switch } from '@/components/ui/switch'
import { ScrollWords } from '@/components/ScrollWords'
import { CountUp } from '@/components/CountUp'
import { QueueDemo } from '@/components/QueueDemo'
import { reveal, spring } from '@/lib/motion'

/* Har nuqta ≈ 50 000 mashina. Raqamlar loyiha tadqiqotidagi baholar. */
const LOAD = [
  { label: 'Yo‘l sig‘imi', value: 400, dots: 8 },
  { label: 'Mashinalar', value: 770, dots: 15 },
  { label: 'Ortiqcha yuk', value: 370, dots: 7 },
]

const STATS: { icon: string; to?: number; text?: string; suffix?: string; label: string }[] = [
  { icon: 'tabler:repeat', to: 500, label: 'o‘qitish epizodi' },
  { icon: 'tabler:traffic-lights', to: 4, suffix: ' ta', label: 'svetofor harakati' },
  { icon: 'tabler:sparkles', to: 3, suffix: ' ta', label: 'AI modeli' },
  { icon: 'tabler:clock-hour-4', text: '24/7', label: 'jonli monitoring' },
]

export function About() {
  const [ai, setAi] = useState(true)

  // foto karta ichidagi parallaks: karta ko‘rinish oralig‘ida rasm sekinroq siljiydi
  const photo = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: photo, offset: ['start end', 'end start'] })
  const photoY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%'])

  return (
    <section id="loyiha" className="mx-auto max-w-[1200px] scroll-mt-16 px-5 py-20 md:px-8 md:py-28">
      <motion.div {...reveal}>
        <SectionTag>Loyiha haqida</SectionTag>
      </motion.div>
      <ScrollWords
        className="mt-8 max-w-[1040px] font-display text-[clamp(30px,4.2vw,56px)] font-bold leading-[1.08] tracking-[-0.035em]"
        parts={[
          { text: 'Oqim — oddiy svetofor emas. GPS’dan neyron tarmoqqacha, har bir qaror' },
          { text: 'Toshkent ko‘chalaridagi real oqimga tayanadi.', muted: true },
        ]}
      />

      <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-[1.15fr_0.85fr_1fr]">
        {/* 1 — to‘q karta: AI rejimi + jonli navbat namunasi */}
        <motion.article {...reveal} className="flex min-h-[400px] flex-col rounded-[30px] bg-ink p-7 text-krem">
          <div className="flex items-center justify-between">
            <span className="grid size-11 place-items-center rounded-2xl bg-white/8">
              <Icon icon="tabler:traffic-lights" className="size-6 text-orik" />
            </span>
            <label className="flex cursor-pointer items-center gap-3 text-[13px] font-medium text-krem/80">
              <span className="relative inline-grid">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={ai ? 'ai' : 'fix'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring}>
                    {ai ? 'AI rejimi' : 'Fiks taymer'}
                  </motion.span>
                </AnimatePresence>
              </span>
              <Switch
                checked={ai}
                onCheckedChange={setAi}
                aria-label="AI rejimini yoqish"
                className="data-[state=checked]:bg-orik-deep data-[state=unchecked]:bg-white/20"
              />
            </label>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={ai ? 'ai' : 'fix'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={spring}
              className="mt-7 text-[21px] font-medium leading-snug tracking-[-0.02em]"
            >
              {ai ? (
                <>
                  Svetofor navbatni ko‘radi va yashilni kerakli yo‘nalishga beradi —{' '}
                  <span className="text-orik">navbatlar qisqa va teng.</span>
                </>
              ) : (
                <>
                  Har 30 soniyada ko‘r-ko‘rona almashadi —{' '}
                  <span className="text-krem/50">bir tomonda tirbandlik to‘planadi.</span>
                </>
              )}
            </motion.p>
          </AnimatePresence>

          <div className="mt-auto pt-8">
            <QueueDemo ai={ai} />
          </div>
        </motion.article>

        {/* 2 — fotokarta: ichki parallaks, yengil yozuv */}
        <motion.article {...reveal} className="group relative min-h-[400px] overflow-hidden rounded-[30px] bg-ink">
          <div ref={photo} className="absolute inset-0">
            <motion.img
              src="/photos/temur.webp"
              alt="Toshkentdagi Amir Temur haykali"
              style={{ y: photoY }}
              className="absolute inset-x-0 -top-[10%] h-[120%] w-full object-cover transition-[scale] duration-[900ms] ease-out-soft will-change-transform group-hover:scale-[1.04]"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(12_11_10/0)_40%,rgb(12_11_10/0.75))]" />
          <div className="absolute inset-x-6 bottom-6 text-white">
            <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-white/70">Toshkent uchun</p>
            <p className="mt-1 font-display text-[24px] font-bold leading-tight tracking-[-0.025em]">Haqiqiy ko‘chalar, haqiqiy chorrahalar</p>
          </div>
        </motion.article>

        {/* 3 — ma’lumot kartasi */}
        <motion.article {...reveal} className="flex min-h-[400px] flex-col rounded-[30px] bg-mist p-7 md:col-span-2 lg:col-span-1">
          <p className="font-display text-[52px] font-bold leading-none tracking-[-0.045em]">
            <CountUp to={770000} suffix="+" />
          </p>
          <p className="mt-2 text-[15px] font-medium">mashina shahar yo‘llarida</p>
          <p className="mt-3 text-[13px] leading-relaxed text-ash">
            Yo‘llar 400 ming mashinaga mo‘ljallangan — yuk sig‘imdan deyarli ikki barobar ko‘p.
          </p>
          <div className="mt-auto space-y-3 pt-6">
            {LOAD.map((r, row) => (
              <div key={r.label} className="grid grid-cols-[84px_1fr_36px] items-center gap-3 text-[12px]">
                <span className="text-ink/70">{r.label}</span>
                <span className="grid max-w-[220px] grid-cols-[repeat(15,minmax(0,1fr))] gap-[4px]">
                  {Array.from({ length: 15 }, (_, i) => (
                    <motion.i
                      key={i}
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ ...spring, delay: 0.2 + row * 0.12 + i * 0.025 }}
                      className={`block aspect-square w-full max-w-[10px] rounded-full ${i < r.dots ? 'bg-orik-deep' : 'bg-ink/10'}`}
                    />
                  ))}
                </span>
                <span className="text-right font-medium tabular-nums">{r.value}k</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-ash">Loyiha tadqiqotidagi baholar · 1 nuqta ≈ 50 ming</p>
        </motion.article>
      </div>

      <motion.dl {...reveal} className="mt-16 grid grid-cols-2 overflow-hidden rounded-[30px] border border-line md:grid-cols-4">
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className={`flex flex-col items-start gap-5 p-7 ${i % 2 ? 'border-l border-line' : ''} ${i > 1 ? 'border-t border-line md:border-t-0' : ''} ${i === 2 ? 'md:border-l' : ''}`}
          >
            <Icon icon={s.icon} className="size-6 text-orik-deep" />
            <div>
              <dt className="font-display text-[clamp(34px,3.6vw,46px)] font-bold leading-none tracking-[-0.04em]">
                {s.to != null ? <CountUp to={s.to} suffix={s.suffix} /> : s.text}
              </dt>
              <dd className="mt-2 text-[13px] text-ash">{s.label}</dd>
            </div>
          </div>
        ))}
      </motion.dl>
    </section>
  )
}

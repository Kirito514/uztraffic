import { useRef, useState } from 'react'
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { SectionTag } from '@/components/SectionTag'
import { VizCluster, VizDecision, VizGps, VizSignal } from '@/components/StepViz'
import { reveal, springSoft } from '@/lib/motion'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    title: 'Ma’lumot',
    text: 'Mashina va telefonlardan GPS koordinatalari keladi va OpenStreetMap’dagi Toshkent yo‘llariga bog‘lanadi.',
    code: 'lat, lng → yo‘l segmenti',
    Viz: VizGps,
  },
  {
    title: 'Tahlil',
    text: 'DBSCAN mashinalar zich to‘plangan joylarni topib, xaritada tirbandlik zonalarini belgilaydi.',
    code: 'DBSCAN → zonalar',
    Viz: VizCluster,
  },
  {
    title: 'Qaror',
    text: 'Har chorrahada DQN agenti navbatlarni ko‘rib, to‘rt harakat ichidan eng foydalisini tanlaydi.',
    code: '[NS, EW, vaqt] → argmax Q',
    Viz: VizDecision,
  },
  {
    title: 'Ijro',
    text: 'Svetofor fazasi almashadi. Tez yordam yo‘lga chiqsa, marshrut oldindan yashilga o‘tadi.',
    code: 'faza ← qaror',
    Viz: VizSignal,
  },
]

export function Steps() {
  const list = useRef<HTMLOListElement>(null)
  const reduce = useReducedMotion()
  // oqim chizig‘i: ro‘yxat ekranga kirgandan o‘rtasigacha 0 → 1
  const { scrollYProgress: line } = useScroll({ target: list, offset: ['start 0.85', 'end 0.6'] })
  const [reached, setReached] = useState(reduce ? STEPS.length - 1 : -1)
  useMotionValueEvent(line, 'change', (p) => {
    if (reduce) return
    // har qadam chiziq uning raqamiga yetganda yonadi (birinchisi deyarli darhol)
    setReached(Math.min(STEPS.length - 1, Math.floor(p * (STEPS.length - 1) + 0.15)))
  })

  return (
    <section id="qanday" className="mx-auto max-w-[1200px] scroll-mt-16 px-5 py-20 md:px-8 md:py-28">
      <motion.div {...reveal} className="flex flex-col items-center text-center">
        <SectionTag>Qanday ishlaydi</SectionTag>
        <h2 className="display mt-6 text-[clamp(36px,5.2vw,64px)]">
          Mashinadan svetoforgacha —
          <br />
          <span className="accent">to‘rt qadam</span>
        </h2>
      </motion.div>

      <ol ref={list} className="relative mt-16 grid gap-10 lg:grid-cols-4 lg:gap-4">
        {/* oqim chizig‘i: desktopda gorizontal (raqamlar markazidan), telefonda chapda tik */}
        <span aria-hidden className="absolute left-5 top-5 bottom-5 w-px bg-ink/10 lg:left-[12.5%] lg:right-[12.5%] lg:top-5 lg:bottom-auto lg:h-px lg:w-auto" />
        <motion.span
          aria-hidden
          style={{ scaleX: reduce ? 1 : line }}
          className="absolute left-[12.5%] right-[12.5%] top-5 hidden h-[2px] origin-left rounded-full bg-orik-deep lg:block"
        />
        <motion.span
          aria-hidden
          style={{ scaleY: reduce ? 1 : line }}
          className="absolute left-5 top-5 bottom-5 w-[2px] -translate-x-1/2 origin-top rounded-full bg-orik-deep lg:hidden"
        />

        {STEPS.map((s, i) => {
          const on = i <= reached
          return (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -80px 0px' }}
              transition={{ ...springSoft, delay: i * 0.07 }}
              className="relative grid grid-cols-[40px_1fr] gap-5 lg:grid-cols-1 lg:grid-rows-[auto_1fr] lg:justify-items-center lg:gap-6"
            >
              {/* raqam — chiziq ustida */}
              <span
                className={cn(
                  'relative z-10 grid size-10 place-items-center rounded-full border font-display text-[14px] font-bold tabular-nums transition-[background-color,color,border-color,box-shadow] duration-500',
                  on ? 'border-orik-deep bg-orik-deep text-white shadow-[0_0_0_6px_rgb(217_113_74/0.14)]' : 'border-ink/15 bg-white text-ink/50',
                )}
              >
                {i + 1}
              </span>

              <div
                className={cn(
                  'flex h-full w-full flex-col rounded-[28px] p-5 transition-[background-color,box-shadow] duration-500',
                  on ? 'bg-mist shadow-[0_24px_50px_-36px_rgb(12_11_10/0.35)]' : 'bg-mist/60',
                )}
              >
                <div className="h-[132px]">
                  <s.Viz on={on} />
                </div>
                <h3 className="mt-5 font-display text-[22px] font-bold tracking-[-0.025em]">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ash">{s.text}</p>
                {/* kod yorlig‘i kartaning pastiga yopishadi — kartalar teng balandlikda bo‘lganda bir chiziqda turadi */}
                <div className="mt-auto pt-4">
                  <code className="block w-fit rounded-full bg-white px-3 py-1.5 font-mono text-[11px] text-ink/70">{s.code}</code>
                </div>
              </div>
            </motion.li>
          )
        })}
      </ol>
    </section>
  )
}

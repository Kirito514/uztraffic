import { useLayoutEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { PillButton } from '@/components/PillButton'
import { springSoft } from '@/lib/motion'

/* Hero — chuqurlik: ulkan “TOSHKENT” so‘zi Chimyon cho‘qqilari ORTIDA turadi.
   Qatlamlar: osmon → foto → so‘z → fotodan kesilgan tog‘+shahar (hero-front.webp). */
const IMG_W = 2400
const IMG_H = 1600
const BASELINE = 290 // rasm koordinatasida harflar asosi (cho‘qqilar chizig‘i ~181–394)

export function Hero() {
  const box = useRef<HTMLDivElement>(null)
  const [geo, setGeo] = useState({ top: 0, size: 120 })
  const { scrollY } = useScroll()
  const imgY = useTransform(scrollY, [0, 900], [0, 120])
  const wordY = useTransform(scrollY, [0, 900], [0, 190]) // so‘z sekinroq — chuqurlik hissi

  // so‘z o‘lchami va joyi rasmning haqiqiy masshtabiga bog‘langan: cho‘qqilar har ekranda bir xil kesadi
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const calc = () => {
      const W = el.clientWidth, H = el.clientHeight
      const s = Math.max(W / IMG_W, H / IMG_H)
      const size = Math.min(s * 300, W * 0.19)
      setGeo({ size, top: s * BASELINE - size * 0.74 })
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const photo = 'absolute inset-0 h-full w-full object-cover object-[50%_0%]'

  return (
    <section className="relative isolate h-[100svh] min-h-[640px] max-h-[960px] overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(180deg,#2c679c 0%,#4f8fbf 30%,#8ec3dd 52%,#9fd0e5 64%)' }} />

      {/* will-change: qatlam GPU’da bir marta chiziladi, scroll’da faqat siljiydi (qayta bo‘yalmaydi) */}
      <motion.div ref={box} style={{ y: imgY }} className="absolute inset-x-0 bottom-0 h-[78%] will-change-transform">
        <img
          src="/photos/hero.webp"
          alt="Toshkent shahri va qorli Chimyon tog‘lari"
          className={photo}
          style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, #000 14%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 14%)' }}
        />
        {/* tashqi qatlam — faqat scroll parallaksi; ichki — faqat kirish animatsiyasi (bitta y’ni ikkisi boshqarmasin) */}
        <motion.div style={{ top: geo.top, y: wordY }} className="absolute inset-x-0 will-change-transform">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, duration: 1.2, delay: 0.1 }}
            style={{ fontSize: geo.size }}
            className="text-center font-display font-extrabold uppercase leading-[0.74] tracking-[-0.045em]"
          >
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(180deg,#ffffff 0%,#ffe4d6 45%,#f2a07b 100%)' }}
            >
              Toshkent
            </span>
            <span className="sr-only"> tirbandliksiz. Har chorrahada aqlli qaror.</span>
          </motion.h1>
        </motion.div>
        <img src="/photos/hero-front.webp" alt="" aria-hidden decoding="async" className={`${photo} pointer-events-none`} />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgb(12_11_10/0.45)_72%,rgb(12_11_10/0.75)_100%)]" />
      </motion.div>

      <div className="relative mx-auto flex h-full max-w-[1200px] flex-col items-center px-5 text-center text-white">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springSoft}
          className="mt-[13svh] inline-flex h-9 items-center rounded-full bg-white/18 px-4 text-[13px] font-medium ring-1 ring-inset ring-white/35"
        >
          Sun’iy intellekt boshqaradigan svetoforlar
        </motion.span>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSoft, delay: 0.35 }}
          className="mt-auto mb-[8svh] flex flex-col items-center"
        >
          <p className="font-display text-[clamp(28px,3.4vw,44px)] font-bold tracking-[-0.03em] [--accent-ink:#ffd2bd]">
            <span className="accent">tirbandliksiz.</span> Har chorrahada aqlli qaror.
          </p>
          <p className="mt-3 max-w-[520px] text-[15px] text-white/80 md:text-[16px]">
            Svetofor endi soatga emas, ko‘chaga qaraydi.
          </p>
          <PillButton href="/dashboard" className="mt-7 min-w-[220px]">
            Jonli xaritani ochish
          </PillButton>
        </motion.div>
      </div>
    </section>
  )
}

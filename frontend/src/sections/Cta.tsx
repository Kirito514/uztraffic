import { motion } from 'motion/react'
import { PillButton } from '@/components/PillButton'
import { reveal } from '@/lib/motion'

export function Cta() {
  return (
    <section id="aloqa" className="scroll-mt-16 px-3 pb-3 md:px-5 md:pb-5">
      <motion.div
        {...reveal}
        className="relative isolate mx-auto flex min-h-[520px] max-w-[1400px] flex-col items-center justify-center overflow-hidden rounded-[32px] px-6 py-24 text-center text-white"
      >
        <img src="/photos/aerialNight.webp" alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_45%,rgb(12_11_10/0.35),rgb(12_11_10/0.8))]" />
        <h2 className="display text-[clamp(40px,6vw,80px)] [--accent-ink:var(--color-orik)]">
          Shahar oqimini <span className="accent">birga</span>
          <br />
          boshqaraylik
        </h2>
        <p className="mt-5 max-w-[520px] text-[17px] text-white/80">
          Jonli xaritani oching, chorrahani tanlang va AI qanday qaror qabul qilayotganini o‘z ko‘zingiz bilan kuzating.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <PillButton href="/dashboard">Jonli xaritani ochish</PillButton>
          <PillButton href="/docs" variant="ghost">
            API hujjatlari
          </PillButton>
        </div>
      </motion.div>
    </section>
  )
}

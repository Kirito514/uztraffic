import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { Icon } from '@iconify/react'
import { PillButton } from '@/components/PillButton'

const COLUMNS = [
  {
    title: 'Sahifa',
    links: [
      { href: '#imkoniyatlar', label: 'Imkoniyatlar' },
      { href: '#loyiha', label: 'Loyiha haqida' },
      { href: '#qanday', label: 'Qanday ishlaydi' },
    ],
  },
  {
    title: 'Mahsulot',
    links: [
      { href: '/dashboard', label: 'Jonli xarita' },
      { href: '/gps', label: 'GPS kuzatuv' },
      { href: '/docs', label: 'API hujjatlari' },
    ],
  },
]

/* Logo so‘z belgisi CSS niqob sifatida — istalgan rangga bo‘yaladi */
const wordmark = {
  maskImage: 'url(/brand/oqim-wordmark.svg)',
  WebkitMaskImage: 'url(/brand/oqim-wordmark.svg)',
  maskSize: '100% 100%',
  WebkitMaskSize: '100% 100%',
} as const

export function Footer() {
  // ulkan yozuv footer ko‘rinishiga kirgan sari pastdan ko‘tariladi
  const big = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: big, offset: ['start end', 'end end'] })
  const y = useTransform(scrollYProgress, [0, 1], ['30%', '0%'])

  return (
    <footer className="overflow-hidden pt-20 md:pt-28">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <img src="/brand/oqim-horizontal.svg" alt="OQIM" className="-ml-2 h-12 w-auto" />
            <p className="mt-5 max-w-[360px] font-display text-[22px] font-bold leading-snug tracking-[-0.025em]">
              Toshkent tirbandliksiz. <span className="text-ash">Har chorrahada aqlli qaror.</span>
            </p>
            <PillButton href="/dashboard" variant="dark" className="mt-7">
              Jonli xaritani ochish
            </PillButton>
          </div>

          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ash">{c.title}</p>
              <ul className="mt-5 space-y-3.5">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="group inline-flex items-center gap-1.5 text-[16px] font-medium text-ink/80 transition-colors hover:text-ink">
                      {l.label}
                      <Icon
                        icon="tabler:arrow-up-right"
                        className="size-4 -translate-x-1 opacity-0 transition-[translate,opacity] duration-300 ease-out-soft group-hover:translate-x-0 group-hover:opacity-100"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-[13px] text-ash">
          <p>© 2026 OQIM</p>
          <p className="flex items-center gap-1.5">
            <Icon icon="tabler:map-pin" className="size-4 text-orik-deep" />
            Toshkent, O‘zbekiston
          </p>
          <a href="#" className="group inline-flex items-center gap-1.5 font-medium text-ink/80 transition-colors hover:text-ink">
            Tepaga
            <span className="grid size-8 place-items-center rounded-full border border-ink/15 transition-transform duration-300 ease-out-soft group-hover:-translate-y-0.5">
              <Icon icon="tabler:arrow-up" className="size-4" />
            </span>
          </a>
        </div>
      </div>

      {/* ulkan so‘z belgisi: chetlari kesilgan, och rangda — sahifaning “imzosi” */}
      <div ref={big} aria-hidden className="mx-auto mt-4 max-w-[1400px] px-3 md:px-5">
        <div className="h-[clamp(70px,13vw,190px)] overflow-hidden">
          <motion.div style={{ ...wordmark, y }} className="aspect-[354/136] w-full bg-[linear-gradient(180deg,#ece7e1,#f6f3ef)] will-change-transform" />
        </div>
      </div>
    </footer>
  )
}

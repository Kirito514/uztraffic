import { useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { spring } from '@/lib/motion'

const LINKS = [
  { href: '#imkoniyatlar', label: 'Imkoniyatlar' },
  { href: '#loyiha', label: 'Loyiha haqida' },
  { href: '#qanday', label: 'Qanday ishlaydi' },
  { href: '#aloqa', label: 'Aloqa' },
]

export function Nav() {
  const { scrollY } = useScroll()
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)

  // Hero tugagach navbar yorug‘ shaffof materialga aylanadi
  useMotionValueEvent(scrollY, 'change', (y) => setSolid(y > window.innerHeight * 0.72))

  const dark = solid || open
  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,color] duration-300',
        dark
          ? 'bg-white/72 text-ink shadow-[0_1px_0_rgb(0_0_0/0.06)] backdrop-blur-xl backdrop-saturate-180'
          : 'text-white',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 md:px-8">
        <a href="#" aria-label="OQIM AI bosh sahifa" className="-ml-2 flex items-center">
          <img
            src={dark ? '/brand/oqim-horizontal.svg' : '/brand/oqim-horizontal-dark.svg'}
            alt="OQIM"
            className="h-11 w-auto"
          />
        </a>

        {/* Sirpanuvchi fon: bitta pill havoladan havolaga spring bilan ko‘chadi (layoutId) */}
        <nav
          className="hidden items-center gap-1 text-[13px] font-medium md:flex"
          aria-label="Asosiy menyu"
          onPointerLeave={() => setHovered(null)}
        >
          {LINKS.map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              onPointerEnter={() => setHovered(i)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              className="relative rounded-full px-3.5 py-1.5 opacity-85 transition-opacity hover:opacity-100"
            >
              {hovered === i && (
                <motion.span
                  layoutId="nav-hover"
                  transition={spring}
                  className={cn(
                    'absolute inset-0 -z-10 rounded-full',
                    dark ? 'bg-ink/[0.06]' : 'bg-white/22 ring-1 ring-inset ring-white/25',
                  )}
                />
              )}
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <motion.a
            href="/dashboard"
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.1 }}
            className="flex items-center gap-2 text-[13px] font-medium"
          >
            <span
              className={cn(
                'grid size-8 place-items-center rounded-full border',
                dark ? 'border-ink/15' : 'border-white/50',
              )}
            >
              <Icon icon="tabler:arrow-right" className="size-4" />
            </span>
            <span className="hidden sm:inline">Jonli xarita</span>
          </motion.a>
          <button
            className="grid size-9 place-items-center rounded-full md:hidden"
            aria-label={open ? 'Menyuni yopish' : 'Menyuni ochish'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon icon={open ? 'tabler:x' : 'tabler:menu-2'} className="size-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring}
            className="border-t border-ink/5 px-5 pb-6 pt-2 md:hidden"
          >
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="font-display block py-3 text-[22px] font-bold tracking-tight"
              >
                {l.label}
              </a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { Icon } from '@iconify/react'
import { lockScroll } from '@/lib/smoothScroll'
import { spring, springSoft } from '@/lib/motion'
import { cn } from '@/lib/utils'

export const LINKS = [
  { href: '#imkoniyatlar', label: 'Imkoniyatlar' },
  { href: '#loyiha', label: 'Loyiha haqida' },
  { href: '#qanday', label: 'Qanday ishlaydi' },
  { href: '#aloqa', label: 'Aloqa' },
]

/* Scroll holati: `past` — sahifa ekran balandligining `threshold` qismidan pastga aylantirilgan */
export function useNavScroll(threshold = 0.72) {
  const { scrollY } = useScroll()
  const [past, setPast] = useState(false)
  useMotionValueEvent(scrollY, 'change', (y) => setPast(y > window.innerHeight * threshold))
  return { past }
}

/* Havolalar + ostida sirpanuvchi pill (layoutId). `tone` — fonga mos rang */
export function HoverLinks({ id, tone, className }: { id: string; tone: 'light' | 'dark'; className?: string }) {
  const [hovered, setHovered] = useState<number | null>(null)
  return (
    <nav className={cn('flex items-center gap-1 font-medium', className)} aria-label="Asosiy menyu" onPointerLeave={() => setHovered(null)}>
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
              layoutId={id}
              transition={spring}
              className={cn(
                'absolute inset-0 -z-10 rounded-full',
                tone === 'dark' ? 'bg-ink/[0.06]' : 'bg-white/22 ring-1 ring-inset ring-white/25',
              )}
            />
          )}
          {l.label}
        </a>
      ))}
    </nav>
  )
}

/* ikki chiziq → X: faqat transform */
export function MenuIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn('relative grid size-10 place-items-center', className)}>
      <span className={cn('absolute h-[1.5px] w-4 rounded-full bg-current transition-transform duration-300 ease-out-soft', open ? 'rotate-45' : '-translate-y-[3px]')} />
      <span className={cn('absolute h-[1.5px] w-4 rounded-full bg-current transition-transform duration-300 ease-out-soft', open ? '-rotate-45' : 'translate-y-[3px]')} />
    </span>
  )
}

export function MenuButton({ open, onClick, className }: { open: boolean; onClick: () => void; className?: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.1 }}
      aria-label={open ? 'Menyuni yopish' : 'Menyuni ochish'}
      aria-expanded={open}
      onClick={onClick}
      className={cn('grid size-10 place-items-center rounded-full', className)}
    >
      <MenuIcon open={open} />
    </motion.button>
  )
}

/* To‘liq ekranli menyu: katta havolalar navbat bilan chiqadi, pastda aloqa */
export function MenuSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    lockScroll(open)
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open, onClose])
  useEffect(() => () => lockScroll(false), [])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sheet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-40 flex flex-col bg-white/90 px-6 pb-10 pt-28 text-ink backdrop-blur-2xl md:px-16"
          role="dialog"
          aria-modal="true"
          aria-label="Menyu"
        >
          <nav className="flex flex-col">
            {LINKS.map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                onClick={onClose}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ ...springSoft, delay: 0.05 + i * 0.05 }}
                className="group flex items-center justify-between border-b border-ink/8 py-4 font-display text-[clamp(34px,6vw,64px)] font-bold tracking-[-0.035em]"
              >
                {l.label}
                <Icon icon="tabler:arrow-up-right" className="size-8 -translate-x-2 opacity-0 transition-[translate,opacity] duration-300 group-hover:translate-x-0 group-hover:opacity-100 md:size-10" />
              </motion.a>
            ))}
          </nav>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-auto flex flex-wrap items-center justify-between gap-4 text-[14px] text-ash"
          >
            <span>OQIM · Toshkent uchun aqlli svetofor</span>
            <a href="/dashboard" className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 font-medium text-krem">
              Jonli xaritani ochish <Icon icon="tabler:arrow-right" className="size-4" />
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function CtaPill({ tone, className }: { tone: 'light' | 'dark' | 'ink'; className?: string }) {
  return (
    <motion.a
      href="/dashboard"
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.1 }}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors',
        tone === 'ink' && 'bg-ink text-krem hover:bg-ink-2',
        tone === 'light' && 'bg-white text-ink hover:bg-krem',
        tone === 'dark' && 'bg-white/14 text-white ring-1 ring-inset ring-white/30 hover:bg-white/22',
        className,
      )}
    >
      Jonli xarita
      <Icon icon="tabler:arrow-right" className="size-3.5" />
    </motion.a>
  )
}

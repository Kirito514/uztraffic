import { useState } from 'react'
import { motion } from 'motion/react'
import { MenuButton, MenuSheet, LINKS, useNavScroll } from './shared'
import { cn } from '@/lib/utils'

/* D — apple.com uslubi: ingichka (48px) to‘q shaffof chiziq, mayda havolalar,
   pastga aylantirganda yashirinadi, tepaga qaytganda qayta chiqadi. */
export function NavApple() {
  const { down } = useNavScroll()
  const [open, setOpen] = useState(false)
  const hidden = down && !open

  return (
    <>
      <motion.header
        animate={{ y: hidden ? -56 : 0 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        className="fixed inset-x-0 top-0 z-50 bg-[#161617]/80 text-white backdrop-blur-xl backdrop-saturate-180"
      >
        <div className="mx-auto flex h-12 max-w-[1024px] items-center justify-between px-4">
          <a href="#" aria-label="OQIM bosh sahifa" className="flex items-center">
            <img src="/brand/oqim-horizontal-dark.svg" alt="OQIM" className="h-8 w-auto" />
          </a>
          <nav aria-label="Asosiy menyu" className="hidden items-center gap-8 text-[12px] md:flex">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-white/75 transition-colors duration-200 hover:text-white">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a href="/dashboard" className="hidden h-7 items-center rounded-full bg-orik-deep px-3.5 text-[12px] font-medium text-white transition-colors hover:bg-orik sm:inline-flex">
              Jonli xarita
            </a>
            <MenuButton open={open} onClick={() => setOpen((v) => !v)} className={cn('size-9 md:hidden', open && 'text-ink')} />
          </div>
        </div>
      </motion.header>
      <MenuSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

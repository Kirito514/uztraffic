import { useState } from 'react'
import { motion } from 'motion/react'
import { CtaPill, HoverLinks, MenuButton, MenuSheet, useNavScroll } from './shared'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'

/* Navbar — Orol (Dynamic Island): tepada to‘liq kenglikdagi shaffof panel; scroll’dan keyin
   markazdagi ixcham shisha kapsulaga “yig‘iladi”. Morf — Motion layout (faqat transform). */
export function Nav() {
  const { past } = useNavScroll(0.12)
  const [open, setOpen] = useState(false)
  const compact = past && !open
  const dark = compact || open // to‘q matn: kapsula oq yoki menyu ochiq

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3">
        <motion.div
          layout
          transition={spring}
          style={{ borderRadius: compact ? 999 : 20 }}
          className={cn(
            'flex items-center gap-2',
            compact
              ? 'h-14 bg-white/75 pl-3 pr-2 text-ink shadow-[0_10px_40px_-12px_rgb(12_11_10/0.35)] ring-1 ring-black/5 backdrop-blur-xl backdrop-saturate-150'
              : cn('h-14 w-full max-w-[1200px] justify-between px-3 md:px-5', dark ? 'text-ink' : 'text-white'),
          )}
        >
          <motion.a layout="position" href="#" aria-label="OQIM bosh sahifa" className="flex items-center">
            <img
              src={compact ? '/brand/oqim-symbol.svg' : dark ? '/brand/oqim-horizontal.svg' : '/brand/oqim-horizontal-dark.svg'}
              alt="OQIM"
              className={compact ? 'size-9' : 'h-11 w-auto'}
            />
          </motion.a>

          <motion.div layout="position" className="hidden md:block">
            <HoverLinks id="nav-island" tone={dark ? 'dark' : 'light'} className="text-[13px]" />
          </motion.div>

          <motion.div layout="position" className="flex items-center gap-1">
            <CtaPill tone={dark ? 'ink' : 'dark'} className="hidden sm:inline-flex" />
            <MenuButton open={open} onClick={() => setOpen((v) => !v)} className="md:hidden" />
          </motion.div>
        </motion.div>
      </header>
      <MenuSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

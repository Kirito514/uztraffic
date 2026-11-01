import { useState } from 'react'
import { motion, type Transition } from 'motion/react'
import { CtaPill, HoverLinks, MenuButton, MenuSheet, useNavScroll } from './shared'
import { Logo } from './Logo'
import { cn } from '@/lib/utils'

/* Orol morfi: Dynamic Island kabi ozgina “tirik” (bounce 0.14) — kapsula joyiga tushib, nafas oladi.
   Shaffoflik esa tezroq va bouncesiz: shakl hali yig‘ilayotganda sirt allaqachon paydo bo‘ladi. */
const morph: Transition = { type: 'spring', bounce: 0.14, duration: 0.65 }
const surfaceFade: Transition = { type: 'spring', bounce: 0, duration: 0.35 }

/* Navbar — Orol: tepada to‘liq kenglikdagi shaffof panel; scroll’dan keyin markazdagi ixcham
   shisha kapsulaga “yig‘iladi”. Faqat transform/opacity animatsiya qilinadi: kenglik — Motion layout,
   sirt (fon, soya, burchak) — alohida qatlam, blur esa faqat harakat tugagach yoqiladi. */
export function Nav() {
  const { past } = useNavScroll(0.12)
  const [open, setOpen] = useState(false)
  const [moving, setMoving] = useState(false)
  const compact = past && !open
  const dark = compact || open // to‘q matn: kapsula oq yoki menyu ochiq

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3">
        <motion.div
          layout
          transition={morph}
          onLayoutAnimationStart={() => setMoving(true)}
          onLayoutAnimationComplete={() => setMoving(false)}
          className={cn(
            'relative isolate flex h-14 items-center gap-2 transition-colors duration-300 ease-out-soft',
            compact ? 'pl-3.5 pr-2' : 'w-full max-w-[1200px] justify-between px-3 md:px-5',
            dark ? 'text-ink' : 'text-white',
          )}
        >
          {/* Sirt: shakl ota bilan birga morf bo‘ladi, burchak va soya masshtabga to‘g‘rilanadi */}
          <motion.div
            layout
            aria-hidden
            initial={false}
            animate={{ opacity: compact ? 1 : 0, borderRadius: compact ? 28 : 20 }}
            transition={{ ...morph, opacity: surfaceFade }}
            style={{ boxShadow: '0 12px 40px -14px rgb(12 11 10 / 0.38), 0 0 0 1px rgb(12 11 10 / 0.06)' }}
            className={cn(
              'absolute inset-0 -z-10 bg-white/80 transition-[backdrop-filter] duration-300',
              compact && !moving && 'backdrop-blur-xl backdrop-saturate-150',
            )}
          />

          <motion.a layout="position" transition={morph} href="#" aria-label="OQIM bosh sahifa" className="flex h-10 items-center">
            <Logo compact={compact} />
          </motion.a>

          <motion.div layout="position" transition={morph} className="hidden md:block">
            <HoverLinks id="nav-island" tone={dark ? 'dark' : 'light'} className="text-[13px]" />
          </motion.div>

          <motion.div layout="position" transition={morph} className="flex items-center gap-1">
            <CtaPill tone={dark ? 'ink' : 'dark'} className="hidden sm:inline-flex" />
            <MenuButton open={open} onClick={() => setOpen((v) => !v)} className="md:hidden" />
          </motion.div>
        </motion.div>
      </header>
      <MenuSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

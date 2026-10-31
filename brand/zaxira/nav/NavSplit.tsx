import { useState } from 'react'
import { CtaPill, HoverLinks, MenuButton, MenuSheet, useNavScroll } from './shared'
import { cn } from '@/lib/utils'

/* C — Uch orol: logo, havolalar va tugma alohida suzuvchi kapsulalarda.
   Hero ustida — shaffof shisha, keyin — oq shisha. */
export function NavSplit() {
  const { past } = useNavScroll()
  const [open, setOpen] = useState(false)
  const light = past || open
  const pill = cn(
    'flex h-12 items-center rounded-full ring-1 ring-inset backdrop-blur-xl transition-[background-color,color,box-shadow] duration-300',
    light ? 'bg-white/92 text-ink ring-black/5 shadow-[0_8px_30px_-14px_rgb(12_11_10/0.3)]' : 'bg-white/14 text-white ring-white/25',
  )

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-3 pt-3 md:px-5">
          <a href="#" aria-label="OQIM bosh sahifa" className={cn(pill, 'px-3')}>
            <img src={light ? '/brand/oqim-horizontal.svg' : '/brand/oqim-horizontal-dark.svg'} alt="OQIM" className="h-9 w-auto" />
          </a>
          <div className={cn(pill, 'hidden px-1.5 md:flex')}>
            <HoverLinks id="nav-split" tone={light ? 'dark' : 'light'} className="text-[13px]" />
          </div>
          <div className="flex items-center gap-2">
            <CtaPill tone="ink" className="hidden h-12 px-5 sm:inline-flex" />
            <MenuButton open={open} onClick={() => setOpen((v) => !v)} className={cn(pill, 'size-12 md:hidden')} />
          </div>
        </div>
      </header>
      <MenuSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

import { useState } from 'react'
import { CtaPill, MenuIcon, MenuSheet, useNavScroll } from './shared'
import { cn } from '@/lib/utils'

/* E — Minimal: faqat logo, tugma va “Menyu”. Havolalar to‘liq ekranli menyuda —
   barcha ekranlarda bir xil, eng toza ko‘rinish. */
export function NavMinimal() {
  const { past } = useNavScroll()
  const [open, setOpen] = useState(false)
  const dark = past || open

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-[background-color,color,box-shadow] duration-300',
          past && !open ? 'bg-white/72 text-ink shadow-[0_1px_0_rgb(0_0_0/0.06)] backdrop-blur-xl' : dark ? 'text-ink' : 'text-white',
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 md:px-8">
          <a href="#" aria-label="OQIM bosh sahifa" className="-ml-2 flex items-center">
            <img src={dark ? '/brand/oqim-horizontal.svg' : '/brand/oqim-horizontal-dark.svg'} alt="OQIM" className="h-11 w-auto" />
          </a>
          <div className="flex items-center gap-3">
            <CtaPill tone={dark ? 'ink' : 'light'} className="hidden sm:inline-flex" />
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className={cn(
                'flex h-9 items-center gap-1 rounded-full pl-4 pr-1 text-[13px] font-medium ring-1 ring-inset transition-colors',
                dark ? 'ring-ink/15' : 'ring-white/40',
              )}
            >
              {open ? 'Yopish' : 'Menyu'}
              <MenuIcon open={open} className="size-8" />
            </button>
          </div>
        </div>
      </header>
      <MenuSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@iconify/react'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { MapSettings, MapStyle } from './mapSettings'

const STYLES: { id: MapStyle; label: string; swatch: string }[] = [
  { id: 'auto', label: 'Mavzu', swatch: 'linear-gradient(135deg,#efe9e1 50%,#141312 50%)' },
  { id: 'oqim', label: 'OQIM', swatch: 'linear-gradient(135deg,#efe9e1 50%,#f2a07b 50%)' },
  { id: 'kunduzgi', label: 'Kunduzgi', swatch: 'linear-gradient(135deg,#f5f5f3 50%,#ffd666 50%)' },
  { id: 'tungi', label: 'Tungi', swatch: 'linear-gradient(135deg,#141312 50%,#2e2a26 50%)' },
]

/* Xarita qatlamlari tugmasi + popover (Apple Maps’dagi “Map” menyusi kabi) */
export function MapSettingsMenu({
  settings,
  onChange,
  tone = 'light',
}: {
  settings: MapSettings
  onChange: (p: Partial<MapSettings>) => void
  tone?: 'light' | 'dark'
}) {
  const dark = tone === 'dark'
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    addEventListener('pointerdown', onDown)
    addEventListener('keydown', onKey)
    return () => {
      removeEventListener('pointerdown', onDown)
      removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggles: { key: 'labels' | 'lanes' | 'cars' | 'traffic'; label: string; hint?: string }[] = [
    { key: 'labels', label: 'Ko‘cha nomlari' },
    { key: 'lanes', label: 'Yo‘l bo‘laklari', hint: 'Yaqinlashtirganda asfalt va chiziqlar' },
    { key: 'cars', label: 'Mashinalar', hint: 'Simulyatsiya, 15-zoomdan yaqinda' },
    { key: 'traffic', label: 'Tirbandlik', hint: 'Uzoqda namunaviy, yaqinda mashinalar tezligi va soniga qarab' },
  ]

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Xarita sozlamalari"
        className={cn(
          'grid size-9 place-items-center rounded-full ring-1 transition-colors',
          open ? (dark ? 'bg-krem text-ink ring-krem' : 'bg-ink text-krem ring-ink') : dark ? 'bg-white/8 text-krem/80 ring-white/10 hover:text-krem' : 'bg-white/90 text-ink/75 ring-black/5 hover:text-ink',
        )}
      >
        <Icon icon="tabler:stack-2" className="size-[18px]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            style={{ originX: 1, originY: 0 }} // tugmadan “o‘sib” chiqadi
            className={cn(
              'absolute right-0 top-11 z-10 w-[300px] rounded-[20px] p-3 shadow-[0_20px_50px_-20px_rgb(12_11_10/0.45)] ring-1',
              dark ? 'bg-ink-2 text-krem ring-white/10' : 'bg-white ring-black/5',
            )}
          >
            <p className={cn('px-1 pb-2 text-[11.5px] font-medium uppercase tracking-[0.06em]', dark ? 'text-krem/55' : 'text-ash')}>Uslub</p>
            <div className="grid grid-cols-4 gap-1.5">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onChange({ style: s.id })}
                  className={cn('rounded-2xl p-1.5 text-[12px] font-medium transition-colors', settings.style === s.id ? cn(dark ? 'bg-white/8' : 'bg-mist', 'ring-2 ring-orik') : dark ? 'hover:bg-white/6' : 'hover:bg-mist')}
                >
                  <span className="block h-11 rounded-xl ring-1 ring-black/5" style={{ background: s.swatch }} />
                  <span className="mt-1.5 block">{s.label}</span>
                </button>
              ))}
            </div>
            <div className={cn('mt-3 border-t pt-2', dark ? 'border-white/10' : 'border-line')}>
              {toggles.map((t) => {
                const on = settings[t.key]
                return (
                  <button key={t.key} role="switch" aria-checked={on} onClick={() => onChange({ [t.key]: !on })} className={cn('flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left', dark ? 'hover:bg-white/6' : 'hover:bg-mist/70')}>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium">{t.label}</span>
                      {t.hint && <span className={cn('block text-[11.5px]', dark ? 'text-krem/50' : 'text-ash')}>{t.hint}</span>}
                    </span>
                    <span className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200', on ? 'bg-signal-green' : dark ? 'bg-white/15' : 'bg-ink/15')}>
                      <motion.span layout transition={spring} className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow', on ? 'right-0.5' : 'left-0.5')} />
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

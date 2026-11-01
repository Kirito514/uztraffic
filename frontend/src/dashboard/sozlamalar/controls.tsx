import { type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Icon } from '@iconify/react'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useTone } from '../chorrahalar/shared'

/* Sozlamalar sahifasining boshqaruv elementlari (Apple Settings uslubi). Hammasi mavzuga moslashadi. */

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const t = useTone()
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40', checked ? 'bg-signal-green' : t.dark ? 'bg-white/15' : 'bg-ink/15')}
    >
      <motion.span layout transition={spring} className={cn('absolute top-0.5 size-6 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.2)]', checked ? 'right-0.5' : 'left-0.5')} />
    </button>
  )
}

export function Segmented<T extends string>({ id, value, options, onChange }: { id: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  const t = useTone()
  return (
    <div role="radiogroup" className={cn('inline-flex shrink-0 rounded-full p-1', t.dark ? 'bg-white/8' : 'bg-ink/5')}>
      {options.map((o) => (
        <button key={o.id} role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className="relative h-8 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-medium">
          {value === o.id && <motion.span layoutId={`seg-${id}`} transition={spring} className={cn('absolute inset-0 rounded-full shadow-sm', t.dark ? 'bg-white/15' : 'bg-white')} />}
          <span className={cn('relative', value !== o.id && t.muted)}>{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Slider({ value, min, max, step = 1, onChange, label, disabled }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; label: string; disabled?: boolean }) {
  const t = useTone()
  const pct = ((value - min) / (max - min)) * 100
  return (
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="oqim-range h-1.5 w-full cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed disabled:opacity-40"
      style={{ background: `linear-gradient(90deg, var(--color-orik-deep) ${pct}%, ${t.dark ? 'rgb(255 255 255 / 0.12)' : 'rgb(12 11 10 / 0.1)'} ${pct}%)` }}
    />
  )
}

/* bir qator: chapda nom va izoh, o‘ngda boshqaruv. `stack` — boshqaruv pastda, to‘liq kenglikda */
export function Row({ title, desc, children, stack }: { title: string; desc?: ReactNode; children?: ReactNode; stack?: boolean }) {
  const t = useTone()
  return (
    <div className={cn('flex gap-4 py-4 first:pt-1 last:pb-1', stack ? 'flex-col' : 'items-center justify-between')}>
      <div className="min-w-0">
        <p className="text-[14px] font-medium">{title}</p>
        {desc && <p className={cn('mt-0.5 text-[12.5px] leading-snug', t.muted)}>{desc}</p>}
      </div>
      {children}
    </div>
  )
}

export function Group({ title, icon, desc, children, className, id }: { title: string; icon?: string; desc?: string; children: ReactNode; className?: string; id?: string }) {
  const t = useTone()
  return (
    <section id={id} className={cn('scroll-mt-6 rounded-[24px] p-5 md:p-6', t.card, className)}>
      <header className="mb-2 flex items-center gap-3">
        {icon && (
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', t.sub)}>
            <Icon icon={icon} className="size-[18px]" />
          </span>
        )}
        <div>
          <h2 className="font-display text-[18px] font-bold tracking-[-0.02em]">{title}</h2>
          {desc && <p className={cn('text-[12.5px]', t.muted)}>{desc}</p>}
        </div>
      </header>
      <div className={cn('divide-y', t.dark ? 'divide-white/8' : 'divide-line')}>{children}</div>
    </section>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  const t = useTone()
  return (
    <kbd className={cn('inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 font-sans text-[12.5px] font-semibold shadow-[inset_0_-1px_0_rgb(0_0_0/0.12)] ring-1', t.dark ? 'bg-white/8 ring-white/12' : 'bg-white ring-black/10')}>
      {children}
    </kbd>
  )
}

/* Kichik “xarita + shisha panel” eskizi — mavzu tanlovining natijasi */
export function ThemePreview({ tone }: { tone: 'light' | 'dark' }) {
  const dark = tone === 'dark'
  const road = dark ? '#2e2a26' : '#ffffff'
  const glass = dark ? 'bg-ink/55 ring-1 ring-white/10' : 'bg-white/60 ring-1 ring-white/70'
  return (
    <span className="relative block h-full w-full overflow-hidden" style={{ background: dark ? '#141312' : '#efe9e1' }}>
      <span
        className="absolute inset-0"
        style={{ backgroundImage: `linear-gradient(90deg, transparent 47%, ${road} 47% 53%, transparent 53%), linear-gradient(0deg, transparent 58%, ${road} 58% 63%, transparent 63%)` }}
      />
      <span className="absolute left-[62%] top-[30%] size-2 rounded-full bg-signal-red" />
      <span className="absolute left-[78%] top-[66%] size-2 rounded-full bg-signal-green" />
      <span className={cn('absolute inset-y-2 left-2 w-[14%] rounded-lg backdrop-blur-md', glass)} />
      <span className={cn('absolute inset-y-2 left-[20%] w-[30%] rounded-lg backdrop-blur-md', glass)}>
        <span className={cn('absolute inset-x-2 top-2 h-1.5 rounded-full', dark ? 'bg-white/15' : 'bg-ink/10')} />
        <span className={cn('absolute left-2 right-5 top-5 h-1 rounded-full', dark ? 'bg-white/10' : 'bg-ink/8')} />
      </span>
    </span>
  )
}

/* tanlanadigan kartochka (mavzu, xarita uslubi) */
export function Choice({ on, onClick, label, hint, children, layoutId }: { on: boolean; onClick: () => void; label: string; hint?: string; children: ReactNode; layoutId: string }) {
  const t = useTone()
  return (
    <button role="radio" aria-checked={on} onClick={onClick} className={cn('group rounded-[18px] p-1.5 text-left transition-colors', t.hover)}>
      <span className={cn('relative block aspect-[16/10] overflow-hidden rounded-[13px] ring-1 transition-shadow', on ? 'ring-2 ring-orik' : t.dark ? 'ring-white/10' : 'ring-black/8')}>{children}</span>
      <span className="mt-2 flex items-center gap-2 px-1">
        <span className={cn('grid size-[16px] shrink-0 place-items-center rounded-full ring-1 ring-inset', on ? 'bg-orik ring-orik' : t.dark ? 'ring-white/25' : 'ring-ink/20')}>
          {on && <motion.span layoutId={layoutId} transition={spring} className="size-1.5 rounded-full bg-ink" />}
        </span>
        <span className="text-[13px] font-medium">{label}</span>
      </span>
      {hint && <span className={cn('mt-0.5 block pl-7 pr-1 text-[12px] leading-snug', t.muted)}>{hint}</span>}
    </button>
  )
}

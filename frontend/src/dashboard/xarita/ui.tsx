import { useState } from 'react'
import { motion } from 'motion/react'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { LEVEL, type Level, type Spot } from './sample'

type Tone = 'light' | 'dark'

export function LevelChip({ level, tone = 'light', className }: { level: Level; tone?: Tone; className?: string }) {
  const l = LEVEL[level]
  return (
    <span
      className={cn('inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium', className)}
      style={tone === 'light' ? { background: l.soft, color: l.text } : { background: `${l.color}22`, color: l.color }}
    >
      <span className="size-1.5 rounded-full" style={{ background: l.color }} />
      {l.label}
    </span>
  )
}

/* Bu sahifadagi raqamlar o‘lchov emasligini doim ko‘rsatib turamiz */
export function SampleBadge({ tone = 'light' }: { tone?: Tone }) {
  return (
    <span
      title="Dizayn uchun qo‘lda yozilgan ma’lumot — jonli manba hali ulanmagan"
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium',
        tone === 'light' ? 'bg-white/90 text-ink/70 ring-1 ring-black/5' : 'bg-white/8 text-krem/70 ring-1 ring-white/10',
      )}
    >
      <span className="size-1.5 rounded-full bg-signal-amber" /> Namunaviy ma’lumot
    </span>
  )
}

/* AI / Fiks: segment boshqaruvi, tanlov ostidagi pill sirpanadi (hozircha faqat ko‘rinish) */
export function ModeToggle({ tone = 'light', id }: { tone?: Tone; id: string }) {
  const [mode, setMode] = useState<'ai' | 'fixed'>('ai')
  return (
    <div
      role="radiogroup"
      aria-label="Svetofor rejimi"
      className={cn('flex h-9 items-center rounded-full p-1', tone === 'light' ? 'bg-white/90 ring-1 ring-black/5' : 'bg-white/8 ring-1 ring-white/10')}
    >
      {(['ai', 'fixed'] as const).map((m) => (
        <button
          key={m}
          role="radio"
          aria-checked={mode === m}
          onClick={() => setMode(m)}
          className={cn(
            'relative h-7 rounded-full px-3.5 text-[12.5px] font-medium transition-colors',
            mode === m ? (tone === 'light' ? 'text-krem' : 'text-ink') : tone === 'light' ? 'text-ink/60' : 'text-krem/60',
          )}
        >
          {mode === m && <motion.span layoutId={`mode-${id}`} transition={spring} className={cn('absolute inset-0 rounded-full', tone === 'light' ? 'bg-ink' : 'bg-krem')} />}
          <span className="relative">{m === 'ai' ? 'AI' : 'Fiks taymer'}</span>
        </button>
      ))}
    </div>
  )
}

/* Ikki yo‘nalish: qaysi biri yashil, navbat uzunligi va yashil tugashiga qolgan vaqt */
export function SignalPhase({ spot, tone = 'light' }: { spot: Spot; tone?: Tone }) {
  const rows = [
    { axis: 'NS' as const, label: 'Shimol – janub', q: spot.ns },
    { axis: 'EW' as const, label: 'G‘arb – sharq', q: spot.ew },
  ]
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const on = spot.green === r.axis
        return (
          <div key={r.axis}>
            <div className="flex items-center justify-between text-[12.5px]">
              <span className={cn('flex items-center gap-2', tone === 'light' ? 'text-ink/80' : 'text-krem/80')}>
                <span className={cn('size-2.5 rounded-full', on ? 'bg-signal-green' : 'bg-signal-red')} />
                {r.label}
              </span>
              <span className={cn('tabular-nums', tone === 'light' ? 'text-ash' : 'text-krem/50')}>
                {on ? `yashil · ${spot.left} s` : 'qizil'} · {r.q} ta
              </span>
            </div>
            <div className={cn('mt-1.5 h-1.5 overflow-hidden rounded-full', tone === 'light' ? 'bg-ink/6' : 'bg-white/8')}>
              <div className={cn('h-full rounded-full', on ? 'bg-signal-green' : tone === 'light' ? 'bg-ink/30' : 'bg-krem/35')} style={{ width: `${Math.min(r.q / 30, 1) * 100}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

import { motion } from 'motion/react'
import { Icon } from '@iconify/react'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useTheme, type ThemePref } from '../theme'

/* Kichik “xarita + shisha panel” eskizi: tanlovning natijasini oldindan ko‘rsatadi */
function Preview({ tone }: { tone: 'light' | 'dark' }) {
  const dark = tone === 'dark'
  return (
    <span className="relative block h-full w-full overflow-hidden" style={{ background: dark ? '#141312' : '#efe9e1' }}>
      {/* ko‘chalar */}
      <span className="absolute inset-0" style={{ backgroundImage: `linear-gradient(90deg, transparent 47%, ${dark ? '#2e2a26' : '#ffffff'} 47% 53%, transparent 53%), linear-gradient(0deg, transparent 58%, ${dark ? '#2e2a26' : '#ffffff'} 58% 63%, transparent 63%), linear-gradient(28deg, transparent 70%, ${dark ? '#262320' : '#fbf8f4'} 70% 73%, transparent 73%)` }} />
      <span className="absolute left-[62%] top-[30%] size-2 rounded-full bg-signal-red ring-2" style={{ ['--tw-ring-color' as string]: dark ? '#0c0b0a' : '#fff' }} />
      <span className="absolute left-[78%] top-[66%] size-2 rounded-full bg-signal-green ring-2" style={{ ['--tw-ring-color' as string]: dark ? '#0c0b0a' : '#fff' }} />
      {/* sidebar va panel — shisha */}
      <span className={cn('absolute inset-y-2 left-2 w-[14%] rounded-lg backdrop-blur-md', dark ? 'bg-ink/55 ring-1 ring-white/10' : 'bg-white/60 ring-1 ring-white/70')} />
      <span className={cn('absolute inset-y-2 left-[20%] w-[30%] rounded-lg backdrop-blur-md', dark ? 'bg-ink/55 ring-1 ring-white/10' : 'bg-white/60 ring-1 ring-white/70')}>
        <span className={cn('absolute inset-x-2 top-2 h-1.5 rounded-full', dark ? 'bg-white/15' : 'bg-ink/10')} />
        <span className={cn('absolute left-2 right-5 top-5 h-1 rounded-full', dark ? 'bg-white/10' : 'bg-ink/8')} />
        <span className={cn('absolute left-2 right-7 top-8 h-1 rounded-full', dark ? 'bg-white/10' : 'bg-ink/8')} />
      </span>
    </span>
  )
}

const OPTIONS: { id: ThemePref; label: string; hint: string }[] = [
  { id: 'light', label: 'Och shisha', hint: 'Iliq krem xarita, oq shisha panellar' },
  { id: 'dark', label: 'To‘q shisha', hint: 'Tungi xarita, qora shisha panellar' },
  { id: 'system', label: 'Tizimga mos', hint: 'Kompyuterdagi sozlamaga ergashadi' },
]

/* Sozlamalar (Apple Settings uslubi): guruhlangan kartalar; hozircha — ko‘rinish (mavzu) */
export function SozlamalarPage() {
  const { pref, tone, setPref } = useTheme()
  const dark = tone === 'dark'

  return (
    <div className="max-w-[760px] space-y-6">
      <section className={cn('rounded-[24px] p-5 ring-1 ring-inset md:p-6', dark ? 'bg-white/[0.04] ring-white/8' : 'bg-white ring-line')}>
        <h2 className="font-display text-[19px] font-bold tracking-[-0.02em]">Ko‘rinish</h2>
        <p className={cn('mt-1 text-[13.5px]', dark ? 'text-krem/55' : 'text-ash')}>Dashboard mavzusi — xarita va uning ustidagi shisha panellar tusi.</p>

        <div role="radiogroup" aria-label="Mavzu" className="mt-5 grid gap-3 sm:grid-cols-3">
          {OPTIONS.map((o) => {
            const on = pref === o.id
            return (
              <button
                key={o.id}
                role="radio"
                aria-checked={on}
                onClick={() => setPref(o.id)}
                className={cn('group rounded-[20px] p-2 text-left transition-colors', dark ? 'hover:bg-white/[0.04]' : 'hover:bg-mist')}
              >
                <span className={cn('relative block aspect-[16/10] overflow-hidden rounded-[14px] ring-1 transition-shadow', on ? 'ring-2 ring-orik' : dark ? 'ring-white/10' : 'ring-black/8')}>
                  {o.id === 'system' ? (
                    <span className="absolute inset-0 flex">
                      <span className="relative w-1/2 overflow-hidden">
                        <span className="absolute inset-y-0 left-0 w-[200%]">
                          <Preview tone="light" />
                        </span>
                      </span>
                      <span className="relative w-1/2 overflow-hidden">
                        <span className="absolute inset-y-0 right-0 w-[200%]">
                          <Preview tone="dark" />
                        </span>
                      </span>
                    </span>
                  ) : (
                    <Preview tone={o.id} />
                  )}
                </span>
                <span className="mt-3 flex items-center gap-2 px-1">
                  <span className={cn('grid size-[18px] place-items-center rounded-full ring-1 ring-inset', on ? 'bg-orik ring-orik' : dark ? 'ring-white/25' : 'ring-ink/20')}>
                    {on && <motion.span layoutId="theme-dot" transition={spring} className="size-1.5 rounded-full bg-ink" />}
                  </span>
                  <span className="text-[14px] font-medium">{o.label}</span>
                </span>
                <span className={cn('mt-0.5 block px-1 pl-7 text-[12.5px] leading-snug', dark ? 'text-krem/50' : 'text-ash')}>{o.hint}</span>
              </button>
            )
          })}
        </div>
      </section>

      <p className={cn('flex items-center gap-2 text-[12.5px]', dark ? 'text-krem/45' : 'text-ash')}>
        <Icon icon="tabler:device-floppy" className="size-4" /> Tanlov shu brauzerda saqlanadi.
      </p>
    </div>
  )
}

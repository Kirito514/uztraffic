import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { useTone } from '../chorrahalar/shared'
import { DivergingBars, Legend, LineChart, type Series } from './charts'
import { avg, BY_SPOT, HOURLY, SERIES } from './data'

/* AI tahlil — hisobot: “AI foyda beryaptimi?” degan savolga bitta sahifada javob —
   ko‘rsatkichlar, sutka davomida kutish vaqti va chorrahalar kesimidagi farq. */
export function TahlilReport() {
  const t = useTone()
  const series: Series[] = [
    { key: 'ai', label: SERIES.ai.label, color: t.dark ? SERIES.ai.dark : SERIES.ai.light },
    { key: 'fixed', label: SERIES.fixed.label, color: t.dark ? SERIES.fixed.dark : SERIES.fixed.light },
  ]
  const ai = avg('ai')
  const fixed = avg('fixed')
  const diff = Math.round((ai - fixed) * 10) / 10
  const wins = BY_SPOT.filter((r) => r.diff < 0).length
  const kpis = [
    { label: 'AI · o‘rtacha kutish', value: `${ai} s`, dot: series[0].color },
    { label: 'Fiks taymer · o‘rtacha kutish', value: `${fixed} s`, dot: series[1].color },
    { label: 'Farq (AI − fiks)', value: `${diff > 0 ? '+' : ''}${diff} s`, icon: diff <= 0 ? 'tabler:trending-down' : 'tabler:trending-up', hint: diff <= 0 ? 'AI tezroq' : 'Fiks tezroq' },
    { label: 'AI yutgan chorrahalar', value: `${wins} / ${BY_SPOT.length}`, icon: 'tabler:traffic-lights' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={cn('rounded-[22px] p-4', t.card)}>
            <p className={cn('flex items-center gap-1.5 text-[12.5px]', t.muted)}>
              {k.dot && <span className="size-2 rounded-full" style={{ background: k.dot }} />}
              {k.icon && <Icon icon={k.icon} className="size-4" />}
              {k.label}
            </p>
            <p className="mt-2 font-display text-[30px] font-bold leading-none tabular-nums tracking-[-0.03em]">{k.value}</p>
            {k.hint && <p className={cn('mt-1.5 text-[12px]', t.muted)}>{k.hint}</p>}
          </div>
        ))}
      </div>

      <section className={cn('rounded-[24px] p-5', t.card)}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold">O‘rtacha kutish — sutka davomida, s</h2>
          <Legend series={series} />
        </div>
        <LineChart rows={HOURLY} x="h" series={series} xLabel={(h) => `${String(h).padStart(2, '0')}:00`} unit="s" />
      </section>

      <section className={cn('rounded-[24px] p-5', t.card)}>
        <div className="mb-3">
          <h2 className="text-[15px] font-semibold">Chorrahalar kesimida farq</h2>
          <p className={cn('mt-0.5 text-[12.5px]', t.muted)}>AI va fiks taymer o‘rtacha kutishi orasidagi farq — chapga AI yaxshiroq, o‘ngga fiks</p>
        </div>
        <DivergingBars
          rows={BY_SPOT.map((r) => ({ label: r.name, value: r.diff, detail: `AI ${r.ai} s · fiks ${r.fixed} s` }))}
          neg={series[0]}
          pos={series[1]}
          unit="s"
        />
      </section>
    </div>
  )
}

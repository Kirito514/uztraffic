import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Icon } from '@iconify/react'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useTone } from '../chorrahalar/shared'
import { Group, Row } from './controls'
import { DataRows, DensityRow, MapStyleChoices, MapToggles, MotionRow, ResetRow, SECTIONS, ShortcutRows, ThemeChoices, useSettings, type SectionId, type SettingsModel } from './sections'

/* bo‘lim mazmuni */
function body(id: SectionId, s: SettingsModel): ReactNode {
  switch (id) {
    case 'korinish':
      return (
        <>
          <Row stack title="Mavzu" desc="Xarita va uning ustidagi shisha panellar tusi">
            <ThemeChoices s={s} />
          </Row>
          <MotionRow s={s} />
        </>
      )
    case 'xarita':
      return (
        <>
          <Row stack title="Uslub" desc="“Mavzu” — och mavzuda OQIM, to‘q mavzuda tungi xarita">
            <MapStyleChoices s={s} />
          </Row>
          <MapToggles s={s} />
          <DensityRow s={s} />
        </>
      )
    case 'klaviatura':
      return <ShortcutRows />
    case 'malumot':
      return <DataRows s={s} />
    case 'tiklash':
      return <ResetRow />
  }
}

/* Sozlamalar (macOS “Tizim sozlamalari” uslubi): chapda bo‘limlar, o‘ngda tanlangani */
export function SettingsList() {
  const t = useTone()
  const s = useSettings()
  const [id, setId] = useState<SectionId>('korinish')
  const sec = SECTIONS.find((x) => x.id === id)!
  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,760px)]">
      <nav aria-label="Sozlamalar bo‘limlari" className={cn('h-fit rounded-[24px] p-2 lg:sticky lg:top-3', t.card)}>
        {SECTIONS.map((x) => {
          const on = x.id === id
          return (
            <button key={x.id} onClick={() => setId(x.id)} aria-current={on} className={cn('relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left', !on && t.hover)}>
              {on && <motion.span layoutId="settings-nav" transition={spring} className={cn('absolute inset-0 rounded-2xl', t.active)} />}
              <Icon icon={x.icon} className="relative size-[18px] shrink-0" />
              <span className="relative min-w-0">
                <span className="block text-[13.5px] font-medium">{x.title}</span>
                <span className={cn('block truncate text-[12px]', t.muted)}>{x.desc}</span>
              </span>
            </button>
          )
        })}
      </nav>
      {/* chiqish animatsiyasisiz: ichidagi layoutId’li boshqaruvlar bilan “wait” rejimi osilib qoladi */}
      <motion.div key={id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', bounce: 0, duration: 0.3 }}>
        <Group title={sec.title} icon={sec.icon} desc={sec.desc}>
          {body(id, s)}
        </Group>
      </motion.div>
    </div>
  )
}

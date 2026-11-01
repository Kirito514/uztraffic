import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { useTone } from '../chorrahalar/shared'
import { useTheme, type ThemePref } from '../theme'
import { useMapSettings } from '../xarita/useMapSettings'
import { DENSITY, type MapStyle } from '../xarita/mapSettings'
import { loadIndex, type CityIndex } from '../xarita/roads'
import { Choice, Kbd, Row, Segmented, Slider, ThemePreview, Toggle } from './controls'

/* Sozlamalar modeli: bir joyda — har variant shu bitta holatni turlicha joylashtiradi.
   Har sozlama haqiqatan ishlaydi: mavzu va harakat — butun dashboard’ga, xarita — Jonli xarita sahifasiga. */
export function useSettings() {
  const theme = useTheme()
  const [map, setMap] = useMapSettings()
  const [city, setCity] = useState<CityIndex | null>(null)
  useEffect(() => {
    loadIndex()
      .then(setCity)
      .catch(() => setCity(null))
  }, [])
  return { theme, map, setMap, city }
}
export type SettingsModel = ReturnType<typeof useSettings>

export const SECTIONS = [
  { id: 'korinish', title: 'Ko‘rinish', icon: 'tabler:palette', desc: 'Mavzu va animatsiyalar' },
  { id: 'xarita', title: 'Xarita', icon: 'tabler:map-2', desc: 'Uslub, qatlamlar va mashinalar' },
  { id: 'klaviatura', title: 'Klaviatura', icon: 'tabler:keyboard', desc: 'Tezkor tugmalar' },
  { id: 'malumot', title: 'Ma’lumot', icon: 'tabler:database', desc: 'Manba va xarita ma’lumotlari' },
  { id: 'tiklash', title: 'Tiklash', icon: 'tabler:restore', desc: 'Standart holatga qaytarish' },
] as const
export type SectionId = (typeof SECTIONS)[number]['id']

const THEMES: { id: ThemePref; label: string; hint: string }[] = [
  { id: 'light', label: 'Och shisha', hint: 'Krem xarita, oq shisha' },
  { id: 'dark', label: 'To‘q shisha', hint: 'Tungi xarita, qora shisha' },
  { id: 'system', label: 'Tizimga mos', hint: 'Kompyuter sozlamasi' },
]

export function ThemeChoices({ s, layoutId = 'theme-dot' }: { s: SettingsModel; layoutId?: string }) {
  return (
    <div role="radiogroup" aria-label="Mavzu" className="grid grid-cols-3 gap-2">
      {THEMES.map((o) => (
        <Choice key={o.id} on={s.theme.pref === o.id} onClick={() => s.theme.setPref(o.id)} label={o.label} hint={o.hint} layoutId={layoutId}>
          {o.id === 'system' ? (
            <span className="absolute inset-0 flex">
              <span className="relative w-1/2 overflow-hidden">
                <span className="absolute inset-y-0 left-0 w-[200%]">
                  <ThemePreview tone="light" />
                </span>
              </span>
              <span className="relative w-1/2 overflow-hidden">
                <span className="absolute inset-y-0 right-0 w-[200%]">
                  <ThemePreview tone="dark" />
                </span>
              </span>
            </span>
          ) : (
            <ThemePreview tone={o.id} />
          )}
        </Choice>
      ))}
    </div>
  )
}

export function MotionRow({ s }: { s: SettingsModel }) {
  return (
    <Row title="Harakat" desc="Kamaytirilganda siljish va kattalashish animatsiyalari o‘chadi, faqat silliq paydo bo‘lish qoladi">
      <Segmented
        id="motion"
        value={s.theme.motion}
        onChange={s.theme.setMotion}
        options={[
          { id: 'system', label: 'Tizimga mos' },
          { id: 'reduce', label: 'Kamaytirilgan' },
        ]}
      />
    </Row>
  )
}

const STYLES: { id: MapStyle; label: string; swatch: string }[] = [
  { id: 'auto', label: 'Mavzu', swatch: 'linear-gradient(135deg,#efe9e1 50%,#141312 50%)' },
  { id: 'oqim', label: 'OQIM', swatch: 'linear-gradient(135deg,#efe9e1 50%,#f2a07b 50%)' },
  { id: 'kunduzgi', label: 'Kunduzgi', swatch: 'linear-gradient(135deg,#f2f3f0 50%,#d5d5d5 50%)' },
  { id: 'tungi', label: 'Tungi', swatch: 'linear-gradient(135deg,#141312 50%,#3d3935 50%)' },
]

export function MapStyleChoices({ s, layoutId = 'map-style-dot' }: { s: SettingsModel; layoutId?: string }) {
  return (
    <div role="radiogroup" aria-label="Xarita uslubi" className="grid grid-cols-4 gap-2">
      {STYLES.map((o) => (
        <Choice key={o.id} on={s.map.style === o.id} onClick={() => s.setMap({ style: o.id })} label={o.label} layoutId={layoutId}>
          <span className="absolute inset-0" style={{ background: o.swatch }} />
        </Choice>
      ))}
    </div>
  )
}

export function MapToggles({ s }: { s: SettingsModel }) {
  return (
    <>
      <Row title="Ko‘cha nomlari" desc="Xaritadagi ko‘cha yozuvlari">
        <Toggle label="Ko‘cha nomlari" checked={s.map.labels} onChange={(v) => s.setMap({ labels: v })} />
      </Row>
      <Row title="Yo‘l bo‘laklari" desc="Yaqinlashtirganda haqiqiy kenglikdagi asfalt va chiziqlar (OSM)">
        <Toggle label="Yo‘l bo‘laklari" checked={s.map.lanes} onChange={(v) => s.setMap({ lanes: v })} />
      </Row>
      <Row title="Mashinalar" desc="Bo‘laklar bo‘ylab yuradigan simulyatsiya — 15-zoomdan yaqinda">
        <Toggle label="Mashinalar" checked={s.map.cars} onChange={(v) => s.setMap({ cars: v })} />
      </Row>
    </>
  )
}

export function DensityRow({ s, big }: { s: SettingsModel; big?: boolean }) {
  const t = useTone()
  const level = s.map.density < 10 ? 'Siyrak' : s.map.density < 18 ? 'O‘rtacha' : 'Tig‘iz'
  return (
    <Row
      stack
      title="Mashinalar zichligi"
      desc={s.map.cars ? 'Ko‘proq mashina — tig‘izroq ko‘chalar, lekin hisob ham ko‘payadi' : 'Mashinalar o‘chiq'}
    >
      <div className="flex items-center gap-4">
        <Slider label="Mashinalar zichligi" value={s.map.density} min={DENSITY.min} max={DENSITY.max} onChange={(v) => s.setMap({ density: v })} disabled={!s.map.cars} />
        <span className={cn('w-28 shrink-0 text-right tabular-nums', big ? 'font-display text-[22px] font-bold' : 'text-[13px] font-semibold')}>
          {s.map.density}
          <span className={cn('ml-1 text-[11.5px] font-normal', t.muted)}>/ bo‘lak-km</span>
        </span>
      </div>
      <p className={cn('-mt-2 text-[12px]', t.muted)}>{level}</p>
    </Row>
  )
}

export function ShortcutRows() {
  const items: [string[], string][] = [
    [['['], 'Sidebar’ni yig‘ish yoki kengaytirish'],
    [['Esc'], 'Ochiq menyuni yopish'],
    [['Ctrl', 'bosish'], 'Bo‘limni yangi tabda ochish'],
  ]
  return (
    <>
      {items.map(([keys, label]) => (
        <Row key={label} title={label}>
          <span className="flex items-center gap-1">
            {keys.map((k, i) => (
              <span key={k} className="flex items-center gap-1">
                {i > 0 && <span className="text-[12px] opacity-50">+</span>}
                <Kbd>{k}</Kbd>
              </span>
            ))}
          </span>
        </Row>
      ))}
    </>
  )
}

export function DataRows({ s, compact }: { s: SettingsModel; compact?: boolean }) {
  const t = useTone()
  const c = s.city
  return (
    <>
      <Row title="Ma’lumot manbai" desc="Chorraha holatlari va AI natijalari hozircha namunaviy — jonli backend ulanmagan">
        <span className={cn('inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium', t.sub)}>
          <span className="size-1.5 rounded-full bg-signal-amber" /> Namunaviy
        </span>
      </Row>
      <Row title="Ko‘chalar (OpenStreetMap)" desc={c ? `Yangilangan: ${c.built}` : 'Yuklanmoqda…'} stack={!compact}>
        {c && (
          <div className={cn('grid grid-cols-3 gap-2', compact && 'w-full')}>
            {[
              [c.roads.toLocaleString('ru-RU').replace(/,/g, ' '), 'ko‘cha'],
              [c.tiles.length, 'katak'],
              [c.signals, 'svetofor'],
            ].map(([v, l]) => (
              <div key={l as string} className={cn('rounded-xl px-3 py-2', t.sub)}>
                <p className="font-display text-[18px] font-bold tabular-nums">{v}</p>
                <p className={cn('text-[11.5px]', t.muted)}>{l}</p>
              </div>
            ))}
          </div>
        )}
      </Row>
      <Row title="Xarita" desc="© OpenStreetMap hissadorlari · OpenFreeMap (kalitsiz)">
        <Icon icon="tabler:world" className={cn('size-5', t.muted)} />
      </Row>
    </>
  )
}

const KEYS = ['oqim.theme', 'oqim.motion', 'oqim.mapSettings.v3', 'oqim.sidebar']

export function ResetRow() {
  const t = useTone()
  const [ask, setAsk] = useState(false)
  const reset = () => {
    for (const k of KEYS)
      try {
        localStorage.removeItem(k)
      } catch {
        /* saqlash yopiq */
      }
    location.reload()
  }
  return (
    <Row title="Barcha sozlamalarni tiklash" desc="Mavzu, harakat, xarita va sidebar holati standartga qaytadi. Faqat shu brauzerda.">
      {ask ? (
        <span className="flex shrink-0 gap-2">
          <button onClick={() => setAsk(false)} className={cn('h-9 rounded-full px-4 text-[13px] font-medium', t.chipOff)}>
            Bekor
          </button>
          <button onClick={reset} className="h-9 rounded-full bg-signal-red px-4 text-[13px] font-medium text-white">
            Ha, tiklash
          </button>
        </span>
      ) : (
        <button onClick={() => setAsk(true)} className={cn('h-9 shrink-0 rounded-full px-4 text-[13px] font-medium', t.chipOff)}>
          Tiklash…
        </button>
      )}
    </Row>
  )
}

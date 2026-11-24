import { useState } from 'react'
import { DEFAULT_SETTINGS, STYLE_OPTIONS, type MapSettings } from './mapSettings'

const KEY = 'oqim.mapSettings.v3' // v3: MapLibre — bo‘laklar sozlamasi qo‘shildi

/* Sozlamalar shu brauzerda eslab qolinadi (shaxsiy qulaylik) */
export function useMapSettings() {
  const [s, setS] = useState<MapSettings>(() => {
    try {
      const saved: MapSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
      // eski uslublar (OQIM, Kunduzgi, Tungi) olib tashlangan — ular “Mavzu”ga o‘tadi
      return STYLE_OPTIONS.some((o) => o.id === saved.style) ? saved : { ...saved, style: 'auto' }
    } catch {
      return DEFAULT_SETTINGS
    }
  })
  const set = (patch: Partial<MapSettings>) =>
    setS((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        /* saqlash yopiq — faqat shu sessiya */
      }
      return next
    })
  return [s, set] as const
}

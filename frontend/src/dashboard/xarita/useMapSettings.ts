import { useState } from 'react'
import { DEFAULT_SETTINGS, type MapSettings } from './mapSettings'

const KEY = 'oqim.mapSettings.v3' // v3: MapLibre — bo‘laklar sozlamasi qo‘shildi

/* Sozlamalar shu brauzerda eslab qolinadi (shaxsiy qulaylik) */
export function useMapSettings() {
  const [s, setS] = useState<MapSettings>(() => {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
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

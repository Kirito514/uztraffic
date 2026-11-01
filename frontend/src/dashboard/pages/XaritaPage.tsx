import { useState } from 'react'
import { useSetChrome } from '../chrome'
import { useTheme } from '../theme'
import { XaritaView } from '../xarita/XaritaView'
import { useMapSettings } from '../xarita/useMapSettings'

/* Jonli xarita — xarita butun ekranda, ustidagi hamma narsa shisha.
   Och yoki to‘q shisha — Sozlamalar sahifasidagi mavzuga qarab. */
export function XaritaPage() {
  const { tone } = useTheme()
  const [selected, setSelected] = useState<string | null>(null)
  const [settings, setSettings] = useMapSettings()
  useSetChrome({ full: true, glass: tone, sidebar: 'glass' })

  return <XaritaView selected={selected} onSelect={setSelected} settings={settings} onSettings={setSettings} layout="full" tone={tone} />
}

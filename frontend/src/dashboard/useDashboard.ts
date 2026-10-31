import { useCallback, useEffect, useRef, useState } from 'react'
import { MockCity, type CityData } from './mock'
import { isSnapshot, type LatLng, type Mode, type Snapshot } from './types'

/* Ma’lumot manbai: avval backend WebSocket’i (kontraktga mos bo‘lsa — “jonli”),
   aks holda brauzer ichidagi namunaviy shahar. Ikkalasi ham har 1 s da Snapshot beradi. */
export type Source = 'connecting' | 'live' | 'mock'
export type SeriesPoint = { t: number; ai: number; fixed: number; congestion: number }

const SERIES_MAX = 180 // 3 daqiqa

export function useDashboard() {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [source, setSource] = useState<Source>('connecting')
  const [series, setSeries] = useState<SeriesPoint[]>([])
  const [city, setCity] = useState<CityData | null>(null)
  const mock = useRef<MockCity | null>(null)

  const push = useCallback((s: Snapshot) => {
    setSnap(s)
    setSeries((prev) => {
      const next = [...prev, { t: Date.now(), ai: s.stats.avgWaitAi, fixed: s.stats.avgWaitFixed, congestion: s.stats.congestion }]
      return next.length > SERIES_MAX ? next.slice(-SERIES_MAX) : next
    })
  }, [])

  // ko‘chalar (xarita ustidagi yo‘l chiziqlari va namunaviy rejim uchun)
  useEffect(() => {
    fetch('/dashboard/mock-city.json')
      .then((r) => r.json())
      .then(setCity)
      .catch(() => setCity(null))
  }, [])

  useEffect(() => {
    if (!city) return
    let ws: WebSocket | null = null
    let timer = 0
    let decided = false

    const startMock = () => {
      if (decided) return
      decided = true
      if (ws) {
        ws.onmessage = ws.onclose = ws.onerror = null // namunaviy rejimdan keyin jonli xabarlar aralashmasin
        ws.close()
      }
      mock.current = new MockCity(city)
      setSource('mock')
      push(mock.current.snapshot())
      timer = window.setInterval(() => {
        mock.current!.tick(1)
        push(mock.current!.snapshot())
      }, 1000)
    }

    try {
      ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/realtime`)
      ws.onmessage = (e) => {
        let data: unknown
        try {
          data = JSON.parse(e.data)
        } catch {
          return
        }
        if (!isSnapshot(data)) return startMock() // eski server — boshqa shakl
        if (!decided) {
          decided = true
          setSource('live')
        }
        push(data)
      }
      ws.onerror = () => startMock()
      ws.onclose = () => !decided && startMock()
    } catch {
      startMock()
    }
    const fallback = window.setTimeout(startMock, 3500)

    return () => {
      decided = true // tozalangan effekt endi hech narsa ishga tushirmasin (onclose → startMock oqib chiqmasin)
      clearTimeout(fallback)
      clearInterval(timer)
      if (ws) {
        ws.onmessage = ws.onclose = ws.onerror = null
        ws.close()
      }
    }
  }, [city, push])

  const setMode = useCallback(
    async (mode: Mode) => {
      if (source === 'mock') {
        mock.current?.setMode(mode)
        push(mock.current!.snapshot())
        return
      }
      await fetch('/api/mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) })
    },
    [source, push],
  )

  const startEmergency = useCallback(
    async (from: LatLng, to: LatLng) => {
      if (source === 'mock') {
        mock.current?.startEmergency(from, to)
        push(mock.current!.snapshot())
        return
      }
      await fetch('/api/emergency/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to }) })
    },
    [source, push],
  )

  const cancelEmergency = useCallback(async () => {
    if (source === 'mock') {
      mock.current?.cancelEmergency()
      push(mock.current!.snapshot())
      return
    }
    await fetch('/api/emergency', { method: 'DELETE' })
  }, [source, push])

  return { snap, source, series, city, setMode, startEmergency, cancelEmergency }
}

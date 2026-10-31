import { useCallback, useEffect, useRef, useState } from 'react'
import { MotionConfig } from 'motion/react'
import { Icon } from '@iconify/react'
import { Sidebar, NAV } from './Sidebar'
import { Topbar } from './Topbar'
import { MapCard, type MapHandle } from './MapCard'
import { EmergencyCard, EventsCard, IntersectionTable, Kpis, StatusCard, WaitChart } from './Panels'
import { useDashboard } from './useDashboard'
import type { LatLng } from './types'

export function Dashboard() {
  const { snap, source, series, city, setMode, startEmergency, cancelEmergency } = useDashboard()
  const [selected, setSelected] = useState<string | null>(null)
  const [active, setActive] = useState('xarita')
  const map = useRef<MapHandle>(null)

  // yig‘ilgan sidebar holati brauzerda eslab qolinadi; “[” tugmasi bilan ham almashadi
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('oqim.sidebar') === 'narrow'
    } catch {
      return false
    }
  })
  const toggleSidebar = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem('oqim.sidebar', c ? 'wide' : 'narrow')
      } catch {
        /* xususiy rejim — eslab qolmaymiz */
      }
      return !c
    })
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '[' && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|TEXTAREA/.test(t.tagName)) toggleSidebar()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [toggleSidebar])

  const navigate = (id: string) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const focus = useCallback((id: string) => map.current?.focus(id), [])
  const route = useCallback((a: LatLng, b: LatLng) => startEmergency(a, b), [startEmergency])

  // scroll bo‘yicha sidebar’dagi faol bo‘lim: yuqori qismi ekranning 35% chizig‘idan o‘tgan eng pastki bo‘lim
  useEffect(() => {
    const onScroll = () => {
      const line = innerHeight * 0.35
      let best = NAV[0].id
      let bestTop = -Infinity
      for (const n of NAV) {
        const top = document.getElementById(n.id)?.getBoundingClientRect().top
        if (top !== undefined && top <= line && top > bestTop) {
          best = n.id
          bestTop = top
        }
      }
      setActive(best)
    }
    onScroll()
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [snap === null])

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-svh gap-5 bg-mist p-3 pr-3 md:pr-5">
        <Sidebar active={active} collapsed={collapsed} onNavigate={navigate} onToggle={toggleSidebar} />

        <main className="min-w-0 flex-1 py-3 pl-2 lg:pl-0">
          {/* telefon: ixcham sarlavha */}
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <a href="/" aria-label="OQIM bosh sahifa">
              <img src="/brand/oqim-horizontal.svg" alt="OQIM" className="h-10 w-auto" />
            </a>
            <a href="/gps" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-krem">
              <Icon icon="tabler:device-mobile" className="size-4" /> GPS
            </a>
          </div>

          <Topbar mode={snap?.mode ?? 'ai'} source={source} intersections={snap?.intersections ?? []} onMode={setMode} onPick={focus} />

          {!snap ? (
            <div className="mt-6 grid h-[60svh] place-items-center rounded-[28px] bg-white text-[14px] text-ash ring-1 ring-inset ring-line">
              <span className="flex items-center gap-2">
                <span className="size-2 animate-pulse rounded-full bg-orik" /> Shahar yuklanmoqda…
              </span>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-w-0 space-y-4">
                <MapCard ref={map} snap={snap} city={city} selected={selected} onSelect={setSelected} onRoute={route} />
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                  <WaitChart series={series} />
                  <StatusCard snap={snap} />
                </div>
                <IntersectionTable snap={snap} onFocus={focus} />
              </div>
              <div className="space-y-4">
                <Kpis snap={snap} />
                <EmergencyCard snap={snap} onPick={() => map.current?.pick()} onCancel={cancelEmergency} />
                <EventsCard events={snap.events} onFocus={focus} />
              </div>
            </div>
          )}

          {source === 'mock' && (
            <p className="mt-6 text-center text-[12px] text-ash">
              Namunaviy rejim: haqiqiy Toshkent ko‘chalari (OSM), trafik esa brauzer ichidagi simulyatsiya.
            </p>
          )}
        </main>
      </div>
    </MotionConfig>
  )
}

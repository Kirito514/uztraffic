import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import maplibregl, { type GeoJSONSource, type Map as MLMap, type StyleSpecification } from 'maplibre-gl'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@iconify/react'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { CityData } from './mock'
import { ACTIONS, ORTACHA, TIRBAND, type Intersection, type LatLng, type Snapshot } from './types'

/* =========================================================
   Jonli xarita (outletbuddy / Dispatch referenslari):
   to‘q bazaviy xarita (OpenFreeMap, kalitsiz) brend ranglariga qayta bo‘yalgan;
   ustida mashinalar (1 s oralig‘ida silliq interpolyatsiya), zonalar, tez yordam marshruti,
   chorraha yorliqlari va tanlangan chorraha kartasi.
   ========================================================= */

const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'
const PAINT: Record<string, Record<string, unknown>> = {
  background: { 'background-color': '#141312' },
  water: { 'fill-color': '#1d3a57' },
  waterway: { 'line-color': '#1d3a57' },
  landcover_wood: { 'fill-color': '#1d3125' },
  landuse_park: { 'fill-color': '#1f3628' },
  landuse_residential: { 'fill-color': '#171615' },
  building: { 'fill-color': '#1d1b1a' },
  highway_minor: { 'line-color': '#24221f' },
  highway_path: { 'line-color': '#1e1c1a' },
  highway_major_casing: { 'line-color': '#34302b' },
  highway_major_inner: { 'line-color': '#2a2724' },
  highway_major_subtle: { 'line-color': '#2a2724' },
  highway_motorway_casing: { 'line-color': '#3a352f' },
  highway_motorway_subtle: { 'line-color': '#2a2724' },
}

async function loadStyle(): Promise<StyleSpecification> {
  const style = (await fetch(STYLE_URL).then((r) => r.json())) as StyleSpecification
  style.layers = style.layers
    .filter((l) => l.type !== 'symbol') // yozuvlar yo‘q — Dispatch’dagidek toza
    .map((l) => (PAINT[l.id] ? ({ ...l, paint: { ...(l as { paint?: object }).paint, ...PAINT[l.id] } } as typeof l) : l))
  return style
}

const level = (x: Intersection) => {
  if (x.preempted) return { label: 'Yashil to‘lqin', cls: 'bg-[#1f4d36] text-[#7fe0b0]' }
  const n = x.queue.ns + x.queue.ew
  if (n >= TIRBAND) return { label: 'Tirband', cls: 'bg-[#4a1f1c] text-[#ff9d95]' }
  if (n >= ORTACHA) return { label: 'O‘rtacha', cls: 'bg-[#4a3816] text-[#ffcf85]' }
  return { label: 'Erkin', cls: 'bg-[#1f3d2c] text-[#86dcab]' }
}

const circle = (lat: number, lng: number, r: number) => {
  const pts: [number, number][] = []
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2
    pts.push([lng + (r * Math.sin(a)) / (111320 * Math.cos((lat * Math.PI) / 180)), lat + (r * Math.cos(a)) / 110540])
  }
  return pts
}

export type MapHandle = { focus: (id: string) => void; pick: () => void }
type Props = {
  snap: Snapshot | null
  city: CityData | null
  selected: string | null
  onSelect: (id: string | null) => void
  onRoute: (from: LatLng, to: LatLng) => void
}

export const MapCard = forwardRef<MapHandle, Props>(function MapCard({ snap, city, selected, onSelect, onRoute }, ref) {
  const card = useRef<HTMLDivElement>(null)
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const [ready, setReady] = useState(false)
  const [, setTick] = useState(0) // marker joylashuvini xarita siljiganda qayta hisoblash
  const [pick, setPick] = useState<LatLng[] | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  /* ---------- xaritani yaratish ---------- */
  useEffect(() => {
    if (!el.current || !city) return
    let alive = true
    loadStyle()
      .catch(() => ({ version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#141312' } }] }) as StyleSpecification)
      .then((style) => {
        if (!alive || !el.current) return
        const m = new maplibregl.Map({
          container: el.current,
          style,
          center: [city.center[1] + 0.003, city.center[0] - 0.001],
          zoom: 14.1,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
        })
        m.touchZoomRotate.disableRotation()
        m.on('load', () => {
          m.addSource('roads', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: city.roads.map((r) => ({ type: 'Feature', properties: { major: r.major }, geometry: { type: 'LineString', coordinates: r.pts.map(([a, b]) => [b, a]) } })),
            },
          })
          m.addLayer({ id: 'roads', type: 'line', source: 'roads', paint: { 'line-color': '#f4efe9', 'line-opacity': ['case', ['get', 'major'], 0.14, 0.07], 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 16, 4] } })
          const empty = { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection
          m.addSource('zones', { type: 'geojson', data: empty })
          m.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones', paint: { 'fill-color': ['match', ['get', 'level'], 'heavy', '#e5534b', 'moderate', '#f0a43a', '#f2a07b'], 'fill-opacity': 0.16 } })
          m.addLayer({ id: 'zones-line', type: 'line', source: 'zones', paint: { 'line-color': ['match', ['get', 'level'], 'heavy', '#e5534b', 'moderate', '#f0a43a', '#f2a07b'], 'line-opacity': 0.55, 'line-dasharray': [2, 2], 'line-width': 1.2 } })
          m.addSource('route', { type: 'geojson', data: empty })
          m.addLayer({ id: 'route-glow', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#4cc38a', 'line-width': 12, 'line-opacity': 0.22, 'line-blur': 6 } })
          m.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#7fe0b0', 'line-width': 3.5 } })
          m.addSource('vehicles', { type: 'geojson', data: empty })
          m.addLayer({
            id: 'vehicles',
            type: 'circle',
            source: 'vehicles',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, ['match', ['get', 'type'], 'ambulance', 4, 1.6], 16, ['match', ['get', 'type'], 'ambulance', 9, 4.5]],
              'circle-color': ['match', ['get', 'type'], 'ambulance', '#e5534b', 'bus', '#f2a07b', 'truck', '#c9b9a8', '#f4efe9'],
              'circle-opacity': ['case', ['get', 'slow'], 0.55, 0.92],
              'circle-stroke-width': ['match', ['get', 'type'], 'ambulance', 3, 0],
              'circle-stroke-color': '#ffffff',
            },
          })
          setReady(true)
        })
        m.on('move', () => setTick((t) => t + 1))
        m.on('error', (e) => console.error('[xarita]', e.error?.message ?? e))
        if (import.meta.env.DEV) (window as unknown as { __oqimMap: MLMap }).__oqimMap = m // nosozlikni tekshirish uchun
        map.current = m
      })
    return () => {
      alive = false
      map.current?.remove()
      map.current = null
      setReady(false)
    }
  }, [city])

  /* ---------- zonalar va marshrut ---------- */
  useEffect(() => {
    const m = map.current
    if (!ready || !m || !snap) return
    ;(m.getSource('zones') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: snap.zones.map((z) => ({ type: 'Feature', properties: { level: z.level }, geometry: { type: 'Polygon', coordinates: [circle(z.lat, z.lng, z.radius)] } })),
    })
    ;(m.getSource('route') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: snap.emergency ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: snap.emergency.route.map(([a, b]) => [b, a]) } }] : [],
    })
  }, [snap, ready])

  /* ---------- mashinalar: oldingi va yangi holat orasida silliq interpolyatsiya ---------- */
  const frames = useRef<{ prev: Map<string, [number, number]>; next: Snapshot['vehicles']; t: number }>({ prev: new Map(), next: [], t: 0 })
  useEffect(() => {
    if (!snap) return
    const f = frames.current
    const k = Math.min(1, (performance.now() - f.t) / 1000)
    const cur = new Map<string, [number, number]>()
    for (const v of f.next) {
      const p = f.prev.get(v.id)
      cur.set(v.id, p && Math.abs(p[0] - v.lat) < 0.003 ? [p[0] + (v.lat - p[0]) * k, p[1] + (v.lng - p[1]) * k] : [v.lat, v.lng])
    }
    frames.current = { prev: cur, next: snap.vehicles, t: performance.now() }
  }, [snap])
  useEffect(() => {
    if (!ready) return
    let raf = 0
    let last = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - last < 33) return // ~30 kadr/s yetarli, protsessorni tejaymiz
      last = now
      const f = frames.current
      const k = Math.min(1, (now - f.t) / 1000)
      const features = f.next.map((v) => {
        const p = f.prev.get(v.id)
        // juda uzoq sakrash (yangi paydo bo‘lgan mashina) interpolyatsiya qilinmaydi
        const [lat, lng] = p && Math.abs(p[0] - v.lat) < 0.003 && Math.abs(p[1] - v.lng) < 0.003 ? [p[0] + (v.lat - p[0]) * k, p[1] + (v.lng - p[1]) * k] : [v.lat, v.lng]
        return { type: 'Feature' as const, properties: { type: v.type, slow: v.speed < 5 }, geometry: { type: 'Point' as const, coordinates: [lng, lat] } }
      })
      ;(map.current?.getSource('vehicles') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features })
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [ready])

  /* ---------- tez yordam: xaritadan A va B ni tanlash ---------- */
  useEffect(() => {
    const m = map.current
    if (!m || !pick) return
    m.getCanvas().style.cursor = 'crosshair'
    const onClick = (e: maplibregl.MapMouseEvent) => {
      const p: LatLng = [e.lngLat.lat, e.lngLat.lng]
      if (pick.length === 0) setPick([p])
      else {
        onRoute(pick[0], p)
        setPick(null)
      }
    }
    m.on('click', onClick)
    return () => {
      m.off('click', onClick)
      m.getCanvas().style.cursor = ''
    }
  }, [pick, onRoute])

  useImperativeHandle(ref, () => ({
    focus: (id) => {
      const x = snap?.intersections.find((i) => i.id === id)
      if (!x || !map.current) return
      map.current.flyTo({ center: [x.lng, x.lat], zoom: 15.2, speed: 1.2, essential: true })
      onSelect(id)
      card.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
    pick: () => {
      setPick([])
      onSelect(null)
      card.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
  }))

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) card.current?.requestFullscreen?.()
    else document.exitFullscreen?.()
  }
  useEffect(() => {
    const on = () => {
      setFullscreen(!!document.fullscreenElement)
      setTimeout(() => map.current?.resize(), 50)
    }
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  const m = map.current
  const sel = snap?.intersections.find((x) => x.id === selected) ?? null
  const proj = (lat: number, lng: number) => (m && ready ? m.project([lng, lat]) : null)

  return (
    <div ref={card} id="xarita" className={cn('relative isolate scroll-mt-4 overflow-hidden bg-[#141312]', fullscreen ? 'h-full w-full' : 'h-[min(620px,72svh)] min-h-[420px] rounded-[28px]')}>
      {/* inline joylashuv: maplibre-gl.css konteynerga `position: relative` beradi va klassni bosib ketadi */}
      <div ref={el} style={{ position: 'absolute', inset: 0 }} onClick={(e) => e.target === e.currentTarget && onSelect(null)} />

      {/* chorraha yorliqlari (Dispatch uslubi) */}
      {snap?.intersections.map((x) => {
        const p = proj(x.lat, x.lng)
        if (!p) return null
        const lv = level(x)
        const on = x.id === selected
        return (
          // nol o‘lchamli langar aynan chorraha nuqtasida; nuqta markazda, yorliq yuqori-o‘ngda
          <button
            key={x.id}
            onClick={() => onSelect(on ? null : x.id)}
            style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
            className={cn('group absolute left-0 top-0 z-10 size-0 will-change-transform', on && 'z-20')}
            aria-label={`${x.id} ${x.name}: ${lv.label}`}
          >
            <span className={cn('absolute size-2.5 -translate-1/2 rounded-full ring-2 ring-[#141312]', x.state === 'green' ? 'bg-signal-green' : x.state === 'yellow' ? 'bg-signal-amber' : 'bg-signal-red')} />
            <span
              className={cn(
                'absolute bottom-1.5 left-1.5 flex items-center gap-1 whitespace-nowrap rounded-[10px] bg-[#1d1b19]/90 p-1 pl-2 text-[11px] font-medium text-krem/90 ring-1 ring-white/10 backdrop-blur-sm transition-[translate] duration-200 group-hover:-translate-y-0.5',
                on && 'ring-orik',
              )}
            >
              <Icon icon="tabler:traffic-lights" className="size-3.5 text-krem/60" />
              {x.id}
              <span className={cn('rounded-[7px] px-1.5 py-0.5 text-[10.5px] font-semibold', lv.cls)}>{lv.label}</span>
            </span>
          </button>
        )
      })}

      {/* tanlangan chorraha kartasi (outletbuddy uslubi) */}
      <AnimatePresence>
        {sel && proj(sel.lat, sel.lng) && <IntersectionPopover key={sel.id} x={sel} at={proj(sel.lat, sel.lng)!} bounds={card.current} onClose={() => onSelect(null)} />}
      </AnimatePresence>

      {/* tez yordam A nuqtasi */}
      {pick?.[0] && proj(...pick[0]) && (
        <span className="pointer-events-none absolute left-0 top-0 z-10 grid size-7 place-items-center rounded-full bg-signal-red text-[12px] font-bold text-white ring-4 ring-signal-red/30" style={{ transform: `translate(${proj(...pick[0])!.x}px, ${proj(...pick[0])!.y}px) translate(-50%,-50%)` }}>
          A
        </span>
      )}
      <AnimatePresence>
        {pick && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={spring}
            className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white py-1.5 pl-4 pr-1.5 text-[13px] font-medium text-ink shadow-[0_16px_40px_-16px_rgb(0_0_0/0.6)]"
          >
            <Icon icon="tabler:ambulance" className="size-4 text-signal-red" />
            {pick.length === 0 ? 'Boshlanish nuqtasini bosing (A)' : 'Manzilni bosing (B)'}
            <button onClick={() => setPick(null)} className="h-8 rounded-full bg-mist px-3 text-[12px] hover:bg-line">
              Bekor qilish
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* pastki soya — raqamlar va mualliflik yozuvi o‘qilsin */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-40 bg-[linear-gradient(180deg,transparent,rgb(20_19_18/0.85))]" />
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-3 left-5 z-10 text-[10.5px] text-krem/40 transition-colors hover:text-krem/70"
      >
        © OpenStreetMap hissadorlari · OpenFreeMap
      </a>

      {/* chap pastda: tezkor raqamlar (Dispatch uslubi) */}
      {snap && (
        <dl className="pointer-events-none absolute bottom-9 left-5 z-10 space-y-1 font-mono text-[12px] text-krem/60">
          <div>
            Mashinalar: <b className="text-krem">{snap.stats.vehicles}</b>
          </div>
          <div>
            O‘rtacha tezlik: <b className="text-krem">{Math.round(snap.stats.avgSpeed)} km/soat</b>
          </div>
          <div>
            Tirbandlik: <b className="text-krem">{Math.round(snap.stats.congestion)}%</b>
          </div>
        </dl>
      )}

      {/* o‘ng tomon boshqaruvlari */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
        <MapBtn icon={fullscreen ? 'tabler:minimize' : 'tabler:maximize'} label={fullscreen ? 'Kichraytirish' : 'To‘liq ekran'} onClick={toggleFullscreen} />
      </div>
      <div className="absolute bottom-10 right-4 z-10 flex flex-col overflow-hidden rounded-[14px] bg-[#1d1b19]/90 ring-1 ring-white/10 backdrop-blur-sm">
        <MapBtn icon="tabler:plus" label="Yaqinlashtirish" onClick={() => map.current?.zoomIn()} bare />
        <span className="mx-2 h-px bg-white/10" />
        <MapBtn icon="tabler:minus" label="Uzoqlashtirish" onClick={() => map.current?.zoomOut()} bare />
      </div>

      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-[13px] text-krem/50">
          <span className="flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-orik" /> Xarita yuklanmoqda…
          </span>
        </div>
      )}
    </div>
  )
})

function MapBtn({ icon, label, onClick, bare }: { icon: string; label: string; onClick: () => void; bare?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn('grid size-10 place-items-center text-krem/80 transition-colors hover:text-krem', !bare && 'rounded-[14px] bg-[#1d1b19]/90 ring-1 ring-white/10 backdrop-blur-sm hover:bg-[#262321]')}
    >
      <Icon icon={icon} className="size-[18px]" />
    </button>
  )
}

/* Chorraha kartasi: faza, navbatlar, AI qarori va Q-qiymatlar */
function IntersectionPopover({ x, at, bounds, onClose }: { x: Intersection; at: { x: number; y: number }; bounds: HTMLDivElement | null; onClose: () => void }) {
  const W = 300
  const H = 330
  const bw = bounds?.clientWidth ?? 1000
  const bh = bounds?.clientHeight ?? 600
  const left = Math.min(bw - W - 16, Math.max(16, at.x + 18))
  const top = Math.min(bh - H - 16, Math.max(16, at.y - H / 2))
  const maxQ = Math.max(8, x.queue.ns, x.queue.ew)
  const lo = Math.min(...x.q)
  const hi = Math.max(...x.q)
  const best = x.q.indexOf(hi)
  const lv = level(x)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.96, x: -8 }}
      transition={spring}
      style={{ left, top, width: W, transformOrigin: 'left center' }}
      className="absolute z-30 rounded-[22px] bg-[#1b1a18]/95 p-4 text-krem shadow-[0_30px_60px_-24px_rgb(0_0_0/0.8)] ring-1 ring-white/10 backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] text-krem/50">{x.id}</p>
          <p className="mt-0.5 font-display text-[18px] font-bold leading-tight tracking-[-0.02em]">{x.name}</p>
        </div>
        <button onClick={onClose} aria-label="Yopish" className="grid size-8 shrink-0 place-items-center rounded-full bg-white/8 hover:bg-white/14">
          <Icon icon="tabler:x" className="size-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-[14px] bg-white/5 p-1.5 text-center text-[11px] ring-1 ring-white/8">
        <div className="rounded-[10px] py-1.5">
          <p className="text-krem/50">Faza</p>
          <p className="mt-0.5 font-semibold">
            {x.phase} · {x.state === 'green' ? 'yashil' : x.state === 'yellow' ? 'sariq' : 'qizil'}
          </p>
        </div>
        <div className="rounded-[10px] py-1.5">
          <p className="text-krem/50">Qoldi</p>
          <p className="mt-0.5 font-semibold tabular-nums">{x.remaining} s</p>
        </div>
        <div className="rounded-[10px] py-1.5">
          <p className="text-krem/50">Kutish</p>
          <p className="mt-0.5 font-semibold tabular-nums">{x.wait} s</p>
        </div>
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-krem/45">Navbat</p>
      {(['ns', 'ew'] as const).map((k) => (
        <div key={k} className="mt-2 grid grid-cols-[86px_1fr_22px] items-center gap-2 text-[12px]">
          <span className="text-krem/70">{k === 'ns' ? 'Shimol–Janub' : 'Sharq–G‘arb'}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.span animate={{ width: `${(x.queue[k] / maxQ) * 100}%` }} transition={spring} className={cn('block h-full rounded-full', x.queue[k] > 8 ? 'bg-signal-red' : x.queue[k] > 4 ? 'bg-signal-amber' : 'bg-signal-green')} />
          </span>
          <span className="text-right tabular-nums">{x.queue[k]}</span>
        </div>
      ))}

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-krem/45">AI qarori · Q-qiymatlar</p>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {x.q.map((v, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="flex h-12 w-full items-end overflow-hidden rounded-[8px] bg-white/6">
              <motion.span animate={{ height: `${18 + (82 * (v - lo)) / (hi - lo || 1)}%` }} transition={spring} className={cn('block w-full rounded-[8px]', i === best ? 'bg-orik' : 'bg-white/18')} />
            </span>
            <span className={cn('font-mono text-[9.5px]', i === best ? 'text-orik' : 'text-krem/45')}>{ACTIONS[i]}</span>
          </div>
        ))}
      </div>
      <span className={cn('mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold', lv.cls)}>{lv.label}</span>
    </motion.div>
  )
}

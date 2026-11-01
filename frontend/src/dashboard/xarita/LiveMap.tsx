import { useEffect, useRef } from 'react'
import maplibregl, { type GeoJSONSource, type Map as MLMap, type PaddingOptions, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { LEVEL, SPOTS } from './sample'
import { loadIndex, loadTile, metres, roadFeatures, tilesIn } from './roads'
import type { ResolvedStyle } from './mapSettings'
import { createCarLayer } from './sim/carLayer'
import { mercX, mercY, ORIGIN_X, ORIGIN_Y, type FromWorker, type ToWorker } from './sim/protocol'

/* Jonli xarita (MapLibre + OpenFreeMap, kalitsiz). Ustida o‘zimizning qatlamlar:
   yaqinlashtirganda ko‘chalar haqiqiy kenglikdagi asfalt va bo‘lak chiziqlari bilan chiziladi
   (OSM `lanes`), chorrahalar — GPU’dagi circle qatlami. Doimiy animatsiya sikli yo‘q. */

type Palette = { url: string; dark: boolean; paint: Record<string, Record<string, unknown>>; asphalt: string; mark: string; markOpacity: number }

const STYLES: Record<ResolvedStyle, Palette> = {
  oqim: {
    url: 'https://tiles.openfreemap.org/styles/positron',
    dark: false,
    asphalt: '#6f6a64',
    mark: '#fbf8f4',
    markOpacity: 0.9,
    paint: {
      background: { 'background-color': '#efe9e1' },
      park: { 'fill-color': '#dfe5d3' },
      landcover_wood: { 'fill-color': '#dce3d0' },
      water: { 'fill-color': '#c4d7df' },
      waterway: { 'line-color': '#c4d7df' },
      landuse_residential: { 'fill-color': '#ebe4db' },
      building: { 'fill-color': '#e4ddd3', 'fill-outline-color': '#d9d0c5' },
      highway_minor: { 'line-color': '#fbf8f4' },
      highway_path: { 'line-color': '#f6f1ea' },
      highway_major_casing: { 'line-color': '#dcd2c6' },
      highway_major_inner: { 'line-color': '#ffffff' },
      highway_major_subtle: { 'line-color': '#e3dacf' },
      highway_motorway_casing: { 'line-color': '#d6cabb' },
      highway_motorway_subtle: { 'line-color': '#e3dacf' },
      'highway-name-minor': { 'text-color': '#8f877e', 'text-halo-color': '#f4efe9' },
      'highway-name-major': { 'text-color': '#736d66', 'text-halo-color': '#f4efe9' },
    },
  },
  kunduzgi: { url: 'https://tiles.openfreemap.org/styles/positron', dark: false, asphalt: '#7d7d7b', mark: '#ffffff', markOpacity: 0.9, paint: {} },
  tungi: {
    url: 'https://tiles.openfreemap.org/styles/dark',
    dark: true,
    asphalt: '#3d3935', // binolardan (#1c1a19) aniq ajralib tursin
    mark: '#e6dfd6',
    markOpacity: 0.7,
    paint: {
      background: { 'background-color': '#141312' },
      water: { 'fill-color': '#1b2f40' },
      waterway: { 'line-color': '#1b2f40' },
      landcover_wood: { 'fill-color': '#18241b' },
      landuse_park: { 'fill-color': '#1a271d' },
      landuse_residential: { 'fill-color': '#171615' },
      building: { 'fill-color': '#1c1a19' },
      highway_minor: { 'line-color': '#262320' },
      highway_path: { 'line-color': '#1f1d1b' },
      highway_major_casing: { 'line-color': '#3a352f' },
      highway_major_inner: { 'line-color': '#2e2a26' },
      highway_major_subtle: { 'line-color': '#2e2a26' },
      highway_motorway_casing: { 'line-color': '#433d36' },
      highway_motorway_subtle: { 'line-color': '#2e2a26' },
    },
  },
}

async function loadStyle(p: Palette): Promise<StyleSpecification> {
  const style = (await fetch(p.url).then((r) => r.json())) as StyleSpecification
  style.layers = style.layers
    // ko‘cha nomlari qoladi, qolgan yozuvlar (davlat, shahar, belgilar) — shovqin
    .filter((l) => l.type !== 'symbol' || l.id.startsWith('highway-name'))
    .map((l) => (p.paint[l.id] ? ({ ...l, paint: { ...(l as { paint?: object }).paint, ...p.paint[l.id] } } as typeof l) : l))
  return style
}

const LABEL_LAYERS = ['highway-name-path', 'highway-name-minor', 'highway-name-major']
const ROAD_LAYERS = ['city-surface', 'city-center', 'city-lane']
const ROADS_FROM = 14.5 // bundan uzoqda o‘zimizning ko‘chalar yuklanmaydi — asosiy xarita yetarli
const CARS_FROM = 15 // mashinalar shu zoomdan yaqinda yuradi (uzoqda — keyinchalik oqim ranglari)

const spots = (): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: SPOTS.map((s) => ({
    type: 'Feature',
    properties: { id: s.id, color: LEVEL[s.level].color, heavy: s.level === 'tirband' },
    geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
  })),
})

/* boshlang‘ich ko‘rinish: barcha chorrahalar sig‘adi (suzuvchi panellar hisobga olinadi) */
const BOUNDS: [[number, number], [number, number]] = [
  [Math.min(...SPOTS.map((s) => s.lng)), Math.min(...SPOTS.map((s) => s.lat))],
  [Math.max(...SPOTS.map((s) => s.lng)), Math.max(...SPOTS.map((s) => s.lat))],
]
const homePad = (p: PaddingOptions) => ({ top: p.top + 48, right: p.right + 64, bottom: p.bottom + 48, left: p.left + 48 })
const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

type Props = {
  mapStyle: ResolvedStyle
  labels: boolean
  lanes: boolean
  selected: string | null
  onSelect: (id: string | null) => void
  padding?: Partial<PaddingOptions> // suzuvchi panellar ostida qolmasin: tanlangan chorraha shu bo‘shliqdan tashqarida markazlanadi
  className?: string
}

export function LiveMap({ mapStyle, labels, lanes, selected, onSelect, padding, className }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const pad = useRef<PaddingOptions>({ top: 0, right: 0, bottom: 0, left: 0 })
  pad.current = { top: 0, right: 0, bottom: 0, left: 0, ...padding }
  const pick = useRef(onSelect)
  pick.current = onSelect
  const ready = useRef(false)
  const syncing = useRef(0)
  const sim = useRef<{ worker: Worker; cars: ReturnType<typeof createCarLayer> } | null>(null)
  const pending = useRef({ selected, labels, lanes })
  pending.current = { selected, labels, lanes }
  const palette = STYLES[mapStyle]

  useEffect(() => {
    let alive = true
    let m: MLMap | null = null
    loadStyle(palette)
      .catch(() => ({ version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': palette.dark ? '#141312' : '#efe9e1' } }] }) as StyleSpecification)
      .then((style) => {
        if (!alive || !el.current) return
        m = new maplibregl.Map({
          container: el.current,
          style,
          bounds: BOUNDS,
          fitBoundsOptions: { padding: homePad(pad.current) },
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          fadeDuration: 0,
          maxZoom: 20,
          hash: 'map', // joylashuv manzil satrida (#map=zoom/lat/lng) — havola bilan aynan shu joyni ulashish mumkin
        })
        map.current = m
        m.touchZoomRotate.disableRotation()
        m.on('load', () => {
          const mm = m!
          addRoads(mm, palette)
          addCars(mm)
          addSpots(mm, palette.dark)
          ready.current = true
          applyVisibility(mm, pending.current.labels, pending.current.lanes)
          if (pending.current.selected) focus(mm, pending.current.selected, false)
          else if (!location.hash.includes('map=')) mm.fitBounds(BOUNDS, { padding: homePad(pad.current), duration: 0 })
          syncRoads(mm)
        })
        m.on('moveend', () => syncRoads(m!))
        m.on('zoomend', () => runCars(m!))
      })
    const onVisibility = () => map.current && runCars(map.current)
    document.addEventListener('visibilitychange', onVisibility)
    // sidebar yig‘ilganda yoki oyna o‘lchami o‘zgarganda xarita cho‘zilib qolmasin
    const ro = new ResizeObserver(() => m?.resize())
    if (el.current) ro.observe(el.current)
    return () => {
      alive = false
      ready.current = false
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      sim.current?.worker.terminate()
      sim.current = null
      m?.remove()
      map.current = null
    }
    // xarita faqat uslub o‘zgarganda qayta yaratiladi; ichki yordamchilar ref’lar orqali eng so‘nggi holatni o‘qiydi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette])

  useEffect(() => {
    if (map.current && ready.current) applyVisibility(map.current, labels, lanes)
  }, [labels, lanes])

  useEffect(() => {
    if (map.current && ready.current) focus(map.current, selected, true)
  }, [selected])

  /* ---------- qatlamlar ---------- */
  function addRoads(m: MLMap, p: Palette) {
    // asfalt va chiziqlar ko‘cha nomlari ostida qolsin
    const beforeId = m.getStyle().layers.find((l) => l.type === 'symbol')?.id
    m.addSource('city-surface', { type: 'geojson', data: EMPTY })
    m.addSource('city-marks', { type: 'geojson', data: EMPTY })
    // zoom ifodasi faqat yuqori darajada bo‘la oladi — shuning uchun shaffoflik shu interpolatsiya ichida
    const fadeIn = (from: number, to = 1) => ['interpolate', ['linear'], ['zoom'], from, 0, from + 1, to] as unknown as number
    m.addLayer(
      {
        id: 'city-surface',
        type: 'line',
        source: 'city-surface',
        minzoom: 15,
        layout: { 'line-join': 'round', 'line-cap': 'butt' },
        paint: { 'line-color': p.asphalt, 'line-width': metres('w'), 'line-offset': metres('o'), 'line-opacity': fadeIn(15) },
      },
      beforeId,
    )
    m.addLayer(
      {
        id: 'city-center',
        type: 'line',
        source: 'city-marks',
        minzoom: 16,
        filter: ['==', ['get', 'kind'], 'center'],
        paint: { 'line-color': p.mark, 'line-width': markWidth(1.25), 'line-offset': metres('o'), 'line-opacity': fadeIn(16, p.markOpacity) },
      },
      beforeId,
    )
    m.addLayer(
      {
        id: 'city-lane',
        type: 'line',
        source: 'city-marks',
        minzoom: 16.5,
        filter: ['==', ['get', 'kind'], 'lane'],
        // uzuq chiziq (chiziq kengligi birligida): ~3 m bo‘yoq, ~6 m oraliq
        paint: { 'line-color': p.mark, 'line-width': markWidth(1), 'line-offset': metres('o'), 'line-dasharray': [6, 10], 'line-opacity': fadeIn(16.5, p.markOpacity) },
      },
      beforeId,
    )
  }

  /* mashinalar: hisob — alohida oqimda, chizish — GPU qatlamida */
  function addCars(m: MLMap) {
    const worker = new Worker(new URL('./sim/worker.ts', import.meta.url), { type: 'module' })
    // dev’da simulyatsiya statistikasi konsoldan ko‘rinadi: window.__sim
    const cars = createCarLayer(import.meta.env.DEV ? (st) => ((window as unknown as { __sim: unknown }).__sim = st) : undefined)
    worker.onmessage = (e: MessageEvent<FromWorker>) => cars.push(e.data)
    sim.current = { worker, cars }
    const beforeId = m.getStyle().layers.find((l) => l.type === 'symbol')?.id
    m.addLayer(cars.layer, beforeId)
    runCars(m)
  }

  const send = (msg: ToWorker) => sim.current?.worker.postMessage(msg)

  /* yaqinda va tab ko‘rinib turganda yuradi; aks holda oqim to‘xtaydi (CPU sarflanmaydi) */
  function runCars(m: MLMap) {
    const on = m.getZoom() >= CARS_FROM && document.visibilityState === 'visible'
    send({ type: 'run', running: on })
    sim.current?.cars.setVisible(m.getZoom() >= CARS_FROM)
  }

  function addSpots(m: MLMap, dark: boolean) {
    m.addSource('spots', { type: 'geojson', data: spots() })
    m.addLayer({
      id: 'spots-halo',
      type: 'circle',
      source: 'spots',
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, ['case', ['get', 'heavy'], 14, 8], 16, ['case', ['get', 'heavy'], 34, 20]],
        'circle-opacity': dark ? 0.22 : 0.16,
        'circle-blur': dark ? 0.7 : 0.35,
      },
    })
    m.addLayer({
      id: 'spots-sel',
      type: 'circle',
      source: 'spots',
      filter: ['==', ['get', 'id'], ''],
      paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 9, 16, 15], 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#f2a07b', 'circle-stroke-width': 3 },
    })
    m.addLayer({
      id: 'spots',
      type: 'circle',
      source: 'spots',
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 16, 7.5],
        'circle-stroke-color': dark ? '#0c0b0a' : '#ffffff',
        'circle-stroke-width': 2,
      },
    })
    m.on('click', 'spots', (e) => pick.current((e.features?.[0]?.properties?.id as string) ?? null))
    m.on('mouseenter', 'spots', () => (m.getCanvas().style.cursor = 'pointer'))
    m.on('mouseleave', 'spots', () => (m.getCanvas().style.cursor = ''))
  }

  /* ekranga kirgan kataklarni yuklab, asfalt va chiziqlarni yangilaydi */
  async function syncRoads(m: MLMap) {
    if (!ready.current || m.getZoom() < ROADS_FROM) return
    const run = ++syncing.current
    const idx = await loadIndex()
    const b = m.getBounds()
    const keys = tilesIn(idx, b.getWest(), b.getSouth(), b.getEast(), b.getNorth())
    const list = await Promise.all(keys.map(loadTile))
    if (run !== syncing.current || map.current !== m) return // orada yangi siljish boshlangan
    send({ type: 'tiles', tiles: Object.fromEntries(keys.map((k, i) => [k, list[i]])) })
    // mashinalar ekran va uning atrofida (har tomonga yarim ekran zaxira) — ko‘rinmaydigan joyda hisob yo‘q
    const x0 = mercX(b.getWest()) - ORIGIN_X, x1 = mercX(b.getEast()) - ORIGIN_X
    const y0 = mercY(b.getNorth()) - ORIGIN_Y, y1 = mercY(b.getSouth()) - ORIGIN_Y
    const mx = (x1 - x0) * 0.5, my = (y1 - y0) * 0.5
    send({ type: 'view', box: [x0 - mx, y0 - my, x1 + mx, y1 + my], screen: [x0, y0, x1, y1] })
    const { surface, marks } = roadFeatures(list)
    ;(m.getSource('city-surface') as GeoJSONSource | undefined)?.setData(surface)
    ;(m.getSource('city-marks') as GeoJSONSource | undefined)?.setData(marks)
  }

  function applyVisibility(m: MLMap, showLabels: boolean, showLanes: boolean) {
    for (const id of LABEL_LAYERS) if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', showLabels ? 'visible' : 'none')
    for (const id of ROAD_LAYERS) if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', showLanes ? 'visible' : 'none')
  }

  function focus(m: MLMap, id: string | null, animate: boolean) {
    m.setFilter('spots-sel', ['==', ['get', 'id'], id ?? ''])
    const s = SPOTS.find((x) => x.id === id)
    if (!s) return
    const opts = { center: [s.lng, s.lat] as [number, number], zoom: Math.max(m.getZoom(), 17), padding: pad.current }
    if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) m.flyTo({ ...opts, duration: 900, curve: 1.3 })
    else m.jumpTo(opts)
  }

  const btn = cn(
    'grid size-9 place-items-center transition-colors',
    palette.dark ? 'text-krem/80 hover:bg-white/8 hover:text-krem' : 'text-ink/70 hover:bg-ink/5 hover:text-ink',
  )

  return (
    <div className={cn('absolute inset-0', className)}>
      {/* maplibre CSS konteynerga position: relative beradi — shuning uchun inset emas, h-full */}
      <div ref={el} className="h-full w-full" />
      <div
        className={cn(
          'absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-2xl shadow-[0_8px_24px_-12px_rgb(12_11_10/0.4)] ring-1',
          palette.dark ? 'bg-ink/85 ring-white/10' : 'bg-white/90 ring-black/5',
        )}
      >
        <button aria-label="Yaqinlashtirish" onClick={() => map.current?.zoomIn()} className={btn}>
          <Icon icon="tabler:plus" className="size-4" />
        </button>
        <button aria-label="Uzoqlashtirish" onClick={() => map.current?.zoomOut()} className={btn}>
          <Icon icon="tabler:minus" className="size-4" />
        </button>
        <button
          aria-label="Markazga qaytish"
          onClick={() => {
            onSelect(null)
            map.current?.fitBounds(BOUNDS, { padding: homePad(pad.current), duration: 800 })
          }}
          className={btn}
        >
          <Icon icon="tabler:focus-centered" className="size-4" />
        </button>
      </div>
      <span className={cn('pointer-events-none absolute bottom-1.5 left-3 text-[10px]', palette.dark ? 'text-krem/35' : 'text-ink/40')}>© OpenStreetMap · OpenFreeMap</span>
    </div>
  )
}

/* Yo‘l chizig‘i kengligi pikselda. Haqiqiy 0.15 m 17-zoomda piksel ham bo‘lmaydi — shuning uchun
   o‘rtacha zoomda ko‘rinadigan minimal qalinlik, yaqinda esa metrga yaqin o‘sish. */
function markWidth(k: number) {
  return ['interpolate', ['exponential', 1.6], ['zoom'], 16, 0.5 * k, 18, 1 * k, 20, 2.4 * k, 22, 8 * k] as unknown as number
}

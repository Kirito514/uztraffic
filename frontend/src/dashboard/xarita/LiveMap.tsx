import { useEffect, useRef, useState } from 'react'
import maplibregl, { type GeoJSONSource, type Map as MLMap, type PaddingOptions, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { motion } from 'motion/react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { LEVEL, SPOTS } from './sample'
import { loadIndex, loadTile, metres, roadFeatures, tilesIn } from './roads'
import type { ResolvedStyle } from './mapSettings'
import { createCarLayer } from './sim/carLayer'
import { mercX, mercY, ORIGIN_X, ORIGIN_Y, unmercLat, unmercLng, type CarInfo, type FromWorker, type ToWorker } from './sim/protocol'
import { CarCard, CarPeek } from './CarCard'

/* Jonli xarita (MapLibre + OpenFreeMap, kalitsiz). Ustida o‘zimizning qatlamlar:
   yaqinlashtirganda ko‘chalar haqiqiy kenglikdagi asfalt va bo‘lak chiziqlari bilan chiziladi
   (OSM `lanes`), chorrahalar — GPU’dagi circle qatlami. Doimiy animatsiya sikli yo‘q. */

// building3d — 3D rejimda ko‘tarilgan binolar rangi
type Palette = { url: string; dark: boolean; paint: Record<string, Record<string, unknown>>; asphalt: string; mark: string; markOpacity: number; building3d: string }

const STYLES: Record<ResolvedStyle, Palette> = {
  oqim: {
    url: 'https://tiles.openfreemap.org/styles/positron',
    dark: false,
    asphalt: '#6f6a64',
    building3d: '#ebe5dc',
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
  kunduzgi: { url: 'https://tiles.openfreemap.org/styles/positron', dark: false, asphalt: '#7d7d7b', mark: '#ffffff', markOpacity: 0.9, building3d: '#e9e8e5', paint: {} },
  tungi: {
    url: 'https://tiles.openfreemap.org/styles/dark',
    dark: true,
    asphalt: '#3d3935', // binolardan (#1c1a19) aniq ajralib tursin
    building3d: '#2b2826',
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
const SIDE_W = 296 // kuzatish paneli kengligi, px
const TILT = 60 // 3D rejimdagi qiyalik, gradus
const TILT_ZOOM = 17 // 3D yoqilganda kamida shu zoomgacha yaqinlashadi (mashinalar hajmli ko‘rinsin)
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
  cars: boolean
  traffic: boolean // yo‘llarni tirbandlik bo‘yicha bo‘yash
  density: number // bir bo‘lak-km’dagi mashinalar
  selected: string | null
  onSelect: (id: string | null) => void
  padding?: Partial<PaddingOptions> // suzuvchi panellar ostida qolmasin: tanlangan chorraha shu bo‘shliqdan tashqarida markazlanadi
  className?: string
}

export function LiveMap({ mapStyle, labels, lanes, cars, traffic, density, selected, onSelect, padding, className }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const pad = useRef<PaddingOptions>({ top: 0, right: 0, bottom: 0, left: 0 })
  pad.current = { top: 0, right: 0, bottom: 0, left: 0, ...padding }
  const pick = useRef(onSelect)
  pick.current = onSelect
  const ready = useRef(false)
  const syncing = useRef(0)
  const sim = useRef<{ worker: Worker; cars: ReturnType<typeof createCarLayer> } | null>(null)
  const lastKeys = useRef('')
  // tanlangan mashina: tafsilot simulyatsiyadan har kadrda keladi, kartochka mashina bilan birga suriladi
  const [carSlot, setCarSlot] = useState(-1)
  const [carInfo, setCarInfo] = useState<CarInfo | null>(null)
  const [following, setFollowing] = useState(false)
  const [tilted, setTilted] = useState(false) // xarita qiyshaygan (3D)
  const slotRef = useRef(-1)
  const infoAt = useRef(0)
  const card = useRef<HTMLDivElement>(null)
  const pending = useRef({ selected, labels, lanes, cars, traffic, density })
  pending.current = { selected, labels, lanes, cars, traffic, density }
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
          // o‘ng tugma (yoki Ctrl + sudrash) bilan burish va qiyshaytirish — 3D ko‘rinish uchun
          maxPitch: 70,
          fadeDuration: 0,
          maxZoom: 20,
          hash: 'map', // joylashuv manzil satrida (#map=zoom/lat/lng) — havola bilan aynan shu joyni ulashish mumkin
        })
        map.current = m
        m.on('load', () => {
          const mm = m!
          addRoads(mm, palette)
          addTrafficFar(mm)
          addSignalOverview(mm)
          addCars(mm)
          addBuildings(mm, palette) // mashinalar qatlamidan oldin qo‘yiladi
          addSpots(mm, palette.dark)
          ready.current = true
          applyVisibility(mm, pending.current.labels, pending.current.lanes)
          if (pending.current.selected) focus(mm, pending.current.selected, false)
          else if (!location.hash.includes('map=')) mm.fitBounds(BOUNDS, { padding: homePad(pad.current), duration: 0 })
          syncTilt(mm)
          syncRoads(mm)
        })
        m.on('moveend', () => syncRoads(m!))
        m.on('zoomend', () => runCars(m!))
        // 3D: qiyalik o‘zgarganda binolar ko‘tariladi yoki yotadi, tugma holati yangilanadi
        m.on('pitch', () => syncTilt(m!))
        m.on('pitchend', () => syncRoads(m!))
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

  // mashinalar sozlamasi (Sozlamalar sahifasi yoki xarita menyusi) — xarita qayta yaratilmaydi
  useEffect(() => {
    send({ type: 'density', perLaneKm: density })
  }, [density])
  useEffect(() => {
    if (map.current && ready.current) runCars(map.current)
    if (!cars) selectCar(-1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cars, traffic])

  /* kartochkani mashina ustida ushlab turish (va kuzatishda kamerani surish) — faqat mashina tanlanganda */
  useEffect(() => {
    if (carSlot < 0) return
    let raf = 0
    const tick = () => {
      const m = map.current
      const p = sim.current?.cars.posOf(carSlot)
      if (m && p && (card.current || following)) {
        const ll: [number, number] = [unmercLng(p[0] + ORIGIN_X), unmercLat(p[1] + ORIGIN_Y)]
        const P = pad.current
        // kuzatishda o‘ng tomonda panel — mashina qolgan bo‘shliq o‘rtasida turadi
        if (following) m.jumpTo({ center: ll, padding: { ...P, right: P.right + SIDE_W + 24 } })
        else if (card.current) placePeek(m, ll, card.current, P)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [carSlot, following])

  // kuzatish to‘xtaganda xaritaning odatiy chekkalari qaytadi
  useEffect(() => {
    if (!following) map.current?.setPadding(pad.current)
  }, [following])

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
    // tirbandlik: asfalt ustida, chiziqlar ostida. Uzoqroqda (15–16) Yandex kabi aniq rangli yo‘l, yaqinda —
    // mashinalar va chiziqlar ko‘rinib tursin deb asfaltga yengil tus
    m.addSource('traffic', { type: 'geojson', data: EMPTY })
    m.addLayer(
      {
        id: 'traffic',
        type: 'line',
        source: 'traffic',
        minzoom: 15,
        layout: { 'line-join': 'round', 'line-cap': 'butt' },
        paint: {
          'line-color': ['match', ['get', 'lv'], 0, TRAFFIC[0], 1, TRAFFIC[1], 2, TRAFFIC[2], TRAFFIC[3]],
          'line-width': metres('w'),
          'line-offset': metres('o'),
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.4, 0.9, 16.2, 0.9, 17.2, p.dark ? 0.24 : 0.18],
        },
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
    worker.onmessage = (e: MessageEvent<FromWorker>) => {
      if (e.data.type === 'marks') return cars.setMarks(e.data.marks)
      if (e.data.type === 'traffic') return (m.getSource('traffic') as GeoJSONSource | undefined)?.setData(e.data.roads)
      cars.push(e.data)
      if (slotRef.current < 0) return
      // mashina hududdan chiqib ketdi — kartochka yopiladi
      if (!e.data.inspect) return selectCar(-1)
      const now = performance.now()
      if (now - infoAt.current > 200) {
        infoAt.current = now
        setCarInfo(e.data.inspect)
      }
    }
    sim.current = { worker, cars }
    if (import.meta.env.DEV) Object.assign(window, { __oqimMap: m, __oqimCars: cars }) // dev: konsoldan tekshirish uchun
    send({ type: 'density', perLaneKm: pending.current.density })
    const beforeId = m.getStyle().layers.find((l) => l.type === 'symbol')?.id
    m.addLayer(cars.layer, beforeId)
    runCars(m)
    // mashinani bosish: chorraha bosilgan bo‘lsa — u ustun; bo‘sh joy — tanlov bekor
    m.on('click', (e) => {
      if (m.getZoom() < CARS_FROM || !pending.current.cars) return
      if (m.queryRenderedFeatures(e.point, { layers: ['spots'] }).length) return
      selectCar(cars.pick(e.point))
    })
    let hoverQueued = false
    m.on('mousemove', (e) => {
      if (hoverQueued || m.getZoom() < CARS_FROM) return
      hoverQueued = true
      requestAnimationFrame(() => {
        hoverQueued = false
        if (!m.queryRenderedFeatures(e.point, { layers: ['spots'] }).length) m.getCanvas().style.cursor = cars.pick(e.point) >= 0 ? 'pointer' : ''
      })
    })
    m.on('dragstart', () => setFollowing(false)) // foydalanuvchi o‘zi sursa — kuzatish to‘xtaydi
  }

  function selectCar(slot: number) {
    slotRef.current = slot
    sim.current?.cars.select(slot)
    send({ type: 'inspect', slot })
    setCarSlot(slot)
    if (slot < 0) {
      setCarInfo(null)
      setFollowing(false)
    }
  }

  const send = (msg: ToWorker) => sim.current?.worker.postMessage(msg)

  /* yaqinda va tab ko‘rinib turganda yuradi; aks holda oqim to‘xtaydi (CPU sarflanmaydi) */
  function runCars(m: MLMap) {
    const near = m.getZoom() >= CARS_FROM && pending.current.cars
    send({ type: 'run', running: near && document.visibilityState === 'visible' })
    sim.current?.cars.setVisible(near)
    // tirbandlik simulyatsiyadan hisoblanadi — mashinalar o‘chiq bo‘lsa, ko‘rsatadigan narsa yo‘q
    if (m.getLayer('traffic')) m.setLayoutProperty('traffic', 'visibility', pending.current.traffic && pending.current.cars ? 'visible' : 'none')
    if (m.getLayer('traffic-far')) m.setLayoutProperty('traffic-far', 'visibility', pending.current.traffic ? 'visible' : 'none')
  }

  /* 3D binolar — asosiy xaritaning bino ma’lumotidan (OSM balandligi yoki qavatlar soni), faqat qiyshaytirilganda.
     Mashinalar qatlami bilan umumiy chuqurlik: bino ortidagi mashina va svetofor ko‘rinmaydi. */
  function addBuildings(m: MLMap, p: Palette) {
    m.addLayer(
      {
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 14,
        layout: { visibility: 'none' },
        paint: {
          'fill-extrusion-color': p.building3d,
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, ['coalesce', ['get', 'render_height'], 9]],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.92,
          'fill-extrusion-vertical-gradient': true,
        },
      },
      'cars',
    )
  }

  function syncTilt(m: MLMap) {
    const on = m.getPitch() > 8
    if (m.getLayer('buildings-3d') && (m.getLayoutProperty('buildings-3d', 'visibility') === 'visible') !== on)
      m.setLayoutProperty('buildings-3d', 'visibility', on ? 'visible' : 'none')
    setTilted(on)
  }

  /* 3D tugmasi: qiyshaytirib biroz buradi va mashinalar hajmli ko‘rinadigan darajagacha yaqinlashadi; qayta bosilsa — tepadan */
  function toggleTilt() {
    const m = map.current
    if (!m) return
    if (m.getPitch() > 8) m.easeTo({ pitch: 0, bearing: 0, duration: 700 })
    else m.easeTo({ pitch: TILT, bearing: m.getBearing() || -25, zoom: Math.max(m.getZoom(), TILT_ZOOM), duration: 900 })
  }

  /* Uzoqdan tirbandlik (15-zoomgacha) — asosiy xaritaning o‘z ko‘chalari ustida. Bu masofada mashinalar
     hisoblanmaydi (butun shahar uchun juda ko‘p), shuning uchun daraja NAMUNAVIY: ko‘cha turi (katta ko‘chalar
     ko‘proq band) + har ko‘cha bo‘lagi uchun o‘z “to‘lqini”, sekin o‘zgaradi. 15-zoomdan yaqinda o‘rnini
     simulyatsiyadagi mashinalardan hisoblangan haqiqiy (simulyatsiya) tirbandlik egallaydi. */
  function addTrafficFar(m: MLMap) {
    const beforeId = m.getStyle().layers.find((l) => l.type === 'symbol')?.id
    m.addLayer(
      {
        id: 'traffic-far',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 10,
        maxzoom: 15.5,
        filter: ['all', ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]], ['!=', ['get', 'brunnel'], 'tunnel']],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': farColor(0),
          'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 10, ['match', ['get', 'class'], 'tertiary', 0.8, 1.4], 13, ['match', ['get', 'class'], 'tertiary', 2, 3], 15.5, ['match', ['get', 'class'], 'tertiary', 4, 6]],
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.75, 14.8, 0.85, 15.4, 0],
        },
      },
      beforeId,
    )
    // har 20 soniyada “vaqt” suriladi — ranglar asta-sekin o‘zgaradi
    const t0 = performance.now()
    const timer = setInterval(() => {
      if (map.current !== m || !m.getLayer('traffic-far')) return clearInterval(timer)
      m.setPaintProperty('traffic-far', 'line-color', farColor((performance.now() - t0) / 1000))
    }, 20000)
  }

  /* shahardagi barcha svetoforli chorrahalar (scripts → city/signals.json) — kichik svetofor belgisi, faqat
     14.5–16 zoomda (uzoqda xaritani to‘ldirib yubormasin). 15.5 dan yaqinda o‘rnini har kirishdagi jonli svetoforlar egallaydi. */
  function addSignalOverview(m: MLMap) {
    m.addImage('signal-icon', signalIcon(), { pixelRatio: 2 })
    m.addSource('signals', { type: 'geojson', data: EMPTY })
    fetch('/city/signals.json')
      .then((r) => r.json())
      .then((pts: [number, number, number][]) =>
        (m.getSource('signals') as GeoJSONSource | undefined)?.setData({
          type: 'FeatureCollection',
          features: pts.map(([lng, lat, n]) => ({ type: 'Feature', properties: { n }, geometry: { type: 'Point', coordinates: [lng, lat] } })),
        }),
      )
      .catch(() => {})
    m.addLayer({
      id: 'signals',
      type: 'symbol',
      source: 'signals',
      minzoom: 14.5,
      maxzoom: 16,
      layout: {
        'icon-image': 'signal-icon',
        // ko‘p kirishli (katta) chorrahalar biroz kattaroq
        'icon-size': ['interpolate', ['linear'], ['zoom'], 14.5, ['case', ['>', ['get', 'n'], 2], 0.8, 0.68], 15.5, ['case', ['>', ['get', 'n'], 2], 1, 0.85]],
        'icon-allow-overlap': true,
        'symbol-sort-key': ['-', ['get', 'n']],
      },
      paint: { 'icon-opacity': ['interpolate', ['linear'], ['zoom'], 14.5, 0, 14.9, 1, 15.5, 1, 15.9, 0] },
    })
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
    const b = viewBounds(m)
    const keys = tilesIn(idx, b.getWest(), b.getSouth(), b.getEast(), b.getNorth())
    const list = await Promise.all(keys.map(loadTile))
    if (run !== syncing.current || map.current !== m) return // orada yangi siljish boshlangan
    const keySig = keys.join(',')
    const changed = keySig !== lastKeys.current
    lastKeys.current = keySig
    if (changed) send({ type: 'tiles', tiles: Object.fromEntries(keys.map((k, i) => [k, list[i]])) })
    // mashinalar ekran va uning atrofida (har tomonga yarim ekran zaxira) — ko‘rinmaydigan joyda hisob yo‘q
    const x0 = mercX(b.getWest()) - ORIGIN_X, x1 = mercX(b.getEast()) - ORIGIN_X
    const y0 = mercY(b.getNorth()) - ORIGIN_Y, y1 = mercY(b.getSouth()) - ORIGIN_Y
    const mx = (x1 - x0) * 0.5, my = (y1 - y0) * 0.5
    send({ type: 'view', box: [x0 - mx, y0 - my, x1 + mx, y1 + my], screen: [x0, y0, x1, y1] })
    if (!changed) return // ko‘rinadigan kataklar o‘sha — asfalt va chiziqlarni qayta qurish shart emas
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
      {carSlot >= 0 && carInfo && !following && (
        // kichik kartochka: har kadrda mashina yoniga qo‘yiladi, lekin ekran (va panellar) chegarasidan chiqmaydi
        <div ref={card} className="absolute left-0 top-0 z-10 will-change-transform" style={{ opacity: 0 }}>
          <CarPeek info={carInfo} dark={palette.dark} onFollow={() => setFollowing(true)} onClose={() => selectCar(-1)} />
        </div>
      )}
      {carSlot >= 0 && carInfo && following && (
        <motion.aside
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
          // sarlavha qatoridan pastgacha — to‘liq balandlik; sig‘masa (juda past ekran) ichida aylanadi
          className="absolute z-10 flex flex-col overflow-y-auto [scrollbar-width:none]"
          style={{ top: pad.current.top + 8, right: pad.current.right + 12, bottom: pad.current.bottom + 12, width: SIDE_W }}
        >
          <CarCard info={carInfo} dark={palette.dark} following onFollow={() => setFollowing(false)} onClose={() => selectCar(-1)} className="min-h-full w-full" />
        </motion.aside>
      )}
      <div
        className={cn(
          'absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-2xl shadow-[0_8px_24px_-12px_rgb(12_11_10/0.4)] ring-1',
          following && 'hidden', // kuzatishda o‘ng tomonda panel turadi; kamera baribir mashinaga bog‘langan
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
          aria-label={tilted ? 'Tepadan ko‘rinish' : '3D ko‘rinish'}
          aria-pressed={tilted}
          onClick={toggleTilt}
          className={cn(btn, 'text-[11.5px] font-semibold', tilted && 'text-orik')}
        >
          3D
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
// tirbandlik ranglari (Yandex/Google’dagi kabi tanish): erkin, sekin, tirband, tiqilin
const TRAFFIC = ['#2fb36b', '#f2b51d', '#e5483d', '#9e2a22']

/* Simulyatsiya va kataklar hududi. Qiyshaytirilganda ekran ufqgacha kilometrlab yerni qamraydi —
   uzoqdagi mashinalar baribir nuqtacha, shuning uchun hudud markaz atrofida, tepadan ko‘rinishning
   ~2.5 baravari bilan cheklanadi. */
function viewBounds(m: MLMap) {
  const b = m.getBounds()
  if (m.getPitch() <= 8) return b
  const c = m.getCenter()
  const { clientWidth: w, clientHeight: h } = m.getContainer()
  const pxPerM = 2 ** m.getZoom() / (78271.51696 * Math.cos((c.lat * Math.PI) / 180))
  const r = (Math.max(w, h) / 2 / pxPerM) * 2.5
  const dLat = r / 111320
  const dLng = r / (111320 * Math.cos((c.lat * Math.PI) / 180))
  return new maplibregl.LngLatBounds(
    [Math.max(b.getWest(), c.lng - dLng), Math.max(b.getSouth(), c.lat - dLat)],
    [Math.min(b.getEast(), c.lng + dLng), Math.min(b.getNorth(), c.lat + dLat)],
  )
}

/* uzoqdagi namunaviy tirbandlik rangi: band-lik = ko‘cha turi + bo‘lakning o‘z tebranishi (t — soniya).
   Bo‘lak id’sidan ikki xil “tasodifiy” son: tebranish fazasi va doimiy qo‘shimcha. */
function farColor(t: number) {
  const r1 = ['/', ['%', ['id'], 89], 89]
  const r2 = ['/', ['%', ['id'], 97], 97]
  const score = [
    '+',
    ['match', ['get', 'class'], 'trunk', 0.36, 'motorway', 0.3, 'primary', 0.33, 'secondary', 0.25, 0.16],
    ['*', 0.3, ['sin', ['+', t / 240, ['*', 6.283, r1]]]],
    ['*', 0.25, r2],
  ]
  return ['step', score, TRAFFIC[0], 0.56, TRAFFIC[1], 0.76, TRAFFIC[2], 0.9, TRAFFIC[3]] as unknown as string
}

function markWidth(k: number) {
  return ['interpolate', ['exponential', 1.6], ['zoom'], 16, 0.5 * k, 18, 1 * k, 20, 2.4 * k, 22, 8 * k] as unknown as number
}

/* Kichik kartochka mashina ustida; tepada joy bo‘lmasa — ostida. Gorizontal holatda ekran va panellar
   (padding) ichida qisiladi. Mashina ko‘rinadigan hududdan chiqsa, kartochka yashirinadi. */
function placePeek(m: MLMap, ll: [number, number], el: HTMLDivElement, P: PaddingOptions) {
  const { x, y } = m.project(ll)
  const W = m.getContainer().clientWidth
  const H = m.getContainer().clientHeight
  const w = el.offsetWidth
  const h = el.offsetHeight
  const gap = 18
  const inside = x > P.left && x < W - P.right && y > P.top && y < H - P.bottom
  let top = y - h - gap
  if (top < P.top + 8) top = y + gap
  top = Math.max(P.top + 8, Math.min(top, H - P.bottom - h - 8))
  const left = Math.max(P.left + 8, Math.min(x - w / 2, W - P.right - w - 8))
  el.style.transform = `translate(${left}px, ${top}px)`
  el.style.opacity = inside ? '1' : '0'
  el.style.pointerEvents = inside ? 'auto' : 'none'
}

/* kichik svetofor belgisi (2x piksel zichligida): to‘q korpus, uchta chiroq */
function signalIcon() {
  const w = 22
  const h = 50
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  g.fillStyle = '#141312'
  g.strokeStyle = 'rgba(255,255,255,0.9)'
  g.lineWidth = 2
  g.beginPath()
  g.roundRect(1, 1, w - 2, h - 2, 8)
  g.fill()
  g.stroke()
  ;['#ff4d45', '#ffc233', '#3ddc84'].forEach((col, i) => {
    g.fillStyle = col
    g.beginPath()
    g.arc(w / 2, 10 + i * 15, 5, 0, Math.PI * 2)
    g.fill()
  })
  return g.getImageData(0, 0, w, h)
}

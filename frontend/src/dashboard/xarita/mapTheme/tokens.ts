/* Xarita uslubi “tokenlar”dan: bir nechta rang — butun asosiy xarita (OpenFreeMap positron qatlamlari).
   Och va to‘q variantlar ham shu bitta asosdan qayta bo‘yaladi: qatlam nomlari bir xil, ko‘cha nomlari
   va boshqa sozlamalar har uslubda bir xil ishlaydi. */

export const BASE_URL = 'https://tiles.openfreemap.org/styles/positron'

// building3d — 3D rejimda ko‘tarilgan binolar rangi; hide — butunlay yashiriladigan qatlamlar
export type Palette = {
  url: string
  dark: boolean
  paint: Record<string, Record<string, unknown>>
  asphalt: string
  mark: string
  markOpacity: number
  building3d: string
  hide?: string[]
}

export type MapTokens = {
  id: string
  name: string // tanlagichda ko‘rinadi, masalan “Qum”
  note: string // bir qatorli g‘oya
  tone: 'light' | 'dark'
  // yer
  bg: string
  residential: string // turar-joy hududlari
  park: string
  wood: string
  water: string
  building: string
  buildingLine: string
  building3d: string
  // asosiy xaritadagi yo‘llar (15-zoomgacha; yaqinda o‘rnini o‘zimizning asfalt egallaydi)
  path: string // piyoda yo‘laklari
  minor: string // mahalla ko‘chalari
  major: string // katta ko‘chalar ichi
  casing: string // katta ko‘chalar cheti
  subtle: string // uzoqdan katta ko‘chalar
  motorway: string
  rail: string
  // ko‘cha nomlari
  label: string
  labelMinor: string
  halo: string
  // o‘zimizning yaqindagi asfalt va chiziqlar
  asphalt: string
  mark: string
  markOpacity: number
  hide?: string[] // masalan ['railway', 'highway_path']
}

const RAIL = ['railway', 'railway_transit', 'railway_service']

export function toPalette(t: MapTokens): Palette {
  const line = (c: string) => ({ 'line-color': c })
  const paint: Palette['paint'] = {
    background: { 'background-color': t.bg },
    landuse_residential: { 'fill-color': t.residential, 'fill-opacity': 1 }, // positron’da 0.6 — token rangi to‘liq chiqsin
    park: { 'fill-color': t.park },
    landcover_wood: { 'fill-color': t.wood },
    water: { 'fill-color': t.water },
    waterway: line(t.water),
    building: { 'fill-color': t.building, 'fill-outline-color': t.buildingLine },
    road_area_pier: { 'fill-color': t.bg },
    road_pier: line(t.bg),
    'aeroway-area': { 'fill-color': t.residential },
    'aeroway-runway': line(t.minor),
    'aeroway-runway-casing': line(t.casing),
    'aeroway-taxiway': line(t.minor),
    highway_path: line(t.path),
    highway_minor: line(t.minor),
    highway_major_casing: line(t.casing),
    highway_major_inner: line(t.major),
    highway_major_subtle: line(t.subtle),
    highway_motorway_casing: line(t.casing),
    highway_motorway_inner: line(t.motorway),
    highway_motorway_subtle: line(t.subtle),
    highway_motorway_bridge_casing: line(t.casing),
    highway_motorway_bridge_inner: line(t.motorway),
    tunnel_motorway_casing: line(t.casing),
    tunnel_motorway_inner: line(t.minor),
    'highway-name-major': { 'text-color': t.label, 'text-halo-color': t.halo },
    'highway-name-minor': { 'text-color': t.labelMinor, 'text-halo-color': t.halo },
    'highway-name-path': { 'text-color': t.labelMinor, 'text-halo-color': t.halo },
  }
  for (const r of RAIL) {
    paint[r] = line(t.rail)
    paint[`${r}_dashline`] = line(t.bg)
  }
  return {
    url: BASE_URL,
    dark: t.tone === 'dark',
    paint,
    asphalt: t.asphalt,
    mark: t.mark,
    markOpacity: t.markOpacity,
    building3d: t.building3d,
    // chegaralar va muz qatlamlari shaharda keraksiz
    hide: ['boundary_2', 'boundary_3', 'boundary_disputed', 'landcover_ice_shelf', 'landcover_glacier', ...(t.hide ?? [])],
  }
}

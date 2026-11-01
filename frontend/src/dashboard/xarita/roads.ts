/* Ko‘chalar kataklari (scripts/build_city_tiles.py → public/city/) va ulardan xarita qatlamlari:
   haqiqiy kenglikdagi asfalt + bo‘lak chiziqlari. Faqat ekranda ko‘rinayotgan kataklar yuklanadi. */

export type LngLat = [number, number]
export type Road = { n: [string, string]; p: LngLat[]; l: [number, number]; h: string; s: number; nm?: string }
export type Tile = { roads: Road[]; nodes: Record<string, [number, number, number]> }
export type CityIndex = { tile: { lng: number; lat: number }; bounds: [LngLat, LngLat]; center: LngLat; tiles: string[]; roads: number; signals: number }

export const LANE_M = 3.3 // bitta bo‘lak kengligi, metr
const BASE = '/city'

let index: Promise<CityIndex> | null = null
export const loadIndex = () => (index ??= fetch(`${BASE}/index.json`).then((r) => r.json()))

const tiles = new Map<string, Promise<Tile>>()
export const loadTile = (key: string) => {
  let t = tiles.get(key)
  if (!t) {
    t = fetch(`${BASE}/tiles/${key}.json`).then((r) => r.json())
    tiles.set(key, t)
  }
  return t
}

/* Ekran chegarasi (+1 katak zaxira) ichidagi mavjud kataklar */
export function tilesIn(idx: CityIndex, west: number, south: number, east: number, north: number): string[] {
  const { lng, lat } = idx.tile
  const have = new Set(idx.tiles)
  const out: string[] = []
  for (let x = Math.floor(west / lng) - 1; x <= Math.floor(east / lng) + 1; x++)
    for (let y = Math.floor(south / lat) - 1; y <= Math.floor(north / lat) + 1; y++) {
      const k = `${x}_${y}`
      if (have.has(k)) out.push(k)
    }
  return out
}

/* Bo‘lak chiziqlari ko‘chaning o‘q chizig‘idan siljitib chiziladi (`line-offset`, + = o‘ng tomon).
   O‘ng qo‘l harakati: OSM chizig‘i yo‘nalishidagi bo‘laklar o‘ngda, qarama-qarshilari chapda. */
export function roadFeatures(list: Tile[]) {
  const surface: GeoJSON.Feature[] = []
  const marks: GeoJSON.Feature[] = []
  for (const t of list)
    for (const r of t.roads) {
      const [fwd, back] = r.l
      const geometry: GeoJSON.LineString = { type: 'LineString', coordinates: r.p }
      const width = (fwd + back) * LANE_M
      // asfalt markazi: bir tomonlamada chiziq ustida, ikki tomonlamada bo‘laklar farqiga qarab siljiydi
      const center = back === 0 ? 0 : ((fwd - back) * LANE_M) / 2
      surface.push({ type: 'Feature', geometry, properties: { w: width + 0.6, o: center, h: r.h, nm: r.nm ?? '' } })

      if (back === 0) {
        for (let k = 1; k < fwd; k++) marks.push(mark(geometry, -(fwd * LANE_M) / 2 + k * LANE_M, 'lane'))
      } else {
        marks.push(mark(geometry, 0, 'center')) // qarama-qarshi oqimlar orasidagi yaxlit chiziq
        for (let k = 1; k < fwd; k++) marks.push(mark(geometry, k * LANE_M, 'lane'))
        for (let k = 1; k < back; k++) marks.push(mark(geometry, -k * LANE_M, 'lane'))
      }
    }
  return {
    surface: { type: 'FeatureCollection', features: surface } as GeoJSON.FeatureCollection,
    marks: { type: 'FeatureCollection', features: marks } as GeoJSON.FeatureCollection,
  }
}

const mark = (geometry: GeoJSON.LineString, o: number, kind: 'lane' | 'center'): GeoJSON.Feature => ({ type: 'Feature', geometry, properties: { o, kind } })

/* Metrni ekran pikseliga: zoom bilan eksponensial o‘sadi (Toshkent kengligida, ~41.3°) */
const PX_PER_M_Z0 = 1 / (156543.03392 * Math.cos((41.31 * Math.PI) / 180))
export const metres = (prop: string, extra = 0) =>
  [
    'interpolate',
    ['exponential', 2],
    ['zoom'],
    12,
    ['*', ['+', ['get', prop], extra], 2 ** 12 * PX_PER_M_Z0],
    22,
    ['*', ['+', ['get', prop], extra], 2 ** 22 * PX_PER_M_Z0],
  ] as unknown as number

/// <reference lib="webworker" />
/* Mashinalar simulyatsiyasi (alohida oqimda — sahifa sekinlashmaydi).

   Grafik: har ko‘cha → yo‘nalishli “link”lar (ikki tomonlamada ikkita). Har link’da bo‘laklar;
   mashina bo‘lakdan chiqmaydi, chorrahada keyingi link’ning mos bo‘lagiga o‘tadi.
   Harakat — IDM (Intelligent Driver Model): oldidagi mashinaga yoki qizil svetoforning to‘xtash
   chizig‘iga qarab silliq tormozlaydi va tezlashadi.
   Chorrahalar:
   • Svetoforli — OSM’dagi highway=traffic_signals tugunlari (40 m ichidagilar bitta chorraha) va ularga
     yaqin tugunlar “chorraha qutisi”ni tashkil qiladi. Svetofor qutiga TASHQARIDAN kiruvchi har bir yo‘lga
     qo‘yiladi (OSM’da faqat ba’zi kirishlar belgilangan bo‘lsa ham); quti ichidagi qisqa bo‘laklarda to‘xtash yo‘q.
     To‘xtash chizig‘i kesishgan yo‘l kengligining yarmicha orqada. Kirishlar ikki o‘qqa bo‘linib navbat bilan yashil oladi.
   • Svetoforsiz — ustunlik qoidasi: kattaroq ko‘cha ustun, teng bo‘lsa birinchi yetib kelgan o‘tadi; chorraha
     bir lahzada bitta oqimga band qilinadi.
   • Chorrahani to‘sma: chiqish yo‘li to‘la bo‘lsa, yashilda ham kirilmaydi.
   Fazalar NAMUNAVIY — Toshkentning haqiqiy svetofor rejimlari ochiq manbada yo‘q. */
import type { Road, Tile } from '../roads'
import { LANE_M } from '../roads'
import { CAR_STRIDE, mercX, mercY, ORIGIN_X, ORIGIN_Y, SIGNAL_STRIDE, unmercLat, unmercLng, type CarInfo, type FromWorker, type Rect, type ToWorker } from './protocol'

const DT = 0.05 // fizika qadami, s (20 Hz)
const MAX_CARS = 2500
const CAR_LEN = 4.5
const S0 = 2 // tirbandlikdagi minimal oraliq, m
const T_HEAD = 1.3 // xavfsiz vaqt oralig‘i, s
const A_MAX = 1.4 // tezlanish, m/s²
const B_COMF = 2.2 // qulay tormoz, m/s²
const CLUSTER_M = 40 // shu masofadagi svetofor tugunlari — bitta chorraha
const BOX_M = 25 // svetofor tugunidan shu masofadagi tugunlar ham chorraha qutisiga kiradi
const YIELD_BACK = 2.5 // svetoforsiz chorrahada “yo‘l ber” chizig‘i, m
const APPROACH_M = 30 // ustunlik qoidasi shu masofadan boshlab hisoblanadi
// ko‘cha darajasi: katta raqam — ustun yo‘l; *_link (burilish yo‘llari) bir pog‘ona past
const RANK: Record<string, number> = { motorway: 6, trunk: 5, primary: 4, secondary: 3, tertiary: 2, unclassified: 1, residential: 1, living_street: 0 }
const BLEND_M = 14 // chorrahadan keyin yangi bo‘lak o‘rtasiga silliq siljish masofasi
const CAR_W = 1.85
const CELL = 25 // to‘qnashuv tekshiruvi uchun to‘r katagi, m
const PATIENCE = 12 // shuncha soniya yo‘l berib qotib qolgan mashina (o‘zaro “tiqilish”) — yo‘l berishni bir lahza unutadi

type Signal = { cluster: Cluster; group: 0 | 1 }
type Link = {
  id: number
  road: number
  tile: string
  from: string
  to: string
  lanes: number
  base: number // birinchi bo‘lak chetining o‘qdan siljishi, m (+ = o‘ng)
  xs: Float64Array
  ys: Float64Array
  cum: Float64Array // haqiqiy metrlarda to‘plangan uzunlik
  len: number
  k: number // haqiqiy metr / Merkator metri (= cos lat)
  vmax: number
  limit: number // km/soat (OSM yoki ko‘cha turi bo‘yicha)
  name: string
  hw: string
  out: number[]
  outW: number[]
  rev: number // o‘sha ko‘chaning qarama-qarshi yo‘nalishi (berk ko‘chada orqaga qaytish uchun), yo‘q bo‘lsa −1
  signal: Signal | null
  stopBack: number // to‘xtash/yo‘l ber chizig‘i link oxiridan, m
  internal: boolean // svetoforli chorraha qutisi ichidagi bo‘lak — bu yerda to‘xtalmaydi
  junction: number // svetoforsiz chorraha (ustunlik qoidasi) indeksi, yo‘q bo‘lsa −1
  prio: number
  box: [number, number, number, number] // chegaralovchi to‘rtburchak (Merkator metri)
}
type Cluster = { offset: number; groups: number; nodes: string[] }

/* ---------- holat ---------- */
let links: Link[] = []
let active: Link[] = [] // ekran hududidagi link’lar — mashinalar faqat shu yerda tug‘iladi
let view: Rect | null = null
let screen: Rect | null = null
let byTile = new Map<string, Tile>()
let clusters: Cluster[] = []
let t = 0
let perLaneKm = 14
let running = false
let timer = 0
let inspect = -1 // tanlangan mashina
// svetoforsiz chorrahalar: kim va qachongacha band qilgan
let jBusyUntil = new Float64Array(0)
let jBusyLink = new Int32Array(0)
// tirbandlik: har link uchun silliqlangan “erkinlik” (1 — erkin oqim, 0 — to‘liq tiqilin)
let flow = new Float32Array(0)
let lnCache: Float64Array[] = [] // link chizig‘i lng/lat (bir marta hisoblanadi)

const car = {
  alive: new Uint8Array(MAX_CARS),
  link: new Int32Array(MAX_CARS),
  lane: new Int8Array(MAX_CARS),
  s: new Float64Array(MAX_CARS),
  v: new Float64Array(MAX_CARS),
  v0: new Float64Array(MAX_CARS),
  next: new Int32Array(MAX_CARS),
  color: new Uint8Array(MAX_CARS),
  gen: new Uint16Array(MAX_CARS),
  latFrom: new Float64Array(MAX_CARS), // link’ga kirgandagi yon siljish (haqiqiy m)
  acc: new Float32Array(MAX_CARS),
  wait: new Float32Array(MAX_CARS), // to‘xtab turgan jami vaqt, s
  odo: new Float32Array(MAX_CARS), // yurgan yo‘li, m
  held: new Float32Array(MAX_CARS), // boshqa oqimdagi mashinaga yo‘l berib turgan vaqt, s
}
// har qadamdagi joy (haqiqiy metrlarda) va yo‘nalish birlik vektori
const px = new Float64Array(MAX_CARS)
const py = new Float64Array(MAX_CARS)
const hx = new Float64Array(MAX_CARS)
const hy = new Float64Array(MAX_CARS)

/* ---------- grafik ---------- */
function rebuild(tiles: Record<string, Tile>) {
  const keep = new Set(Object.keys(tiles))
  const changed = keep.size !== byTile.size || [...keep].some((k) => !byTile.has(k))
  if (!changed) return
  byTile = new Map(Object.entries(tiles))

  // eski link’dagi mashinalarni yangi grafikka o‘tkazish uchun (tile+yo‘l indeksi bo‘yicha) kalit
  const oldKey = links.map((l) => `${l.tile}:${l.road}:${l.from}>${l.to}`)
  const next: Link[] = []
  const index = new Map<string, number>()
  for (const [tile, data] of byTile) {
    data.roads.forEach((r, i) => {
      const fwd = r.l[0]
      const back = r.l[1]
      const base = back === 0 ? -(fwd * LANE_M) / 2 : 0
      add(next, index, tile, i, r, r.n[0], r.n[1], r.p, fwd, base)
      if (back > 0) add(next, index, tile, i, r, r.n[1], r.n[0], [...r.p].reverse(), back, 0)
    })
  }
  // chorrahadagi chiqishlar: to‘g‘ri yo‘l ko‘proq tanlanadi, orqaga (o‘sha ko‘chaga) burilmaydi
  const starts = new Map<string, number[]>()
  for (const l of next) (starts.get(l.from) ?? starts.set(l.from, []).get(l.from)!).push(l.id)
  for (const l of next) {
    const isRev = (o: number) => next[o].to === l.from && next[o].road === l.road && next[o].tile === l.tile
    const cand = (starts.get(l.to) ?? []).filter((o) => !isRev(o))
    l.rev = (starts.get(l.to) ?? []).find(isRev) ?? -1
    const a1 = endAngle(l)
    l.out = cand
    l.outW = cand.map((o) => {
      const turn = Math.abs(angleDiff(startAngle(next[o]), a1))
      return turn < 0.5 ? 3 : turn < 2.4 ? 1 : 0.15
    })
  }

  // mavjud mashinalarni saqlab qolamiz (link id’lari o‘zgargan bo‘lishi mumkin)
  for (let c = 0; c < MAX_CARS; c++) {
    if (!car.alive[c]) continue
    const id = index.get(oldKey[car.link[c]] ?? '')
    if (id === undefined) {
      car.alive[c] = 0
      continue
    }
    car.link[c] = id
    car.lane[c] = Math.min(car.lane[c], next[id].lanes - 1)
    car.next[c] = pickNext(next[id])
  }
  links = next
  flow = new Float32Array(links.length).fill(1)
  lnCache = []
  buildJunctions()
  setView(view, screen)
}

function add(out: Link[], index: Map<string, number>, tile: string, road: number, r: Road, from: string, to: string, pts: [number, number][], lanes: number, base: number) {
  const n = pts.length
  const xs = new Float64Array(n)
  const ys = new Float64Array(n)
  const cum = new Float64Array(n)
  const lat = pts[Math.floor(n / 2)][1]
  const k = Math.cos((lat * Math.PI) / 180)
  for (let i = 0; i < n; i++) {
    xs[i] = mercX(pts[i][0]) - ORIGIN_X
    ys[i] = mercY(pts[i][1]) - ORIGIN_Y
    if (i) cum[i] = cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]) * k
  }
  const id = out.length
  index.set(`${tile}:${road}:${from}>${to}`, id)
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (let i = 0; i < n; i++) {
    x0 = Math.min(x0, xs[i])
    x1 = Math.max(x1, xs[i])
    y0 = Math.min(y0, ys[i])
    y1 = Math.max(y1, ys[i])
  }
  out.push({ id, road, tile, from, to, lanes: Math.max(1, lanes), base, xs, ys, cum, len: cum[n - 1], k, vmax: (Math.min(r.s, 70) / 3.6) * 0.92, limit: r.s, name: r.nm ?? '', hw: r.h, out: [], outW: [], rev: -1, signal: null, stopBack: 0, internal: false, junction: -1, prio: rankOf(r.h), box: [x0, y0, x1, y1] })
}

const rankOf = (hw: string) => (RANK[hw.replace('_link', '')] ?? 1) - (hw.endsWith('_link') ? 0.5 : 0)
const roadWidth = (l: Link) => (l.lanes + (l.rev >= 0 ? links[l.rev].lanes : 0)) * LANE_M

const startAngle = (l: Link) => Math.atan2(l.ys[1] - l.ys[0], l.xs[1] - l.xs[0])
const endAngle = (l: Link) => {
  const n = l.xs.length
  return Math.atan2(l.ys[n - 1] - l.ys[n - 2], l.xs[n - 1] - l.xs[n - 2])
}
const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

/* ---------- chorrahalar ---------- */
function buildJunctions() {
  type P = { x: number; y: number; k: number }
  const toP = (lng: number, lat: number): P => ({ x: mercX(lng) - ORIGIN_X, y: mercY(lat) - ORIGIN_Y, k: Math.cos((lat * Math.PI) / 180) })
  const pos = new Map<string, P>()
  // svetofor nuqtalari: OSM’dagi barcha traffic_signals (kataqdagi `sig`) — ko‘pi chorrahadan oldingi kirish yo‘lida
  const sigMap = new Map<string, P>()
  for (const tile of byTile.values()) {
    for (const [id, [lng, lat, s]] of Object.entries(tile.nodes)) {
      if (!pos.has(id)) pos.set(id, toP(lng, lat))
      if (s) sigMap.set(`${lng},${lat}`, toP(lng, lat))
    }
    for (const [lng, lat] of tile.sig ?? []) sigMap.set(`${lng},${lat}`, toP(lng, lat))
  }
  const sigKeys = [...sigMap.keys()]
  const sigPts = [...sigMap.values()]
  const dist = (p: P, q: P) => Math.hypot(p.x - q.x, p.y - q.y) * p.k
  // yaqin svetofor tugunlari — bitta chorraha (ikki qatnov qismli ko‘chalarda har tomonida alohida tugun bo‘ladi)
  const parent = sigPts.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  for (let a = 0; a < sigPts.length; a++) for (let b = a + 1; b < sigPts.length; b++) if (dist(sigPts[a], sigPts[b]) < CLUSTER_M) parent[find(a)] = find(b)
  const groups = new Map<number, number[]>()
  sigPts.forEach((_, i) => (groups.get(find(i)) ?? groups.set(find(i), []).get(find(i))!).push(i))

  for (const l of links) {
    l.signal = null
    l.internal = false
    l.junction = -1
    l.stopBack = 0
  }
  clusters = []
  const inBox = new Set<string>()
  // fazalar siljishi chorraha tugunidan kelib chiqadi — xarita surilib qayta qurilganda ham o‘zgarmaydi
  const seed = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 9973, 7)
  const nodes = [...pos.entries()]
  for (const members of groups.values()) {
    // chorraha qutisi: svetofor nuqtalariga yaqin grafik tugunlari
    const cx = members.reduce((n, m) => n + sigPts[m].x, 0) / members.length
    const cy = members.reduce((n, m) => n + sigPts[m].y, 0) / members.length
    const near = nodes.filter(([, p]) => Math.hypot(p.x - cx, p.y - cy) * p.k < 90) // tezlik uchun: faqat atrofdagilar
    const box = new Set<string>()
    for (const [id, p] of near) if (members.some((m) => dist(sigPts[m], p) < BOX_M)) box.add(id)
    if (!box.size) continue
    // quti chorraha yadrosidagi qisqa “dumlar”ni ham qamrasin: eng keng yo‘l yarmicha masofadagi tugunlar qo‘shiladi
    const touch = links.filter((l) => box.has(l.to) || box.has(l.from))
    const grow = touch.reduce((w, o) => Math.max(w, roadWidth(o)), 0) / 2 + 1.5
    for (let iter = 0, added = true; added && iter < 3; iter++) {
      added = false
      for (const [id, p] of near)
        if (!box.has(id) && [...box].some((b) => dist(pos.get(b)!, p) < grow)) {
          box.add(id)
          added = true
        }
    }
    const ids = members.map((m) => sigKeys[m])
    const inc = links.filter((l) => box.has(l.to) && !box.has(l.from) && l.len > 6)
    for (const l of links) if (box.has(l.to) && box.has(l.from)) l.internal = true
    box.forEach((id) => inBox.add(id))
    if (!inc.length) continue
    // asosiy o‘q — eng uzun kiruvchi yo‘l yo‘nalishi; unga ±45° — 0-guruh, qolgani — 1-guruh
    const ref = endAngle(inc.reduce((a, b) => (b.len > a.len ? b : a)))
    const cl: Cluster = { offset: seed(ids.sort()[0]) % 60, groups: 1, nodes: ids }
    const groupOf = (l: Link): 0 | 1 => {
      const d = Math.abs(angleDiff(endAngle(l), ref))
      return d < Math.PI / 4 || d > (3 * Math.PI) / 4 ? 0 : 1
    }
    // chorraha “yadrosi”: qutidagi har tugun atrofida eng keng yo‘l yarmicha doira. Ikki qatnov qismli
    // ko‘chalarda tugunlar har qatnov qismida bo‘ladi — yadro ikkalasini ham, orasidagi bo‘lakni ham qamraydi
    const core = [...box].map((id) => pos.get(id)!)
    const r = inc.reduce((w, o) => Math.max(w, roadWidth(o)), 0) / 2 + 1.5
    for (const l of inc) {
      const g = groupOf(l)
      if (g === 1) cl.groups = 2
      l.signal = { cluster: cl, group: g }
      // to‘xtash chizig‘i — link oxiridan orqaga yurib, yadrodan chiqqan birinchi nuqtada (+1.5 m zaxira)
      let s = l.len
      while (s > 2) {
        const [x, y] = at(l, s, 0)
        if (!core.some((p) => Math.hypot(p.x - x, p.y - y) * l.k < r)) break
        s -= 1
      }
      l.stopBack = Math.min(Math.max(l.len - s + 1.5, 3), 40, l.len - 2)
    }
    clusters.push(cl)
  }

  // svetoforsiz chorrahalar: 2+ turli ko‘chadan kirish bo‘lgan tugunlar
  const incoming = new Map<string, Link[]>()
  for (const l of links) if (!l.signal && !l.internal && !inBox.has(l.to)) (incoming.get(l.to) ?? incoming.set(l.to, []).get(l.to)!).push(l)
  let jn = 0
  for (const list of incoming.values()) {
    const roads = new Set(list.map((l) => `${l.tile}:${l.road}`))
    if (roads.size < 2) continue // oddiy davom (bitta ko‘chaning bo‘laklari)
    for (const l of list) {
      l.junction = jn
      l.stopBack = Math.min(YIELD_BACK, l.len - 1)
    }
    jn++
  }
  jBusyUntil = new Float64Array(jn)
  jBusyLink = new Int32Array(jn).fill(-1)
  postMarks()
}

/* yerdagi chiziqlar — grafik o‘zgarganda bir marta yuboriladi */
function postMarks() {
  const out: number[] = []
  for (const l of links) {
    if (!l.signal && l.junction < 0) continue
    const sLine = Math.max(0, l.len - l.stopBack)
    // to‘xtash (yoki yo‘l ber) chizig‘i — kiruvchi bo‘laklar bo‘ylab
    const [x, y, h] = at(l, sLine, l.base + (l.lanes * LANE_M) / 2)
    out.push(x, y, h, 0.5, l.lanes * LANE_M, l.signal ? 3 : 5)
    if (!l.signal) continue
    // piyoda yo‘lagi: to‘xtash chizig‘idan chorraha tomonda, butun ko‘cha eni bo‘ylab
    const zs = sLine + 2.6
    if (zs > l.len) continue
    const rev = l.rev >= 0 ? links[l.rev].lanes : 0
    const width = (l.lanes + rev) * LANE_M
    const center = l.base === 0 ? ((l.lanes - rev) * LANE_M) / 2 : l.base + (l.lanes * LANE_M) / 2
    const [zx, zy] = at(l, zs, center)
    out.push(zx, zy, h, 3, width, 4)
  }
  const marks = new Float32Array(out)
  const msg: FromWorker = { type: 'marks', marks }
  postMessage(msg, [marks.buffer])
}

/* 0 qizil, 1 sariq, 2 yashil. Ikki o‘qli: 25 s yashil, 3 s sariq, 2 s hammasi qizil — navbat bilan.
   Bitta o‘qli (piyoda o‘tish joyi): 35 s yashil, 3 s sariq, 14 s qizil. */
function state(sig: Signal): number {
  const c = sig.cluster
  if (c.groups === 1) {
    const p = (t + c.offset) % 52
    return p < 35 ? 2 : p < 38 ? 1 : 0
  }
  const p = (t + c.offset + (sig.group ? 30 : 0)) % 60
  return p < 25 ? 2 : p < 28 ? 1 : 0
}

/* ---------- mashinalar ---------- */
function pickNext(l: Link): number {
  if (!l.out.length) return l.rev // berk ko‘cha — orqaga qaytadi (ikki tomonlama bo‘lsa)
  let sum = 0
  for (const w of l.outW) sum += w
  let r = Math.random() * sum
  for (let i = 0; i < l.out.length; i++) if ((r -= l.outW[i]) <= 0) return l.out[i]
  return l.out[l.out.length - 1]
}

function laneKm() {
  let m = 0
  for (const l of active) m += l.lanes * l.len
  return m / 1000
}

const hits = (l: Link, r: Rect | null) => !!r && l.box[0] < r[2] && l.box[2] > r[0] && l.box[1] < r[3] && l.box[3] > r[1]
const inView = (l: Link) => hits(l, view)
const onScreen = (l: Link) => hits(l, screen)

/* ekran o‘zgardi: faol link’lar qayta tanlanadi, hududdan uzoqdagi (ko‘rinmaydigan) mashinalar olib tashlanadi */
function setView(box: Rect | null, scr: Rect | null) {
  view = box
  screen = scr
  active = links.filter(inView)
  const isActive = new Uint8Array(links.length)
  for (const l of active) isActive[l.id] = 1
  for (let c = 0; c < MAX_CARS; c++) if (car.alive[c] && !isActive[car.link[c]]) car.alive[c] = 0
}

/* anywhere=false: faqat ekrandan tashqaridagi yo‘lda — mashina chetdan “kirib keladi”, ko‘z oldida paydo bo‘lmaydi */
function spawn(c: number, anywhere = false) {
  if (!active.length) return
  // uzunroq va ko‘p bo‘lakli yo‘llarda ko‘proq mashina
  for (let tries = 0; tries < 16; tries++) {
    const l = active[(Math.random() * active.length) | 0]
    if (!anywhere && onScreen(l)) continue
    if (Math.random() > (l.lanes * l.len) / 400) continue
    const lane = (Math.random() * l.lanes) | 0
    const s = Math.random() * l.len
    if (crowded(l.id, lane, s) || occupied(l, lane, s)) continue
    car.alive[c] = 1
    car.link[c] = l.id
    car.lane[c] = lane
    car.s[c] = s
    car.v0[c] = l.vmax * (0.82 + Math.random() * 0.18)
    car.v[c] = car.v0[c] * 0.6
    car.next[c] = pickNext(l)
    car.color[c] = (Math.random() * 10) | 0
    car.gen[c]++
    car.latFrom[c] = l.base + (car.lane[c] + 0.5) * LANE_M
    car.wait[c] = 0
    car.odo[c] = 0
    car.held[c] = 0
    // to‘rga darhol qo‘shiladi — shu to‘ldirishdagi keyingi mashina uning ustiga tushmasin
    const [x, y] = at(l, s, car.latFrom[c])
    px[c] = x * l.k
    py[c] = y * l.k
    const key = Math.floor(px[c] / CELL) * 100003 + Math.floor(py[c] / CELL)
    ;(grid.get(key) ?? grid.set(key, []).get(key)!).push(c)
    return
  }
}

/* shu bo‘lakda yaqin atrofda mashina bormi (yangi mashina ustma-ust tug‘ilmasin) */
function crowded(link: number, lane: number, s: number) {
  for (let c = 0; c < MAX_CARS; c++) if (car.alive[c] && car.link[c] === link && car.lane[c] === lane && Math.abs(car.s[c] - s) < CAR_LEN + S0 + 4) return true
  return false
}

/* o‘sha joyda (boshqa bo‘lak yoki ko‘chada ham) mashina bormi — joylar oxirgi qadamdagi to‘rdan */
function occupied(l: Link, lane: number, s: number) {
  const [x, y] = at(l, s, l.base + (lane + 0.5) * LANE_M)
  const rx = x * l.k
  const ry = y * l.k
  const cx = Math.floor(rx / CELL)
  const cy = Math.floor(ry / CELL)
  for (let i = -1; i <= 1; i++)
    for (let j = -1; j <= 1; j++)
      for (const b of grid.get((cx + i) * 100003 + cy + j) ?? []) if (car.alive[b] && Math.hypot(px[b] - rx, py[b] - ry) < CAR_LEN + 2.5) return true
  return false
}

function fill() {
  const target = Math.min(MAX_CARS, Math.round(laneKm() * perLaneKm))
  let alive = 0
  for (let c = 0; c < MAX_CARS; c++) alive += car.alive[c]
  const first = alive === 0 // birinchi to‘ldirish — ekran bo‘sh turmasin, hamma joyga
  for (let c = 0; c < MAX_CARS && alive < target; c++)
    if (!car.alive[c]) {
      spawn(c, first)
      alive += car.alive[c]
    }
  // ortiqchasini olib tashlash (zichlik kamaytirilsa yoki hudud kichraysa) — faqat ko‘rinmaydiganlarini
  for (let c = MAX_CARS - 1; c >= 0 && alive > target; c--)
    if (car.alive[c] && !onScreen(links[car.link[c]])) {
      car.alive[c] = 0
      alive--
    }
}

/* bo‘lak bo‘yicha ro‘yxat: oldindagidan orqaga (s kamayish tartibida) */
function lanesNow() {
  const m = new Map<number, number[]>()
  for (let c = 0; c < MAX_CARS; c++) {
    if (!car.alive[c]) continue
    const key = car.link[c] * 8 + car.lane[c]
    ;(m.get(key) ?? m.set(key, []).get(key)!).push(c)
  }
  for (const list of m.values()) list.sort((a, b) => car.s[b] - car.s[a])
  return m
}

const idm = (v: number, v0: number, gap: number, dv: number) => {
  const sStar = S0 + Math.max(0, v * T_HEAD + (v * dv) / (2 * Math.sqrt(A_MAX * B_COMF)))
  return A_MAX * (1 - (v / v0) ** 4 - (sStar / Math.max(gap, 0.1)) ** 2)
}

function step() {
  const t0 = performance.now()
  t += DT
  const lanes = lanesNow()
  locate()
  const acc = new Float64Array(MAX_CARS)
  // svetoforsiz chorrahalar: har biriga yaqinlashayotganlar ichidan bittasi o‘tadi —
  // kattaroq ko‘chadagi, teng bo‘lsa eng tez yetib keladigani
  const winner = new Map<number, { link: number; rank: number; eta: number }>()
  for (const [key, list] of lanes) {
    const l = links[key >> 3]
    if (l.junction < 0) continue
    const c = list[0]
    const toEnd = l.len - car.s[c]
    if (toEnd > APPROACH_M || toEnd < l.stopBack - 0.5) continue
    const eta = toEnd / Math.max(car.v[c], 1)
    const w = winner.get(l.junction)
    if (!w || l.prio > w.rank || (l.prio === w.rank && eta < w.eta)) winner.set(l.junction, { link: l.id, rank: l.prio, eta })
  }
  for (const [key, list] of lanes) {
    const l = links[(key / 8) | 0]
    const lane = key % 8
    for (let i = 0; i < list.length; i++) {
      const c = list[i]
      const v = car.v[c]
      let gap = Infinity
      let dv = 0
      if (i > 0) {
        const lead = list[i - 1]
        gap = car.s[lead] - car.s[c] - CAR_LEN
        dv = v - car.v[lead]
      } else {
        const toEnd = l.len - car.s[c]
        const toLine = toEnd - l.stopBack // to‘xtash chizig‘igacha; manfiy — chiziqdan o‘tib bo‘lgan
        const nx = car.next[c]
        let stop = false
        // qizil yoki (to‘xtay oladigan masofada) sariq — to‘xtash chizig‘ida “devor”
        if (l.signal && toLine > -0.5) {
          const st = state(l.signal)
          stop = st === 0 || (st === 1 && toLine > (v * v) / (2 * B_COMF))
        }
        // svetoforsiz chorraha: navbat bizda emas yoki chorraha boshqa oqimga band
        if (!stop && l.junction >= 0 && toLine > -0.5 && toEnd < APPROACH_M) {
          const j = l.junction
          const free = t >= jBusyUntil[j] || jBusyLink[j] === l.id
          stop = !free || winner.get(j)?.link !== l.id
        }
        // chorrahani to‘sma: chiqish yo‘lining boshi band bo‘lsa — chiziqda kutiladi
        if (!stop && nx >= 0 && (l.signal || l.junction >= 0) && toLine > -0.5) {
          const exit = lanes.get(nx * 8 + Math.min(lane, links[nx].lanes - 1))
          const last = exit?.[exit.length - 1]
          stop = last !== undefined && car.s[last] < CAR_LEN + 4 && car.v[last] < 2
          // chorraha ichida yo‘limizda to‘xtab qolgan mashina bor — qutiga kirmay, chiziqda kutamiz
          if (!stop && toLine < 25) stop = pathBlocked(c, Math.max(toLine, 0), (links[nx].internal ? links[nx].len : 0) + 8)
        }
        if (stop) {
          gap = toLine
          dv = v
        }
        if (nx >= 0 && gap === Infinity) {
          const nl = links[nx]
          const back = lanes.get(nx * 8 + Math.min(lane, nl.lanes - 1))
          if (back?.length) {
            const last = back[back.length - 1]
            gap = toEnd + car.s[last] - CAR_LEN
            dv = v - car.v[last]
          }
        }
      }
      acc[c] = idm(v, car.v0[c], gap, dv)
    }
  }
  yieldToCrossing(acc)

  let stopped = 0
  for (let c = 0; c < MAX_CARS; c++) {
    if (!car.alive[c]) continue
    const v = Math.max(0, car.v[c] + acc[c] * DT)
    const ds = Math.max(0, (car.v[c] + v) / 2) * DT
    car.s[c] += ds
    car.v[c] = v
    car.acc[c] = acc[c]
    car.odo[c] += ds
    if (v > 1) car.held[c] = 0
    if (v < 0.5) {
      stopped++
      car.wait[c] += DT
    }
    let l = links[car.link[c]]
    while (car.s[c] >= l.len) {
      const nx = car.next[c]
      if (nx < 0 || !inView(links[nx])) {
        // faol hududdan chiqdi (u ekran + zaxira — bu joy ko‘rinmaydi): boshqa joyda qayta paydo bo‘ladi
        // yo‘l tugadi yoki faol hududdan chiqdi — boshqa joyda qayta paydo bo‘ladi
        car.alive[c] = 0
        spawn(c)
        break
      }
      // svetoforsiz chorrahaga kirdi — bir lahza shu oqimga band (boshqa yo‘nalishlar kutadi)
      if (l.junction >= 0) {
        jBusyUntil[l.junction] = t + 1.2
        jBusyLink[l.junction] = l.id
      }
      // yangi link boshida mashina eski bo‘lakdagi yon holatidan yangi bo‘lak o‘rtasiga silliq o‘tadi
      const [px, py] = at(l, l.len, lateral(c, l))
      car.s[c] -= l.len
      l = links[nx]
      car.link[c] = nx
      const dx = l.xs[1] - l.xs[0]
      const dy = l.ys[1] - l.ys[0]
      const d = Math.hypot(dx, dy) || 1
      car.latFrom[c] = (((px - l.xs[0]) * -dy + (py - l.ys[0]) * dx) / d) * l.k
      car.lane[c] = Math.min(car.lane[c], l.lanes - 1)
      car.v0[c] = l.vmax * (0.82 + Math.random() * 0.18)
      car.next[c] = pickNext(l)
    }
  }
  measureFlow()
  if (Math.round(t / DT) % 20 === 0) {
    fill() // har soniyada zichlikni tiklash
    postTraffic()
  }
  post(stopped, performance.now() - t0)
}

/* Bo‘lakdagi “oldindagi mashina”dan tashqari: yo‘lida JISMONAN turgan har qanday mashina — qo‘shilish (ikki yo‘l
   bitta bo‘lakka), chorraha ichida kesishgan burilishlar, berk ko‘chada qaytish. Har mashina oldidagi
   yo‘lagiga (kuzov eni + zaxira) tushadigan mashinaga IDM bilan tormozlaydi. Ikkalasi bir-birining yo‘lida
   bo‘lsa — kesishuv nuqtasiga uzoqrog‘i yo‘l beradi (navbat bilan, “zanjir” kabi). */
let grid = new Map<number, number[]>()
function locate() {
  grid = new Map()
  for (let c = 0; c < MAX_CARS; c++) {
    if (!car.alive[c]) continue
    const l = links[car.link[c]]
    const [x, y, h] = at(l, car.s[c], lateral(c, l))
    px[c] = x * l.k
    py[c] = y * l.k
    hx[c] = Math.cos(h)
    hy[c] = Math.sin(h)
    const key = Math.floor(px[c] / CELL) * 100003 + Math.floor(py[c] / CELL)
    ;(grid.get(key) ?? grid.set(key, []).get(key)!).push(c)
  }
}
const near = (c: number, r: number, fn: (b: number) => void) => {
  const cx = Math.floor(px[c] / CELL)
  const cy = Math.floor(py[c] / CELL)
  const n = Math.ceil(r / CELL)
  for (let i = -n; i <= n; i++)
    for (let j = -n; j <= n; j++) {
      const list = grid.get((cx + i) * 100003 + cy + j)
      if (list) for (const b of list) if (b !== c) fn(b)
    }
}
// a’ning oldida b qayerda: [oldinga masofa, bo‘sh oraliq] yoki null (yo‘lida emas)
function ahead(a: number, b: number, look: number): [number, number] | null {
  const rx = px[b] - px[a]
  const ry = py[b] - py[a]
  const fwd = rx * hx[a] + ry * hy[a]
  if (fwd <= 0 || fwd > look) return null
  const lat = Math.abs(rx * hy[a] - ry * hx[a])
  const cos = Math.abs(hx[a] * hx[b] + hy[a] * hy[b])
  const sin = Math.sqrt(Math.max(0, 1 - cos * cos))
  if (lat > CAR_W / 2 + 0.25 + sin * (CAR_LEN / 2) + cos * (CAR_W / 2)) return null
  return [fwd, fwd - CAR_LEN / 2 - cos * (CAR_LEN / 2) - sin * (CAR_W / 2)]
}
/* chorrahaga kirishdan oldin: yo‘limizda (to‘xtash chizig‘idan keyin `range` metrgacha) to‘xtab qolgan mashina bormi */
function pathBlocked(a: number, from: number, range: number) {
  let hit = false
  near(a, from + range, (b) => {
    if (hit || car.v[b] > 1.5) return
    const h = ahead(a, b, from + range)
    if (h && h[0] > from) hit = true
  })
  return hit
}

function yieldToCrossing(acc: Float64Array) {
  for (let a = 0; a < MAX_CARS; a++) {
    if (!car.alive[a]) continue
    if (car.held[a] > PATIENCE) {
      if (car.held[a] > PATIENCE + 2) car.held[a] = 0
      else car.held[a] += DT
      continue
    }
    const v = car.v[a]
    const look = Math.min(30, 6 + v * 1.6)
    let best = Infinity
    let bestDv = 0
    near(a, look, (b) => {
      if (car.link[b] === car.link[a] && car.lane[b] === car.lane[a]) return // bo‘lakdagi navbat — IDM’da
      const hit = ahead(a, b, look)
      if (!hit) return
      const back = ahead(b, a, Math.min(30, 6 + car.v[b] * 1.6))
      // ikkalasi bir-birining yo‘lida: yaqinrog‘i o‘tadi, uzoqrog‘i kutadi
      if (back && (hit[0] < back[0] || (hit[0] === back[0] && a < b))) return
      if (hit[1] < best) {
        best = hit[1]
        bestDv = v - car.v[b] * (hx[a] * hx[b] + hy[a] * hy[b])
      }
    })
    if (best === Infinity) continue
    const f = idm(v, car.v0[a], best, bestDv)
    if (f < acc[a]) {
      acc[a] = f
      if (v < 1) car.held[a] += DT
    }
  }
}

/* Tirbandlik — Yandex kabi, lekin manba simulyatsiyadagi mashinalar: yo‘ldagi o‘rtacha tezlik (chegaraga nisbatan)
   va bandlik (bo‘laklar necha foiz mashina bilan to‘la). Bitta mashina qizilda turgani yo‘lni “tiqilin” qilmaydi —
   to‘la navbat qiladi. Silliqlash ~8 s: svetofor har almashganda rang sakramaydi. */
function measureFlow() {
  const sum = new Float32Array(links.length)
  const cnt = new Uint16Array(links.length)
  for (let c = 0; c < MAX_CARS; c++) {
    if (!car.alive[c]) continue
    const l = car.link[c]
    sum[l] += Math.min(1, car.v[c] / links[l].vmax)
    cnt[l]++
  }
  for (const l of active) {
    const n = cnt[l.id]
    let target = 1
    if (n) {
      const busy = Math.min(1, (n * (CAR_LEN + S0)) / Math.max(l.len * l.lanes, 1) / 0.5) // yarmi to‘la — to‘liq ta’sir
      target = 1 - (1 - sum[l.id] / n) * busy
    }
    flow[l.id] += (target - flow[l.id]) * (DT / (n ? 8 : 20))
  }
}

function postTraffic() {
  const features: GeoJSON.Feature<GeoJSON.LineString, { lv: number; o: number; w: number }>[] = []
  for (const l of active) {
    if (l.internal || l.len < 8) continue // chorraha ichidagi qisqa bo‘laklar bo‘yalmaydi
    const f = flow[l.id]
    const lv = f > 0.68 ? 0 : f > 0.45 ? 1 : f > 0.22 ? 2 : 3
    let ln = lnCache[l.id]
    if (!ln) {
      ln = lnCache[l.id] = new Float64Array(l.xs.length * 2)
      for (let i = 0; i < l.xs.length; i++) {
        ln[i * 2] = unmercLng(l.xs[i] + ORIGIN_X)
        ln[i * 2 + 1] = unmercLat(l.ys[i] + ORIGIN_Y)
      }
    }
    const coords: [number, number][] = []
    for (let i = 0; i < ln.length; i += 2) coords.push([ln[i], ln[i + 1]])
    // o‘z yo‘nalishidagi bo‘laklar o‘rtasida, ular eniga (chetlarda ozgina asfalt qoladi)
    features.push({ type: 'Feature', properties: { lv, o: l.base + (l.lanes * LANE_M) / 2, w: l.lanes * LANE_M - 0.6 }, geometry: { type: 'LineString', coordinates: coords } })
  }
  const msg: FromWorker = { type: 'traffic', roads: { type: 'FeatureCollection', features } }
  postMessage(msg)
}

/* yon siljish (haqiqiy m): bo‘lak o‘rtasi; link boshidagi BLEND_M metrda kirish holatidan silliq o‘tadi */
function lateral(c: number, l: Link) {
  const target = l.base + (car.lane[c] + 0.5) * LANE_M
  const s = car.s[c]
  if (s >= BLEND_M) return target
  const f = s / BLEND_M
  const e = f * f * (3 - 2 * f)
  return car.latFrom[c] + (target - car.latFrom[c]) * e
}

/* ---------- chiqish: Merkator metrlarida pozitsiya va yo‘nalish ---------- */
function at(l: Link, s: number, offset: number): [number, number, number] {
  const cum = l.cum
  let lo = 0
  let hi = cum.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (cum[mid] <= s) lo = mid
    else hi = mid
  }
  const seg = cum[hi] - cum[lo] || 1
  const f = Math.min(1, Math.max(0, (s - cum[lo]) / seg))
  const dx = l.xs[hi] - l.xs[lo]
  const dy = l.ys[hi] - l.ys[lo]
  const d = Math.hypot(dx, dy) || 1
  const o = offset / l.k // haqiqiy metrdan Merkator metriga
  // y pastga o‘sadi — yo‘nalishning o‘ng tomoni (−dy, dx)
  return [l.xs[lo] + dx * f + (-dy / d) * o, l.ys[lo] + dy * f + (dx / d) * o, Math.atan2(dy, dx)]
}

function post(stopped: number, ms: number) {
  let n = 0
  for (let c = 0; c < MAX_CARS; c++) n += car.alive[c]
  const cars = new Float32Array(MAX_CARS * CAR_STRIDE)
  for (let c = 0; c < MAX_CARS; c++) {
    const o = c * CAR_STRIDE
    if (!car.alive[c]) {
      cars[o + 3] = -1 // bo‘sh joy
      continue
    }
    const l = links[car.link[c]]
    const [x, y, h] = at(l, car.s[c], lateral(c, l))
    cars[o] = x
    cars[o + 1] = y
    cars[o + 2] = h
    cars[o + 3] = car.color[c]
    cars[o + 4] = car.gen[c]
    cars[o + 5] = car.v[c]
  }
  const sigLinks = links.filter((l) => l.signal)
  const signals = new Float32Array(sigLinks.length * SIGNAL_STRIDE)
  sigLinks.forEach((l, i) => {
    // chiroq — to‘xtash chizig‘ida, yo‘lning o‘ng chetida (trotuar ustida)
    const [x, y, h] = at(l, Math.max(0, l.len - l.stopBack), l.base + l.lanes * LANE_M + 1.6)
    signals.set([x, y, state(l.signal!), h], i * SIGNAL_STRIDE)
  })
  const msg: FromWorker = { type: 'frame', t, cars, signals, inspect: inspect >= 0 && car.alive[inspect] ? info(inspect) : null, stats: { cars: n, links: links.length, signals: clusters.length, stopped, ms: Math.round(ms * 100) / 100 } }
  postMessage(msg, [cars.buffer, signals.buffer])
}

/* tanlangan mashina haqida: nima qilyapti va nega */
function info(c: number): CarInfo {
  const l = links[car.link[c]]
  const nx = car.next[c]
  let turn: CarInfo['turn'] = 'end'
  if (nx >= 0) {
    const n = links[nx]
    // y pastga o‘sadi — musbat burchak soat strelkasi bo‘yicha, ya’ni o‘ngga
    const d = angleDiff(startAngle(n), endAngle(l))
    turn = n.to === l.from && n.road === l.road && n.tile === l.tile ? 'uturn' : Math.abs(d) < 0.45 ? 'straight' : d > 0 ? 'right' : 'left'
  }
  const toEnd = l.len - car.s[c]
  const signal = l.signal ? { state: state(l.signal), dist: Math.max(0, toEnd - l.stopBack) } : null
  const v = car.v[c]
  const a = car.acc[c]
  const st: CarInfo['state'] = v < 0.5 ? (signal && signal.state !== 2 && signal.dist < 60 ? 'red' : 'queue') : a > 0.3 ? 'accel' : a < -0.6 ? 'brake' : 'cruise'
  return {
    slot: c,
    gen: car.gen[c],
    speed: v * 3.6,
    limit: l.limit,
    road: l.name,
    hw: l.hw,
    lane: car.lane[c] + 1,
    lanes: l.lanes,
    state: st,
    turn,
    signal,
    wait: car.wait[c],
    odo: car.odo[c],
    color: car.color[c],
  }
}

/* ---------- boshqaruv ---------- */
function setRunning(on: boolean) {
  if (on === running) return
  running = on
  clearInterval(timer)
  if (on) timer = setInterval(step, DT * 1000) as unknown as number
}

onmessage = (e: MessageEvent<ToWorker>) => {
  const m = e.data
  if (m.type === 'tiles') {
    rebuild(m.tiles)
    fill()
  } else if (m.type === 'run') setRunning(m.running)
  else if (m.type === 'view') {
    setView(m.box, m.screen)
    fill()
  } else if (m.type === 'inspect') {
    inspect = m.slot
  } else if (m.type === 'density') {
    perLaneKm = m.perLaneKm
    fill()
  }
}

/// <reference lib="webworker" />
/* Mashinalar simulyatsiyasi (alohida oqimda — sahifa sekinlashmaydi).

   Grafik: har ko‘cha → yo‘nalishli “link”lar (ikki tomonlamada ikkita). Har link’da bo‘laklar;
   mashina bo‘lakdan chiqmaydi, chorrahada keyingi link’ning mos bo‘lagiga o‘tadi.
   Harakat — IDM (Intelligent Driver Model): oldidagi mashinaga yoki qizil svetoforning to‘xtash
   chizig‘iga qarab silliq tormozlaydi va tezlashadi.
   Svetoforlar — OSM’dagi highway=traffic_signals tugunlari: 35 m ichidagilar bitta chorraha;
   kiruvchi yo‘llar ikki o‘qqa (taxminan shimol–janub / g‘arb–sharq) bo‘linib, navbat bilan yashil oladi.
   Fazalar NAMUNAVIY — Toshkentning haqiqiy svetofor rejimlari ochiq manbada yo‘q. */
import type { Road, Tile } from '../roads'
import { LANE_M } from '../roads'
import { CAR_STRIDE, mercX, mercY, ORIGIN_X, ORIGIN_Y, SIGNAL_STRIDE, type FromWorker, type Rect, type ToWorker } from './protocol'

const DT = 0.05 // fizika qadami, s (20 Hz)
const MAX_CARS = 2500
const CAR_LEN = 4.5
const S0 = 2 // tirbandlikdagi minimal oraliq, m
const T_HEAD = 1.3 // xavfsiz vaqt oralig‘i, s
const A_MAX = 1.4 // tezlanish, m/s²
const B_COMF = 2.2 // qulay tormoz, m/s²
const STOP_BACK = 1.5 // to‘xtash chizig‘i link oxiridan, m
const CLUSTER_M = 35
const BLEND_M = 14 // chorrahadan keyin yangi bo‘lak o‘rtasiga silliq siljish masofasi

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
  out: number[]
  outW: number[]
  rev: number // o‘sha ko‘chaning qarama-qarshi yo‘nalishi (berk ko‘chada orqaga qaytish uchun), yo‘q bo‘lsa −1
  signal: Signal | null
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
}

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
  buildSignals()
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
  out.push({ id, road, tile, from, to, lanes: Math.max(1, lanes), base, xs, ys, cum, len: cum[n - 1], k, vmax: (Math.min(r.s, 70) / 3.6) * 0.92, out: [], outW: [], rev: -1, signal: null, box: [x0, y0, x1, y1] })
}

const startAngle = (l: Link) => Math.atan2(l.ys[1] - l.ys[0], l.xs[1] - l.xs[0])
const endAngle = (l: Link) => {
  const n = l.xs.length
  return Math.atan2(l.ys[n - 1] - l.ys[n - 2], l.xs[n - 1] - l.xs[n - 2])
}
const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

/* ---------- svetoforlar ---------- */
function buildSignals() {
  const nodes: { id: string; x: number; y: number; k: number }[] = []
  for (const tile of byTile.values())
    for (const [id, [lng, lat, sig]] of Object.entries(tile.nodes))
      if (sig) nodes.push({ id, x: mercX(lng) - ORIGIN_X, y: mercY(lat) - ORIGIN_Y, k: Math.cos((lat * Math.PI) / 180) })
  // yaqin svetofor tugunlari — bitta chorraha (ikki qatnov qismli ko‘chalarda har tomonida alohida tugun bo‘ladi)
  const parent = nodes.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++)
      if (Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) * nodes[i].k < CLUSTER_M) parent[find(i)] = find(j)
  const groups = new Map<number, string[]>()
  nodes.forEach((n, i) => (groups.get(find(i)) ?? groups.set(find(i), []).get(find(i))!).push(n.id))

  const incoming = new Map<string, Link[]>()
  for (const l of links) (incoming.get(l.to) ?? incoming.set(l.to, []).get(l.to)!).push(l)
  for (const l of links) l.signal = null
  clusters = []
  // fazalar siljishi chorraha tugunidan kelib chiqadi — xarita surilib qayta qurilganda ham o‘zgarmaydi
  const seed = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 9973, 7)
  for (const ids of groups.values()) {
    const inc = ids.flatMap((id) => incoming.get(id) ?? [])
    if (!inc.length) continue
    const ref = endAngle(inc[0])
    const cl: Cluster = { offset: seed(ids.sort()[0]) % 60, groups: 1, nodes: ids }
    for (const l of inc) {
      const d = Math.abs(angleDiff(endAngle(l), ref))
      const g = d < Math.PI / 4 || d > (3 * Math.PI) / 4 ? 0 : 1
      if (g === 1) cl.groups = 2
      l.signal = { cluster: cl, group: g }
    }
    clusters.push(cl)
  }
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
    car.alive[c] = 1
    car.link[c] = l.id
    car.lane[c] = (Math.random() * l.lanes) | 0
    car.s[c] = Math.random() * l.len
    car.v0[c] = l.vmax * (0.82 + Math.random() * 0.18)
    car.v[c] = car.v0[c] * 0.6
    car.next[c] = pickNext(l)
    car.color[c] = (Math.random() * 10) | 0
    car.gen[c]++
    car.latFrom[c] = l.base + (car.lane[c] + 0.5) * LANE_M
    return
  }
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
  const acc = new Float64Array(MAX_CARS)
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
        // qizil yoki (to‘xtay oladigan masofada) sariq — to‘xtash chizig‘ida “devor”
        if (l.signal) {
          const st = state(l.signal)
          if (st === 0 || (st === 1 && toEnd - STOP_BACK > (v * v) / (2 * B_COMF))) {
            gap = toEnd - STOP_BACK
            dv = v
          }
        }
        const nx = car.next[c]
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

  let stopped = 0
  for (let c = 0; c < MAX_CARS; c++) {
    if (!car.alive[c]) continue
    const v = Math.max(0, car.v[c] + acc[c] * DT)
    car.s[c] += Math.max(0, (car.v[c] + v) / 2) * DT
    car.v[c] = v
    if (v < 0.5) stopped++
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
  if (Math.round(t / DT) % 20 === 0) fill() // har soniyada zichlikni tiklash
  post(stopped, performance.now() - t0)
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
    // chiroq — to‘xtash chizig‘ida, yo‘lning o‘ng chetida
    const [x, y, h] = at(l, Math.max(0, l.len - STOP_BACK), l.base + l.lanes * LANE_M + 1)
    signals.set([x, y, state(l.signal!), h], i * SIGNAL_STRIDE)
  })
  const msg: FromWorker = { type: 'frame', t, cars, signals, stats: { cars: n, links: links.length, signals: clusters.length, stopped, ms: Math.round(ms * 100) / 100 } }
  postMessage(msg, [cars.buffer, signals.buffer])
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
  } else if (m.type === 'density') {
    perLaneKm = m.perLaneKm
    fill()
  }
}

import type { Axis, DashEvent, Emergency, Intersection, LatLng, Mode, Snapshot, Vehicle, Zone } from './types'

/* =========================================================
   Namunaviy shahar — backend tayyor bo‘lmaguncha dashboard shu bilan ishlaydi.
   Kontrakt (docs/dashboard-api.md) bilan bir xil shakldagi Snapshot qaytaradi.
   Haqiqiy Toshkent ko‘chalari (OSM), lekin trafik — simulyatsiya.
   ========================================================= */

type Road = { u: string; v: string; pts: LatLng[]; major: boolean }
export type CityData = { center: LatLng; roads: Road[]; intersections: { id: string; node: string; name: string; lat: number; lng: number }[] }

type Seg = { road: number; fwd: boolean }
type Car = { id: string; seg: Seg; s: number; v: number; type: Vehicle['type']; waitNow: number; path?: Seg[] }
type Signal = { phase: Axis; state: Intersection['state']; t: number; next: Axis; action: Intersection['action']; q: Intersection['q']; preempted: boolean }
type Shadow = { qNs: number; qEw: number; phase: Axis; t: number; waited: number; served: number; rate: [number, number] }

/* Moslashuvchan qoida (AI rejimi): navbat bo‘yicha almashadi, lekin har almashish
   sariq+qizil vaqtini yo‘qotishini hisobga olib, juda tez-tez almashmaydi */
const adaptiveFlip = (green: number, red: number, t: number) =>
  t > 10 && ((green === 0 && red >= 2) || red >= Math.max(5, 1.6 * green + 3) || (t > 50 && red > 0))

const VMAX = 11 // m/s ≈ 40 km/soat
const STOP_AT = 14 // to‘xtash chizig‘i chorraha tugunidan, m
const GAP = 8
const YELLOW = 3
const ALLRED = 1.5
const FIXED_GREEN = 30
const CAR_COUNT = 700
const DT = 0.25

const M_LAT = 110540
const mLng = (lat: number) => 111320 * Math.cos((lat * Math.PI) / 180)
const dist = (a: LatLng, b: LatLng) => Math.hypot((a[0] - b[0]) * M_LAT, (a[1] - b[1]) * mLng(a[0]))
const axisOf = (a: LatLng, b: LatLng): Axis => (Math.abs((b[0] - a[0]) * M_LAT) >= Math.abs((b[1] - a[1]) * mLng(a[0])) ? 'NS' : 'EW')
const poisson = (l: number) => {
  let k = 0
  let p = Math.exp(-l)
  let s = p
  const u = Math.random()
  while (u > s) {
    k++
    p *= l / k
    s += p
  }
  return k
}

export class MockCity {
  private roads: (Road & { len: number; cum: number[] })[]
  private majorRoads: number[]
  private adj = new Map<string, Seg[]>()
  private nodePos = new Map<string, LatLng>()
  private sigByNode = new Map<string, string>()
  private meta: CityData['intersections']
  private sig = new Map<string, Signal>()
  private shadowAi = new Map<string, Shadow>()
  private shadowFx = new Map<string, Shadow>()
  private cars: Car[] = []
  private waits: number[] = []
  private events: DashEvent[] = []
  private emergency: Emergency | null = null
  private ambulance: Car | null = null
  private mode: Mode = 'ai'
  private clock = 0
  private seq = 0

  constructor(data: CityData) {
    this.meta = data.intersections
    this.roads = data.roads.map((r) => {
      const cum = [0]
      for (let i = 1; i < r.pts.length; i++) cum.push(cum[i - 1] + dist(r.pts[i - 1], r.pts[i]))
      return { ...r, len: cum[cum.length - 1], cum }
    })
    this.majorRoads = this.roads.flatMap((r, i) => (r.major ? [i] : []))
    this.roads.forEach((r, i) => {
      this.nodePos.set(r.u, r.pts[0])
      this.nodePos.set(r.v, r.pts[r.pts.length - 1])
      if (!this.adj.has(r.u)) this.adj.set(r.u, [])
      if (!this.adj.has(r.v)) this.adj.set(r.v, [])
      this.adj.get(r.u)!.push({ road: i, fwd: true })
      this.adj.get(r.v)!.push({ road: i, fwd: false })
    })
    for (const m of this.meta) {
      // ikki qatnov qismli ko‘chalarda chorraha bir nechta OSM tugunidan iborat — 70 m ichidagilarning hammasi shu svetoforga bo‘ysunadi
      this.nodePos.forEach((p, id) => dist(p, [m.lat, m.lng]) < 70 && this.sigByNode.set(id, m.id))
      const phase: Axis = Math.random() < 0.5 ? 'NS' : 'EW'
      this.sig.set(m.id, { phase, state: 'green', t: Math.random() * 20, next: phase, action: 2, q: [0, 0, 0, 0], preempted: false })
      // har chorrahaning o‘z kelish oqimi: bir yo‘nalish asosiy, ikkinchisi kichikroq (mashina/s)
      const main = 0.14 + Math.random() * 0.06
      const minor = 0.08 + Math.random() * 0.05
      const rate: [number, number] = Math.random() < 0.5 ? [main, minor] : [minor, main]
      this.shadowAi.set(m.id, { qNs: 4, qEw: 4, phase, t: 0, waited: 0, served: 0, rate })
      this.shadowFx.set(m.id, { qNs: 4, qEw: 4, phase, t: 0, waited: 0, served: 0, rate })
    }
    for (let i = 0; i < CAR_COUNT; i++) this.cars.push(this.spawn(`T-${String(i + 1).padStart(3, '0')}`))
    for (let t = 0; t < 90; t += 1) this.tick(1) // bo‘sh boshlanmasin
    for (let t = 0; t < 600; t++) this.stepShadows() // 5 daqiqalik o‘rtacha boshidanoq barqaror bo‘lsin
    this.events = []
    this.log('mode', 'Simulyatsiya ishga tushdi · AI rejimi')
  }

  /* ---------------- tashqi API ---------------- */
  setMode(mode: Mode) {
    if (mode === this.mode) return
    this.mode = mode
    this.waits = []
    this.log('mode', mode === 'ai' ? 'Rejim: AI (DQN) boshqaruvi' : 'Rejim: fiks taymer (30 s)')
  }

  startEmergency(from: LatLng, to: LatLng): Emergency | null {
    this.cancelEmergency(false)
    const a = this.nearestNode(from)
    const b = this.nearestNode(to)
    const path = this.shortestPath(a, b)
    if (!path || !path.length) return null
    const amb: Car = { id: 'TEZ-01', seg: path[0], s: 0, v: 14, type: 'ambulance', waitNow: 0, path: path.slice(1) }
    this.ambulance = amb
    const route: LatLng[] = []
    const inters: string[] = []
    for (const seg of path) {
      const pts = this.segPts(seg)
      route.push(...(route.length ? pts.slice(1) : pts))
      const end = this.endNode(seg)
      const id = this.sigByNode.get(end)
      if (id && !inters.includes(id)) inters.push(id)
    }
    this.emergency = { id: `E-${++this.seq}`, route, intersections: inters, eta: 0, vehicleId: amb.id, }
    this.updateEta()
    this.log('emergency', `Tez yordam yo‘lga chiqdi · ${inters.length} ta chorraha yashil to‘lqinda`)
    return this.emergency
  }

  cancelEmergency(log = true) {
    if (!this.emergency) return
    this.emergency = null
    this.ambulance = null
    this.sig.forEach((s) => (s.preempted = false))
    if (log) this.log('emergency', 'Tez yordam marshruti bekor qilindi')
  }

  /* ---------------- simulyatsiya ---------------- */
  tick(seconds: number) {
    for (let t = 0; t < seconds; t += DT) this.step(DT)
  }

  private step(dt: number) {
    this.clock += dt
    this.controlSignals(dt)
    if (Math.floor(this.clock) !== Math.floor(this.clock - dt)) this.stepShadows()
    const lanes = new Map<string, Car[]>()
    const all = this.ambulance ? [...this.cars, this.ambulance] : this.cars
    for (const c of all) {
      const k = `${c.seg.road}:${c.seg.fwd}`
      if (!lanes.has(k)) lanes.set(k, [])
      lanes.get(k)!.push(c)
    }
    for (const lane of lanes.values()) {
      lane.sort((a, b) => b.s - a.s)
      lane.forEach((c, i) => this.move(c, lane[i - 1], dt))
    }
    if (this.ambulance && this.emergency) this.updateEta()
  }

  private move(c: Car, leader: Car | undefined, dt: number) {
    const road = this.roads[c.seg.road]
    const isAmb = c.type === 'ambulance'
    let target = isAmb ? 15 : road.major ? VMAX : VMAX * 0.75
    if (leader) target = Math.min(target, Math.max(0, (leader.s - c.s - GAP) * 1.2))
    const end = this.endNode(c.seg)
    const sigId = this.sigByNode.get(end)
    const toEnd = road.len - c.s
    if (sigId && !isAmb) {
      const s = this.sig.get(sigId)!
      const axis = this.approachAxis(c.seg)
      const go = s.phase === axis && (s.state === 'green' || (s.state === 'yellow' && toEnd - STOP_AT < 6))
      if (!go && toEnd > STOP_AT - 1) target = Math.min(target, Math.max(0, (toEnd - STOP_AT) * 1.1))
    }
    c.v += Math.max(-6 * dt, Math.min(3 * dt, target - c.v))
    if (c.v < 0.5 && sigId && toEnd < 90) c.waitNow += dt
    c.s += c.v * dt
    if (c.s >= road.len) {
      if (sigId && !isAmb) {
        this.waits.push(c.waitNow)
        if (this.waits.length > 400) this.waits.shift()
      }
      c.waitNow = 0
      const over = c.s - road.len
      const next = isAmb ? c.path?.shift() : this.pickNext(end, c.seg.road)
      if (!next) return isAmb ? this.finishEmergency() : this.respawn(c)
      c.seg = next
      c.s = over
    }
  }

  private controlSignals(dt: number) {
    const ambSeg = this.ambulance?.seg
    for (const m of this.meta) {
      const s = this.sig.get(m.id)!
      s.t += dt
      // tez yordam: marshrutdagi chorraha, mashina ~350 m ichida → majburiy yashil
      let force: Axis | null = null
      if (this.ambulance && ambSeg && this.emergency?.intersections.includes(m.id)) {
        const d = dist(this.carPos(this.ambulance), [m.lat, m.lng])
        if (d < 350) {
          const here = (p: Seg) => this.sigByNode.get(this.endNode(p)) === m.id
          const seg = here(ambSeg) ? ambSeg : this.ambulance.path?.find(here)
          if (seg) force = this.approachAxis(seg)
        }
      }
      s.preempted = !!force
      const [qNs, qEw] = this.queues(m.id)
      s.q = this.qValues(qNs, qEw)
      if (s.state === 'green') {
        const other: Axis = s.phase === 'NS' ? 'EW' : 'NS'
        const qG = s.phase === 'NS' ? qNs : qEw
        const qR = s.phase === 'NS' ? qEw : qNs
        let change = false
        if (force) change = force !== s.phase
        else if (this.mode === 'fixed') change = s.t >= FIXED_GREEN
        else change = adaptiveFlip(qG, qR, s.t)
        if (change) {
          s.state = 'yellow'
          s.t = 0
          s.next = force ?? other
        }
      } else if (s.state === 'yellow' && s.t >= YELLOW) {
        s.state = 'allred'
        s.t = 0
      } else if (s.state === 'allred' && s.t >= ALLRED) {
        s.state = 'green'
        s.t = 0
        s.phase = s.next
        const qn = s.phase === 'NS' ? qNs : qEw
        s.action = ((s.phase === 'NS' ? 0 : 1) + (qn > 6 ? 2 : 0)) as Intersection['action']
        if (Math.random() < 0.18) this.log('phase', `${m.name}: yashil ${s.phase} ga · navbat ${qn}`, m.id)
      }
    }
  }

  /* Adolatli taqqoslash: har chorrahada bir xil kelish oqimi bilan ikki “soya” navbat modeli */
  private stepShadows() {
    for (const m of this.meta) {
      const rate = this.shadowAi.get(m.id)!.rate
      const arr = [poisson(rate[0]), poisson(rate[1])] // ikkala model uchun AYNAN bir xil kelish
      for (const [sh, ai] of [[this.shadowAi.get(m.id)!, true], [this.shadowFx.get(m.id)!, false]] as const) {
        sh.qNs += arr[0]
        sh.qEw += arr[1]
        sh.t += 1
        const qG = sh.phase === 'NS' ? sh.qNs : sh.qEw
        const qR = sh.phase === 'NS' ? sh.qEw : sh.qNs
        const flip = ai ? adaptiveFlip(qG, qR, sh.t) : sh.t >= FIXED_GREEN
        if (flip) {
          sh.phase = sh.phase === 'NS' ? 'EW' : 'NS'
          sh.t = -(YELLOW + ALLRED) // oraliq — hech kim o‘tmaydi
        }
        if (sh.t > 0) {
          // yashil yo‘nalishdan o‘rtacha 0.55 mashina/s o‘tadi
          const pass = Math.random() < 0.55 ? Math.min(1, sh.phase === 'NS' ? sh.qNs : sh.qEw) : 0
          if (sh.phase === 'NS') sh.qNs -= pass
          else sh.qEw -= pass
          sh.served += pass
        }
        sh.waited += sh.qNs + sh.qEw
        // 5 daqiqalik sirpanuvchi oyna
        sh.waited *= 299 / 300
        sh.served *= 299 / 300
      }
    }
  }

  /* ---------------- yordamchilar ---------------- */
  private queues(intersectionId: string): [number, number] {
    let ns = 0
    let ew = 0
    for (const c of this.cars) {
      if (c.v > 1 || this.sigByNode.get(this.endNode(c.seg)) !== intersectionId) continue
      if (this.roads[c.seg.road].len - c.s > 90) continue
      if (this.approachAxis(c.seg) === 'NS') ns++
      else ew++
    }
    return [ns, ew]
  }

  /* DQN’ga o‘xshash ko‘rgazmali baho: harakatdan keyingi navbat bo‘yicha mukofot (notebookdagi formula) */
  private qValues(ns: number, ew: number): Intersection['q'] {
    const r = (a: number, b: number) => 10 - 0.5 * (a + b) - 0.3 * Math.abs(a - b)
    const opts: [number, number][] = [[4, 0], [0, 4], [8, 0], [0, 8]]
    return opts.map(([pn, pe]) => +r(Math.max(0, ns - pn) + 1, Math.max(0, ew - pe) + 1).toFixed(1)) as Intersection['q']
  }

  private segPts(seg: Seg) {
    const p = this.roads[seg.road].pts
    return seg.fwd ? p : [...p].reverse()
  }
  private endNode(seg: Seg) {
    const r = this.roads[seg.road]
    return seg.fwd ? r.v : r.u
  }
  private approachAxis(seg: Seg): Axis {
    const p = this.segPts(seg)
    return axisOf(p[Math.max(0, p.length - 2)], p[p.length - 1])
  }
  private pickNext(node: string, from: number): Seg | undefined {
    const opts = (this.adj.get(node) ?? []).filter((s) => s.road !== from)
    if (!opts.length) return undefined
    const major = opts.filter((s) => this.roads[s.road].major)
    const pool = major.length && Math.random() < 0.7 ? major : opts
    return pool[Math.floor(Math.random() * pool.length)]
  }
  private spawn(id: string): Car {
    // ko‘pchilik mashina asosiy ko‘chalarda paydo bo‘ladi
    const pool = Math.random() < 0.75 ? this.majorRoads : null
    const road = pool ? pool[Math.floor(Math.random() * pool.length)] : Math.floor(Math.random() * this.roads.length)
    const r = Math.random()
    return {
      id,
      seg: { road, fwd: Math.random() < 0.5 },
      s: Math.random() * this.roads[road].len,
      v: VMAX * 0.6,
      type: r < 0.08 ? 'bus' : r < 0.14 ? 'truck' : 'car',
      waitNow: 0,
    }
  }
  private respawn(c: Car) {
    Object.assign(c, this.spawn(c.id))
  }
  private carPos(c: Car): LatLng {
    const r = this.roads[c.seg.road]
    const s = c.seg.fwd ? c.s : r.len - c.s
    let i = 1
    while (i < r.cum.length - 1 && r.cum[i] < s) i++
    const k = Math.min(1, Math.max(0, (s - r.cum[i - 1]) / (r.cum[i] - r.cum[i - 1] || 1)))
    const a = r.pts[i - 1]
    const b = r.pts[i]
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]
  }
  private heading(c: Car) {
    const p = this.segPts(c.seg)
    const a = p[0]
    const b = p[p.length - 1]
    return (Math.atan2((b[1] - a[1]) * mLng(a[0]), (b[0] - a[0]) * M_LAT) * 180) / Math.PI
  }
  private nearestNode(p: LatLng) {
    let best = ''
    let bd = Infinity
    this.nodePos.forEach((q, id) => {
      const d = dist(p, q)
      if (d < bd) {
        bd = d
        best = id
      }
    })
    return best
  }
  private shortestPath(a: string, b: string): Seg[] | null {
    const d = new Map<string, number>([[a, 0]])
    const prev = new Map<string, { node: string; seg: Seg }>()
    const open = new Set([a])
    while (open.size) {
      let u = ''
      let best = Infinity
      open.forEach((n) => {
        if ((d.get(n) ?? Infinity) < best) {
          best = d.get(n)!
          u = n
        }
      })
      open.delete(u)
      if (u === b) break
      for (const seg of this.adj.get(u) ?? []) {
        const v = this.endNode(seg)
        const nd = best + this.roads[seg.road].len
        if (nd < (d.get(v) ?? Infinity)) {
          d.set(v, nd)
          prev.set(v, { node: u, seg })
          open.add(v)
        }
      }
    }
    if (!prev.has(b)) return null
    const path: Seg[] = []
    for (let n = b; n !== a; n = prev.get(n)!.node) path.unshift(prev.get(n)!.seg)
    return path
  }
  private updateEta() {
    const amb = this.ambulance!
    let rest = this.roads[amb.seg.road].len - amb.s
    for (const s of amb.path ?? []) rest += this.roads[s.road].len
    this.emergency!.eta = Math.round(rest / 14)
  }
  private finishEmergency() {
    this.log('emergency', 'Tez yordam manzilga yetib keldi')
    this.cancelEmergency(false)
  }
  private log(kind: DashEvent['kind'], text: string, intersectionId?: string) {
    this.events.unshift({ id: `ev-${++this.seq}`, t: new Date().toISOString(), kind, text, intersectionId })
    this.events.length = Math.min(this.events.length, 20)
  }

  /* ---------------- Snapshot ---------------- */
  snapshot(): Snapshot {
    const all = this.ambulance ? [...this.cars, this.ambulance] : this.cars
    const vehicles: Vehicle[] = all.map((c) => {
      const [lat, lng] = this.carPos(c)
      return { id: c.id, lat, lng, heading: this.heading(c), speed: Math.round(c.v * 3.6), type: c.type, emergency: c.type === 'ambulance' }
    })
    const intersections: Intersection[] = this.meta.map((m) => {
      const s = this.sig.get(m.id)!
      const [ns, ew] = this.queues(m.id)
      const sa = this.shadowAi.get(m.id)!
      const remaining = s.state === 'yellow' ? YELLOW - s.t : s.state === 'allred' ? ALLRED - s.t : this.mode === 'fixed' ? FIXED_GREEN - s.t : Math.max(0, 10 - s.t) // AI: minimal yashilgacha; keyin navbatga qarab
      return {
        id: m.id, name: m.name, lat: m.lat, lng: m.lng,
        phase: s.phase, state: s.state, remaining: Math.max(0, Math.round(remaining)),
        queue: { ns, ew }, wait: +(sa.served ? sa.waited / sa.served : 0).toFixed(1),
        action: s.action, q: s.q, preempted: s.preempted,
      }
    })
    const zones: Zone[] = intersections
      .filter((x) => x.queue.ns + x.queue.ew >= 5)
      .map((x) => {
        const n = x.queue.ns + x.queue.ew
        return { id: `Z-${x.id}`, lat: x.lat, lng: x.lng, radius: 70 + n * 9, count: n, level: n >= 12 ? 'heavy' : n >= 8 ? 'moderate' : 'light' }
      })
    const avg = (sh: Map<string, Shadow>) => {
      let w = 0
      let s = 0
      sh.forEach((x) => ((w += x.waited), (s += x.served)))
      return s ? +(w / s).toFixed(1) : 0
    }
    const avgWaitAi = avg(this.shadowAi)
    const avgWaitFixed = avg(this.shadowFx)
    const moving = vehicles.filter((v) => !v.emergency)
    const totalQ = intersections.reduce((a, x) => a + x.queue.ns + x.queue.ew, 0)
    return {
      t: new Date().toISOString(),
      mode: this.mode,
      stats: {
        vehicles: moving.length,
        avgSpeed: Math.round(moving.reduce((a, v) => a + v.speed, 0) / Math.max(1, moving.length)),
        avgWait: this.mode === 'ai' ? avgWaitAi : avgWaitFixed,
        avgWaitAi,
        avgWaitFixed,
        congestion: Math.min(100, Math.round((totalQ / Math.max(1, moving.length)) * 260)),
      },
      vehicles,
      intersections,
      zones,
      emergency: this.emergency ? { ...this.emergency } : null,
      events: [...this.events],
    }
  }
}

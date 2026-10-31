import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/* =========================================================
   OQIM — 3D chorraha: “loy” uslubidagi sahna + kichik trafik simulyatsiyasi.
   Svetofor boshqaruvchisi ikki rejimda: AI (navbatga qaraydi) va Fiks (soat bo‘yicha).
   ========================================================= */

export type Mode = 'ai' | 'fixed'
export type Axis = 'NS' | 'EW'
export type Stats = {
  mode: Mode
  green: Axis
  state: 'green' | 'yellow' | 'allred'
  qNS: number
  qEW: number
  avgWait: number
  ambulance: Axis | null
}

const C = {
  bg: 0xefe9e1,
  ground: 0xe8e0d5,
  road: 0x4a4541,
  mark: 0xf4efe9,
  walk: 0xf6f1eb,
  buildings: [0xf4efe9, 0xe9e1d6, 0xddd2c4, 0xf2cdb8, 0xd3c7b8],
  trees: [0xaebf98, 0x9db089, 0xbac8a6],
  cars: [0x0c0b0a, 0xf4efe9, 0xd9714a, 0xf2a07b, 0x8a6a55, 0xffffff, 0x2a2230, 0xd9714a],
  glass: 0x2b2a2e,
  red: 0xe5534b,
  amber: 0xf0a43a,
  green: 0x4cc38a,
}

const ROAD_HALF = 7 // yo‘l yarim kengligi
const STOP = 10.5 // to‘xtash chizig‘i markazdan
const LANE = 3 // bo‘lak markazi o‘qdan
const L = 95 // paydo bo‘lish / yo‘qolish masofasi
const VMAX = 11 // m/s ≈ 40 km/soat
const MIN_GREEN = 5
const FIXED_GREEN = 14
const YELLOW = 2.4
const ALLRED = 1.1

/* deterministik tasodif — har safar bir xil shahar */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

type Lane = { axis: Axis; dir: 1 | -1; rate: number; next: number }
type Car = {
  lane: Lane
  s: number
  v: number
  len: number
  wait: number
  amb: boolean
  mesh: THREE.Group
  flash?: THREE.MeshStandardMaterial
}

export function createCityScene(container: HTMLElement, onStats: (s: Stats) => void) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const small = container.clientWidth < 760

  /* ---------- renderer / sahna / kamera ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.touchAction = 'pan-y'
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(C.bg)
  scene.fog = new THREE.Fog(C.bg, 130, 260)

  const camera = new THREE.PerspectiveCamera(30, 1, 1, 600)

  scene.add(new THREE.HemisphereLight(0xfff6ee, 0xd9cfc2, 1.25))
  const sun = new THREE.DirectionalLight(0xfff1e0, 2.3)
  sun.position.set(45, 85, 25)
  sun.castShadow = true
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048)
  const sc = sun.shadow.camera
  sc.left = -75; sc.right = 75; sc.top = 75; sc.bottom = -75; sc.near = 10; sc.far = 220
  sun.shadow.bias = -0.0004
  sun.shadow.radius = 4
  scene.add(sun)

  const std = (color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra })
  // statik obyektlar uchun bitta rangga bitta material — keyin birlashtirish mumkin bo‘ladi
  const matCache = new Map<number, THREE.MeshStandardMaterial>()
  const shared = (color: number) => {
    if (!matCache.has(color)) matCache.set(color, std(color))
    return matCache.get(color)!
  }
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, shadow = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    m.position.set(x, y, z)
    m.receiveShadow = true
    m.castShadow = shadow
    scene.add(m)
    return m
  }

  /* ---------- yer, yo‘llar, belgilar ---------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), std(C.ground))
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  const roadMat = std(C.road, { roughness: 0.95 })
  box(ROAD_HALF * 2, 0.1, 400, roadMat, 0, 0.05, 0, false)
  box(400, 0.1, ROAD_HALF * 2, roadMat, 0, 0.05, 0, false)

  const markMat = std(C.mark, { roughness: 0.6 })
  for (let s = 16; s < 200; s += 7) {
    for (const sign of [1, -1]) {
      box(0.35, 0.02, 3.2, markMat, 0, 0.11, sign * s, false) // NS o‘rta chiziq
      box(3.2, 0.02, 0.35, markMat, sign * s, 0.11, 0, false) // EW o‘rta chiziq
    }
  }
  for (const sign of [1, -1]) {
    // zebra
    for (let i = -5; i <= 5; i++) {
      if (i === 0) continue
      box(0.9, 0.02, 2.6, markMat, i * 1.25, 0.11, sign * 8.6, false)
      box(2.6, 0.02, 0.9, markMat, sign * 8.6, 0.11, i * 1.25, false)
    }
    // to‘xtash chiziqlari — o‘ng tomonlama harakat: kiruvchi bo‘lak oldida
    box(ROAD_HALF, 0.02, 0.45, markMat, sign * ROAD_HALF / 2, 0.11, sign * STOP, false)
    box(0.45, 0.02, ROAD_HALF, markMat, -sign * STOP, 0.11, sign * ROAD_HALF / 2, false)
  }

  /* ---------- bloklar: trotuar, binolar, daraxtlar ---------- */
  const rand = rng(7)
  const walkMat = std(C.walk)
  const blockGeo = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 3, r)
  for (const qx of [1, -1]) {
    for (const qz of [1, -1]) {
      const x0 = qx * (ROAD_HALF + 46), z0 = qz * (ROAD_HALF + 46)
      const walk = new THREE.Mesh(blockGeo(90, 0.5, 90, 0.25), walkMat)
      walk.position.set(x0, 0.25, z0)
      walk.receiveShadow = true
      scene.add(walk)
      // binolar
      const n = 4 + Math.floor(rand() * 3)
      for (let i = 0; i < n; i++) {
        const w = 8 + rand() * 9, d = 8 + rand() * 9, h = 4 + rand() * (i === 0 ? 16 : 9)
        const bx = qx * (ROAD_HALF + 9 + w / 2 + rand() * 30), bz = qz * (ROAD_HALF + 9 + d / 2 + rand() * 30)
        const b = new THREE.Mesh(blockGeo(w, h, d, 0.9), shared(C.buildings[Math.floor(rand() * C.buildings.length)]))
        b.position.set(bx, 0.5 + h / 2, bz)
        b.castShadow = b.receiveShadow = true
        scene.add(b)
      }
      // daraxtlar yo‘l bo‘yida
      for (let k = 0; k < 7; k++) {
        const along = ROAD_HALF + 6 + k * 6.5 + rand() * 2
        for (const [tx, tz] of [[qx * (ROAD_HALF + 3.2), qz * along], [qx * along, qz * (ROAD_HALF + 3.2)]]) {
          if (rand() < 0.25) continue
          const r = 1.3 + rand() * 0.7
          const crown = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), shared(C.trees[Math.floor(rand() * 3)]))
          crown.position.set(tx, 0.5 + 1.6 + r, tz)
          crown.castShadow = true
          scene.add(crown)
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.8, 8), shared(0x8a6a55))
          trunk.position.set(tx, 1.4, tz)
          trunk.castShadow = true
          scene.add(trunk)
        }
      }
    }
  }

  /* ---------- unumdorlik: harakatsiz obyektlarni material bo‘yicha bitta geometriyaga birlashtiramiz
     (~500 chizish chaqiruvi → ~15) ---------- */
  {
    const groups = new Map<string, THREE.Mesh[]>()
    for (const o of scene.children.slice()) {
      if (!(o instanceof THREE.Mesh) || o === ground) continue
      const key = `${(o.material as THREE.Material).uuid}|${o.castShadow}|${o.receiveShadow}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(o)
    }
    for (const meshes of groups.values()) {
      if (meshes.length < 2) continue
      const geos = meshes.map((m) => {
        m.updateMatrix()
        const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
        for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k)
        g.applyMatrix4(m.matrix)
        return g
      })
      const merged = mergeGeometries(geos, false)
      geos.forEach((g) => g.dispose())
      if (!merged) continue
      const one = new THREE.Mesh(merged, meshes[0].material)
      one.castShadow = meshes[0].castShadow
      one.receiveShadow = meshes[0].receiveShadow
      for (const m of meshes) {
        scene.remove(m)
        m.geometry.dispose()
      }
      scene.add(one)
    }
  }

  /* ---------- svetoforlar ---------- */
  type Head = { axis: Axis; lamps: THREE.MeshStandardMaterial[]; glows: THREE.Mesh[] }
  const heads: Head[] = []
  const poleMat = std(0x2a2622, { roughness: 0.6 })
  const lampColors = [C.red, C.amber, C.green]
  const corners: [number, number, Axis][] = [
    [ROAD_HALF + 1.2, ROAD_HALF + 1.2, 'NS'],
    [-ROAD_HALF - 1.2, -ROAD_HALF - 1.2, 'NS'],
    [-ROAD_HALF - 1.2, ROAD_HALF + 1.2, 'EW'],
    [ROAD_HALF + 1.2, -ROAD_HALF - 1.2, 'EW'],
  ]
  for (const [x, z, axis] of corners) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 6, 10), poleMat)
    pole.position.set(x, 3.5, z)
    pole.castShadow = true
    scene.add(pole)
    const head = new THREE.Mesh(new RoundedBoxGeometry(1.35, 3.5, 1.35, 3, 0.45), poleMat)
    head.position.set(x, 7.9, z)
    head.castShadow = true
    scene.add(head)
    const glows: THREE.Mesh[] = []
    const lamps = lampColors.map((c, i) => {
      const mat = new THREE.MeshStandardMaterial({ color: 0x1a1816, emissive: c, emissiveIntensity: 0.05, roughness: 0.4 })
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.46, 18, 14), mat)
      lamp.position.set(x, 9.0 - i * 1.1, z)
      lamp.scale.set(1.18, 1, 1.18)
      scene.add(lamp)
      // yonayotgan chiroq atrofidagi yumshoq nur
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(1.25, 18, 14),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending }),
      )
      glow.position.copy(lamp.position)
      glow.visible = false
      scene.add(glow)
      glows.push(glow)
      return mat
    })
    heads.push({ axis, lamps, glows })
  }

  /* ---------- mashinalar ---------- */
  const lanes: Lane[] = [
    { axis: 'NS', dir: 1, rate: 0.42, next: 0 },
    { axis: 'NS', dir: -1, rate: 0.42, next: 0.6 },
    { axis: 'EW', dir: 1, rate: 0.3, next: 1.1 },
    { axis: 'EW', dir: -1, rate: 0.3, next: 1.7 },
  ]
  const bodyGeo = new RoundedBoxGeometry(4.4, 1.25, 2.05, 4, 0.5)
  const cabinGeo = new RoundedBoxGeometry(2.3, 1.0, 1.8, 4, 0.42)
  const glassMat = std(C.glass, { roughness: 0.25 })
  const carMats = C.cars.map((c) => std(c, { roughness: 0.5 }))
  const cars: Car[] = []

  function makeCar(amb: boolean) {
    const g = new THREE.Group()
    const body = new THREE.Mesh(bodyGeo, amb ? std(0xffffff, { roughness: 0.45 }) : carMats[Math.floor(Math.random() * carMats.length)])
    body.position.y = 0.95
    body.castShadow = true
    g.add(body)
    const cabin = new THREE.Mesh(cabinGeo, glassMat)
    cabin.position.set(-0.25, 1.95, 0)
    cabin.castShadow = true
    g.add(cabin)
    let flash: THREE.MeshStandardMaterial | undefined
    if (amb) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.45, 0.28, 2.1), std(C.red))
      stripe.position.y = 1.05
      g.add(stripe)
      flash = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: C.red, emissiveIntensity: 2 })
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 1.3), flash)
      bar.position.set(-0.2, 2.55, 0)
      g.add(bar)
    }
    scene.add(g)
    return { g, flash }
  }

  function spawn(lane: Lane, amb = false) {
    const last = cars.filter((c) => c.lane === lane).sort((a, b) => a.s - b.s)[0]
    if (last && last.s - last.len / 2 < -L + 9) return false // joy yo‘q
    const { g, flash } = makeCar(amb)
    const car: Car = { lane, s: -L, v: VMAX * 0.8, len: 4.4, wait: 0, amb, mesh: g, flash }
    cars.push(car)
    place(car)
    return true
  }

  function place(car: Car) {
    const { lane, s, mesh } = car
    if (lane.axis === 'NS') {
      mesh.position.set(lane.dir === 1 ? -LANE : LANE, 0, s * lane.dir)
      mesh.rotation.y = lane.dir === 1 ? -Math.PI / 2 : Math.PI / 2
    } else {
      mesh.position.set(s * lane.dir, 0, lane.dir === 1 ? LANE : -LANE)
      mesh.rotation.y = lane.dir === 1 ? 0 : Math.PI
    }
  }

  /* ---------- svetofor boshqaruvchisi ---------- */
  let mode: Mode = 'ai'
  const sig = { green: 'NS' as Axis, state: 'green' as 'green' | 'yellow' | 'allred', t: 0, nextGreen: 'EW' as Axis }
  const waits: number[] = []

  const front = (c: Car) => c.s + c.len / 2
  const queue = (axis: Axis) =>
    cars.filter((c) => c.lane.axis === axis && c.v < 1 && front(c) < -STOP + 0.5 && front(c) > -STOP - 75).length
  const ambulanceAxis = (): Axis | null => {
    const a = cars.find((c) => c.amb && front(c) < -STOP + 1 && front(c) > -STOP - 85)
    return a ? a.lane.axis : null
  }

  function controller(dt: number) {
    sig.t += dt
    const amb = ambulanceAxis()
    if (sig.state === 'green') {
      const other: Axis = sig.green === 'NS' ? 'EW' : 'NS'
      let change = false
      if (amb) change = amb !== sig.green // tez yordam: yashil to‘lqin
      else if (mode === 'fixed') change = sig.t > FIXED_GREEN
      else {
        const qG = queue(sig.green), qR = queue(other)
        change = sig.t > MIN_GREEN && (qR >= qG + 3 || (qG === 0 && qR > 0) || (sig.t > 26 && qR > 0))
      }
      if (change) {
        sig.state = 'yellow'
        sig.t = 0
        sig.nextGreen = amb ?? other
      }
    } else if (sig.state === 'yellow' && sig.t > YELLOW) {
      sig.state = 'allred'
      sig.t = 0
    } else if (sig.state === 'allred' && sig.t > ALLRED) {
      sig.state = 'green'
      sig.green = sig.nextGreen
      sig.t = 0
    }
  }

  function lampsUpdate(time: number) {
    for (const h of heads) {
      const active = h.axis === sig.green ? (sig.state === 'green' ? 2 : sig.state === 'yellow' ? 1 : 0) : 0
      h.lamps.forEach((m, i) => (m.emissiveIntensity = i === active ? 3.4 : 0.05))
      h.glows.forEach((g, i) => (g.visible = i === active))
    }
    for (const c of cars) if (c.flash) c.flash.emissiveIntensity = Math.sin(time * 14) > 0 ? 3 : 0.2
  }

  /* ---------- simulyatsiya qadami ---------- */
  let ambTimer = 9
  function step(dt: number) {
    controller(dt)
    for (const lane of lanes) {
      lane.next -= dt
      if (lane.next <= 0) {
        spawn(lane)
        lane.next = -Math.log(1 - Math.random()) / lane.rate
      }
    }
    ambTimer -= dt
    if (ambTimer <= 0 && !cars.some((c) => c.amb)) {
      if (spawn(lanes[Math.floor(Math.random() * lanes.length)], true)) ambTimer = 26 + Math.random() * 10
      else ambTimer = 2
    }

    for (const lane of lanes) {
      const ls = cars.filter((c) => c.lane === lane).sort((a, b) => b.s - a.s) // oldindagi birinchi
      ls.forEach((car, i) => {
        let target = car.amb ? VMAX * 1.25 : VMAX
        const leader = ls[i - 1]
        if (leader) {
          const gap = leader.s - leader.len / 2 - front(car)
          target = Math.min(target, Math.max(0, (gap - 2.5) * 1.3))
        }
        const d = -STOP - front(car) // to‘xtash chizig‘igacha
        const green = sig.green === car.lane.axis && sig.state === 'green'
        const yellowGo = sig.green === car.lane.axis && sig.state === 'yellow' && d < 7
        if (d > -0.5 && !green && !yellowGo) target = Math.min(target, Math.max(0, (d - 0.3) * 1.4))
        const acc = target > car.v ? 4.5 : 14
        car.v += THREE.MathUtils.clamp(target - car.v, -acc * dt, acc * dt)
        car.s += car.v * dt
        if (car.v < 0.5 && d > 0) car.wait += dt
        place(car)
      })
    }
    for (let i = cars.length - 1; i >= 0; i--) {
      const c = cars[i]
      if (c.s > L) {
        if (!c.amb) {
          waits.push(c.wait)
          if (waits.length > 40) waits.shift()
        }
        scene.remove(c.mesh)
        c.mesh.traverse((o) => {
          if (o instanceof THREE.Mesh && o.material !== glassMat && !carMats.includes(o.material)) (o.material as THREE.Material).dispose()
        })
        cars.splice(i, 1)
      }
    }
  }

  // sahna bo‘sh boshlanmasin — 40 soniya oldindan aylantiramiz
  for (let t = 0; t < 40; t += 1 / 30) step(1 / 30)

  /* ---------- kamera: sudrab aylantirish (spring), hover parallaks ---------- */
  const cam = { az: Math.PI / 4, el: 0.95, azT: Math.PI / 4, elT: 0.95, r: small ? 150 : 128, px: 0, py: 0 }
  let drag: { x: number; y: number; az: number; el: number } | null = null
  const el = renderer.domElement
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return // telefonda sahifa scroll’i ustun
    drag = { x: e.clientX, y: e.clientY, az: cam.azT, el: cam.elT }
    el.setPointerCapture(e.pointerId)
    el.style.cursor = 'grabbing'
  }
  const onMove = (e: PointerEvent) => {
    const r = el.getBoundingClientRect()
    cam.px = (e.clientX - r.left) / r.width - 0.5
    cam.py = (e.clientY - r.top) / r.height - 0.5
    if (!drag) return
    cam.azT = drag.az - (e.clientX - drag.x) * 0.006
    cam.elT = THREE.MathUtils.clamp(drag.el + (e.clientY - drag.y) * 0.004, 0.55, 1.25)
  }
  const onUp = () => {
    drag = null
    el.style.cursor = 'grab'
  }
  el.style.cursor = 'grab'
  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onUp)
  el.addEventListener('pointerleave', () => ((cam.px = 0), (cam.py = 0)))

  function updateCamera(dt: number) {
    if (!drag && !reduce) cam.azT += dt * 0.025 // juda sekin o‘z-o‘zidan aylanish
    const k = 1 - Math.exp(-dt * 7) // kritik so‘nishga yaqin silliqlash
    cam.az += (cam.azT + cam.px * 0.12 - cam.az) * k
    cam.el += (cam.elT - cam.py * 0.06 - cam.el) * k
    const sinE = Math.sin(cam.el)
    camera.position.set(cam.r * sinE * Math.cos(cam.az), cam.r * Math.cos(cam.el), cam.r * sinE * Math.sin(cam.az))
    camera.lookAt(0, 0, 0)
  }

  /* ---------- o‘lcham ---------- */
  function resize() {
    const w = container.clientWidth, h = container.clientHeight
    renderer.setSize(w, h)
    camera.aspect = w / h
    if (w > 900) camera.setViewOffset(w, h, -w * 0.17, h * 0.02, w, h) // sahna o‘ngga: chapda matn uchun joy
    else camera.setViewOffset(w, h, 0, -h * 0.12, w, h) // telefonda pastroqqa
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(container)
  resize()

  /* ---------- sikl (ko‘rinmasa to‘xtaydi) ---------- */
  const emit = () =>
    onStats({
      mode,
      green: sig.green,
      state: sig.state,
      qNS: queue('NS'),
      qEW: queue('EW'),
      avgWait: waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0,
      ambulance: ambulanceAxis(),
    })
  let raf = 0, last = performance.now(), visible = true, statT = 0
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    step(dt)
    lampsUpdate(now / 1000)
    updateCamera(dt)
    renderer.render(scene, camera)
    statT += dt
    if (statT > 0.25) {
      statT = 0
      emit()
    }
    raf = requestAnimationFrame(loop)
  }
  const start = () => {
    if (raf || !visible || document.hidden) return
    last = performance.now()
    raf = requestAnimationFrame(loop)
  }
  const stop = () => {
    cancelAnimationFrame(raf)
    raf = 0
  }
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    if (visible) start()
    else stop()
  })
  io.observe(container)
  const onVis = () => (document.hidden ? stop() : start())
  document.addEventListener('visibilitychange', onVis)
  lampsUpdate(0)
  updateCamera(1)
  renderer.render(scene, camera)
  emit() // panel birinchi kadrdanoq to‘la bo‘lsin
  start()

  return {
    setMode(m: Mode) {
      if (m === mode) return
      mode = m
      waits.length = 0 // yangi rejim o‘lchovi noldan
    },
    dispose() {
      stop()
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          mats.forEach((m) => m.dispose())
        }
      })
      renderer.dispose()
      el.remove()
    },
  }
}

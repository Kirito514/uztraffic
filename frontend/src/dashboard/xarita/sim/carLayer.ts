import type { CustomLayerInterface, Map as MLMap, PointLike } from 'maplibre-gl'
import { CAR_STRIDE, EARTH, MARK_STRIDE, mercX, mercY, ORIGIN_X, ORIGIN_Y, SIGNAL_STRIDE, type Frame } from './protocol'

/* Mashinalar va svetofor chiroqlari — maplibre ichidagi bitta WebGL2 qatlam.
   Har mashina — instanced to‘rtburchak, shakli (yumaloq kuzov, old/orqa oyna) fragment shader’da chiziladi:
   2500 mashina = bitta draw call. Simulyatsiya 20 Hz’da keladi; ekranda oxirgi ikki kadr orasida
   interpolyatsiya qilinadi (silliq harakat), qayta chizish ~30 fps bilan cheklangan. */

const K = Math.cos((41.31 * Math.PI) / 180) // haqiqiy metr → Merkator metri
const CAR = [4.5 / K, 1.85 / K] // uzunlik, kenglik (Merkator metrida)
const HEAD = [0.9 / K, 2.6 / K] // svetofor korpusi: yo‘l bo‘ylab, ko‘ndalang (Merkator metrida)
const MARKS_FROM = 16 // yerdagi chiziqlar shu zoomdan yaqinda
const HEADS_FROM = 15.5 // svetofor chiroqlari shu zoomdan yaqinda (uzoqda xaritani to‘ldirib yubormasin)
const MIN_PX = 6 // uzoqroqda ham mashina kamida shuncha piksel

// Toshkent ko‘chalari: oq/kumush ko‘p, qolganlari kamroq
export const CAR_COLORS = ['#f4f3ef', '#eceae5', '#c3c6ca', '#f7f7f5', '#a9adb3', '#2b2c30', '#6b6f75', '#2f4b6e', '#a8382f', '#c8b69a']
const PALETTE = CAR_COLORS.map(hex)
const DARK = [0.09, 0.09, 0.1] // g‘ildiraklar va mashina osti
const FLOATS = 8 // x, y, yo‘nalish, uzunlik, kenglik, r, g, b … + tur (pastda alohida)
const BOX = 12 // 3D quti: x, y, yo‘nalish, uzunlik, kenglik, pastki z, yuqori z, r, g, b, tur, (bo‘sh)
const SOLID_FROM = 16 // xarita qiyshaytirilganda (3D) shu zoomdan yaqinda mashina va svetoforlar hajmli
// 3D mashina qismlari (haqiqiy metr): [uzunlik, kenglik, pastki z, yuqori z, oldinga siljish, tur]
// tur: 0 kuzov rangi, 1 kabina (yon tomoni oyna, tomi kuzov rangida), 2 qora (g‘ildirak/osti)
const CAR_PARTS: [number, number, number, number, number, number][] = [
  [3.7, 1.95, 0.0, 0.42, 0, 2],
  [4.5, 1.85, 0.3, 0.95, 0, 0],
  [2.3, 1.62, 0.95, 1.45, -0.3, 1],
]

const VS = `#version 300 es
in vec2 a_corner;
in vec3 a_pose;     // x, y (Merkator metri, boshlang‘ichga nisbatan), yo‘nalish
in vec2 a_size;     // bo‘yi (yo‘l bo‘ylab), eni
in vec4 a_color;    // rgb + tur: 0 mashina, 1.x svetofor (x — holat), 2 tanlangan mashina, 3 to‘xtash chizig‘i, 4 zebra, 5 yo‘l ber,
                    // 6 faqat tanlov halqasi (3D’da), 7 mashina soyasi (3D’da)
uniform mat4 u_matrix;
uniform float u_scale;
out vec2 v_local;
out vec2 v_half;
out vec4 v_color;
out float v_scale;
void main() {
  // yerdagi chiziqlar haqiqiy o‘lchamda; mashina va svetofor uzoqda ham ko‘rinsin deb kattalashtiriladi
  float sc = a_color.a > 2.5 ? 1.0 : u_scale;
  vec2 half_ = a_size * 0.5 * sc;
  bool ring = (a_color.a > 1.5 && a_color.a < 2.5) || (a_color.a > 5.5 && a_color.a < 6.5);
  float margin = ring ? 2.2 : a_color.a > 6.5 ? 1.2 : 0.6; // halqa va soya uchun kuzovdan tashqarida joy
  vec2 p = a_corner * (half_ + margin * sc);
  float c = cos(a_pose.z), s = sin(a_pose.z);
  vec2 w = vec2(p.x * c - p.y * s, p.x * s + p.y * c) + a_pose.xy;
  gl_Position = u_matrix * vec4(w, 0.0, 1.0);
  v_local = p;
  v_half = half_;
  v_color = a_color;
  v_scale = sc;
}`

/* 3D: birlik kub (36 cho‘qqi, normali bilan), har nusxa — burilgan va cho‘zilgan quti */
const VS3 = `#version 300 es
in vec3 a_pos;     // kub burchagi: x, y, z ∈ [-1, 1]
in vec3 a_nrm;
in vec3 i_pose;    // x, y (Merkator metri), yo‘nalish
in vec4 i_box;     // uzunlik, kenglik, pastki z, yuqori z (Merkator metri)
in vec4 i_color;   // rgb + tur: 0 kuzov, 1 kabina, 3.x svetofor boshi (x — holat), 4 ustun
uniform mat4 u_matrix;
out vec3 v_nrm;
out vec3 v_local;
out vec4 v_color;
void main() {
  vec3 p = vec3(a_pos.xy * i_box.xy * 0.5, mix(i_box.z, i_box.w, a_pos.z * 0.5 + 0.5));
  float c = cos(i_pose.z), s = sin(i_pose.z);
  vec2 w = vec2(p.x * c - p.y * s, p.x * s + p.y * c) + i_pose.xy;
  gl_Position = u_matrix * vec4(w, p.z, 1.0);
  v_nrm = vec3(a_nrm.x * c - a_nrm.y * s, a_nrm.x * s + a_nrm.y * c, a_nrm.z);
  v_local = a_pos;
  v_color = i_color;
}`

const FS3 = `#version 300 es
precision highp float;
in vec3 v_nrm;
in vec3 v_local;
in vec4 v_color;
out vec4 o;
float disc(vec2 p, vec2 c, float r) { float d = length(p - c) - r; return 1.0 - smoothstep(-fwidth(d), fwidth(d), d); }
void main() {
  vec3 n = normalize(v_nrm);
  vec3 col = v_color.rgb;
  float kind = v_color.a;
  vec3 glow = vec3(0.0);
  if (kind > 0.5 && kind < 1.5) {
    if (abs(n.z) < 0.5) col = vec3(0.11, 0.13, 0.16); // kabina oynalari
  } else if (kind > 2.95 && kind < 3.5) {
    // svetofor boshi: haydovchiga qaragan (−x) yuzida tepadan pastga qizil, sariq, yashil; tomida kichik chiroq
    int st = int(floor((kind - 3.0) * 10.0 + 0.5));
    col = vec3(0.07, 0.07, 0.08);
    vec3 lit = st == 0 ? vec3(1.0, 0.3, 0.27) : st == 1 ? vec3(1.0, 0.76, 0.2) : vec3(0.24, 0.86, 0.52);
    if (v_local.x < -0.99) {
      vec2 q = vec2(v_local.y * 0.2, v_local.z * 0.5); // yuz tekisligi, metrda (eni 0.4, bo‘yi 1.0)
      for (int i = 0; i < 3; i++) {
        vec3 lamp = i == 0 ? vec3(1.0, 0.3, 0.27) : i == 1 ? vec3(1.0, 0.76, 0.2) : vec3(0.24, 0.86, 0.52);
        float k = disc(q, vec2(0.0, 0.3 - float(i) * 0.3), 0.12);
        if (i == st) glow += lamp * k; else col = mix(col, lamp * 0.18, k);
      }
    } else if (v_local.z > 0.99) {
      glow += lit * disc(v_local.xy, vec2(0.0), 0.6);
    }
  }
  // yorug‘lik: tepadan va biroz janubi-g‘arbdan (y — janubga)
  float diff = max(dot(n, normalize(vec3(-0.35, 0.45, 0.82))), 0.0);
  col = col * (0.5 + 0.5 * diff) + glow;
  o = vec4(col, 1.0);
}`

const FS = `#version 300 es
precision highp float;
in vec2 v_local;
in vec2 v_half;
in vec4 v_color;
in float v_scale;
out vec4 o;
const float M = 1.331; // 1 haqiqiy metr Merkator metrida (Toshkent kengligida)
float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec3 col = v_color.rgb;
  float alpha = 1.0;
  float d;
  float kind = v_color.a;
  if (kind > 6.5) {
    // 3D mashina ostidagi yumshoq soya
    d = box(v_local, v_half, v_half.y * 0.6);
    float a = 0.3 * (1.0 - smoothstep(-0.5 * M, 0.9 * M, d));
    if (a <= 0.003) discard;
    o = vec4(0.0, 0.0, 0.0, a);
    return;
  } else if (kind > 5.5) {
    // 3D’dagi tanlangan mashina: yerda faqat o‘rik halqa
    d = box(v_local, v_half, v_half.y * 0.55);
    if (d <= 0.0) discard;
    float w = v_half.y * 0.32;
    d = abs(d - w * 2.2) - w * 0.6;
    col = vec3(0.851, 0.443, 0.290);
  } else if (kind > 2.5) {
    // yerdagi bo‘yoq: to‘xtash chizig‘i yaxlit, zebra va “yo‘l ber” — yo‘lga ko‘ndalang yo‘l-yo‘l
    d = box(v_local, v_half, 0.0);
    col = vec3(0.97);
    alpha = 0.85;
    if (kind > 3.5) {
      float period = (kind > 4.5 ? 1.2 : 1.0) * M;
      float stripe = step(0.5, fract((v_local.y + v_half.y) / period));
      if (stripe < 0.5) discard;
    }
  } else if (kind > 0.95 && kind < 1.5) {
    // svetofor (yuqoridan): to‘q korpus, ko‘ndalang qatorda uchta chiroq — yonib turgani yorqin
    d = box(v_local, v_half, v_half.x * 0.45);
    int st = int(floor((kind - 1.0) * 10.0 + 0.5));
    col = vec3(0.07, 0.07, 0.08);
    float r = v_half.x * 0.62;
    for (int i = 0; i < 3; i++) {
      // 0 qizil (tashqi chetda), 1 sariq, 2 yashil (yo‘lga yaqin)
      vec2 lc = vec2(0.0, (float(i) - 1.0) * v_half.y * 0.64);
      float ld = length(v_local - lc) - r;
      vec3 lamp = i == 0 ? vec3(1.0, 0.30, 0.27) : i == 1 ? vec3(1.0, 0.76, 0.2) : vec3(0.24, 0.86, 0.52);
      float on = i == st ? 1.0 : 0.16;
      col = mix(col, lamp * on, 1.0 - smoothstep(-fwidth(ld), fwidth(ld), ld));
    }
  } else {
    d = box(v_local, v_half, v_half.y * 0.55);
    float x = v_local.x / v_half.x; // -1 orqa … +1 old
    float y = abs(v_local.y / v_half.y);
    float glass = (step(0.18, x) * step(x, 0.52) + step(-0.78, x) * step(x, -0.56)) * step(y, 0.78);
    col = mix(col, vec3(0.11, 0.13, 0.16), glass * 0.85);
    col *= mix(0.72, 1.0, smoothstep(0.0, v_half.y * 0.35, -d)); // kuzov qirrasi biroz to‘qroq
    if (kind > 1.5 && d > 0.0) {
      // tanlangan: kuzov atrofida bo‘shliq bilan o‘rik halqa
      float w = v_half.y * 0.32;
      d = abs(d - w * 2.2) - w * 0.6;
      col = vec3(0.851, 0.443, 0.290);
    }
  }
  float aa = fwidth(d);
  float a = (1.0 - smoothstep(-aa, aa, d)) * alpha;
  if (a <= 0.0) discard;
  o = vec4(col * a, a);
}`

export function createCarLayer(onStats?: (s: Frame['stats']) => void) {
  let map: MLMap | null = null
  let gl: WebGL2RenderingContext | null = null
  let prog: WebGLProgram | null = null
  let vao: WebGLVertexArrayObject | null = null
  let inst: WebGLBuffer | null = null
  let data = new Float32Array(0)
  let prog3: WebGLProgram | null = null
  let vao3: WebGLVertexArrayObject | null = null
  let inst3: WebGLBuffer | null = null
  let data3 = new Float32Array(0)
  let n3 = 0
  let prev: Frame | null = null
  let cur: Frame | null = null
  let marks = new Float32Array(0)
  let tPrev = 0
  let tCur = 0
  let visible = true
  let repaint = 0
  let selected = -1
  // oxirgi chizilgan (interpolyatsiya qilingan) pozitsiyalar — bosish va kartochka uchun
  let pos = new Float32Array(0)

  const layer: CustomLayerInterface = {
    id: 'cars',
    type: 'custom',
    renderingMode: '3d', // binolar (fill-extrusion) bilan umumiy chuqurlik: bino ortidagi mashina ko‘rinmaydi
    onAdd(m, context) {
      map = m
      gl = context as WebGL2RenderingContext
      prog = program(gl, VS, FS)
      vao = gl.createVertexArray()
      gl.bindVertexArray(vao)
      const quad = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, quad)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW)
      const corner = gl.getAttribLocation(prog, 'a_corner')
      gl.enableVertexAttribArray(corner)
      gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0)
      inst = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, inst)
      const stride = (FLOATS + 1) * 4
      const attr = (name: string, size: number, offset: number) => {
        const loc = gl!.getAttribLocation(prog!, name)
        gl!.enableVertexAttribArray(loc)
        gl!.vertexAttribPointer(loc, size, gl!.FLOAT, false, stride, offset * 4)
        gl!.vertexAttribDivisor(loc, 1)
      }
      attr('a_pose', 3, 0)
      attr('a_size', 2, 3)
      attr('a_color', 4, 5)
      gl.bindVertexArray(null)

      // 3D quti dasturi
      prog3 = program(gl, VS3, FS3)
      vao3 = gl.createVertexArray()
      gl.bindVertexArray(vao3)
      const cube = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, cube)
      gl.bufferData(gl.ARRAY_BUFFER, cubeMesh(), gl.STATIC_DRAW)
      for (const [name, off] of [['a_pos', 0], ['a_nrm', 3]] as const) {
        const loc = gl.getAttribLocation(prog3, name)
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 24, off * 4)
      }
      inst3 = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, inst3)
      for (const [name, size, off] of [['i_pose', 3, 0], ['i_box', 4, 3], ['i_color', 4, 7]] as const) {
        const loc = gl.getAttribLocation(prog3, name)
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, BOX * 4, off * 4)
        gl.vertexAttribDivisor(loc, 1)
      }
      gl.bindVertexArray(null)
    },
    onRemove() {
      if (gl) {
        gl.deleteProgram(prog)
        gl.deleteVertexArray(vao)
        gl.deleteBuffer(inst)
        gl.deleteProgram(prog3)
        gl.deleteVertexArray(vao3)
        gl.deleteBuffer(inst3)
      }
      clearTimeout(repaint)
      map = null
    },
    render(_gl, matrix) {
      if (!gl || !prog || !cur || !visible || !map) return
      const solid = isSolid()
      const n = fill(solid)
      // Merkator metri (boshlang‘ichga nisbatan) → maplibre Merkator birligi → ekran. z ham shu birlikda (balandlik)
      const m = new Float32Array(mul(Array.from(matrix as ArrayLike<number>), [1 / EARTH, 0, 0, 0, 0, 1 / EARTH, 0, 0, 0, 0, 1 / EARTH, 0, ORIGIN_X / EARTH, ORIGIN_Y / EARTH, 0, 1]))
      if (n) {
        const pxPerM = (512 * 2 ** map.getZoom()) / EARTH
        gl.useProgram(prog)
        gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'u_matrix'), false, m)
        gl.uniform1f(gl.getUniformLocation(prog, 'u_scale'), solid ? 1 : Math.max(1, MIN_PX / (CAR[0] * pxPerM)))
        gl.bindVertexArray(vao)
        gl.bindBuffer(gl.ARRAY_BUFFER, inst)
        gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, n * (FLOATS + 1)), gl.DYNAMIC_DRAW)
        // 3D’da yerdagi bo‘yoq va soyalar bino ortida qolsa yashirinadi (chuqurlik tekshiriladi, yozilmaydi)
        if (solid) {
          gl.enable(gl.DEPTH_TEST)
          gl.depthFunc(gl.LEQUAL)
          gl.depthMask(false)
        } else gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n)
        gl.bindVertexArray(null)
      }
      if (solid && n3) {
        gl.useProgram(prog3)
        gl.uniformMatrix4fv(gl.getUniformLocation(prog3!, 'u_matrix'), false, m)
        gl.bindVertexArray(vao3)
        gl.bindBuffer(gl.ARRAY_BUFFER, inst3)
        gl.bufferData(gl.ARRAY_BUFFER, data3.subarray(0, n3 * BOX), gl.DYNAMIC_DRAW)
        gl.enable(gl.DEPTH_TEST)
        gl.depthFunc(gl.LEQUAL)
        gl.depthMask(true)
        gl.disable(gl.BLEND)
        gl.disable(gl.CULL_FACE)
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, n3)
        gl.bindVertexArray(null)
        gl.enable(gl.BLEND)
      }
      // keyingi kadr — ~30 fps (xarita har kadrda to‘liq qayta chiziladi, 60 fps shart emas)
      clearTimeout(repaint)
      repaint = window.setTimeout(() => map?.triggerRepaint(), 33)
    },
  }

  /* xarita qiyshaygan va yaqin — mashina va svetoforlar hajmli (3D) chiziladi */
  const isSolid = () => !!map && map.getPitch() > 8 && map.getZoom() >= SOLID_FROM

  /* 3D quti qo‘shish (o‘lchamlar haqiqiy metrda; fwd — yo‘nalish bo‘yicha siljish) */
  function box3(x: number, y: number, h: number, len: number, wid: number, z0: number, z1: number, fwd: number, r: number, g: number, bl: number, kind: number) {
    if (data3.length < (n3 + 1) * BOX) {
      const grown = new Float32Array(Math.max(1024, data3.length * 2))
      grown.set(data3)
      data3 = grown
    }
    data3.set([x + (Math.cos(h) * fwd) / K, y + (Math.sin(h) * fwd) / K, h, len / K, wid / K, z0 / K, z1 / K, r, g, bl, kind, 0], n3 * BOX)
    n3++
  }

  /* oxirgi ikki simulyatsiya kadri orasida joriy holat */
  function fill(solid: boolean) {
    const a = prev
    const b = cur!
    n3 = 0
    const slots = b.cars.length / CAR_STRIDE
    const lights = map && map.getZoom() >= HEADS_FROM ? b.signals.length / SIGNAL_STRIDE : 0
    const paint = map && map.getZoom() >= MARKS_FROM ? marks.length / MARK_STRIDE : 0
    const need = (slots + lights + paint) * (FLOATS + 1)
    if (data.length < need) data = new Float32Array(need)
    if (pos.length < slots * 2) pos = new Float32Array(slots * 2)
    const span = tCur - tPrev || 50
    const f = a ? Math.min(1, Math.max(0, (performance.now() - 50 - tPrev) / span)) : 1
    let n = 0
    // tartib: yerdagi bo‘yoq → mashinalar → svetoforlar (ustma-ust chiqishi shunday)
    for (let i = 0; i < paint; i++) {
      const o = i * MARK_STRIDE
      data.set([marks[o], marks[o + 1], marks[o + 2], marks[o + 3] / K, marks[o + 4] / K, 1, 1, 1, marks[o + 5]], n * (FLOATS + 1))
      n++
    }
    for (let i = 0; i < slots; i++) {
      const o = i * CAR_STRIDE
      const color = b.cars[o + 3]
      if (color < 0) continue
      let x = b.cars[o]
      let y = b.cars[o + 1]
      let h = b.cars[o + 2]
      if (a && a.cars[o + 3] >= 0 && a.cars[o + 4] === b.cars[o + 4]) {
        // o‘sha mashina — oraliq holat; qayta tug‘ilgan bo‘lsa (avlod o‘zgargan) — sakrab qo‘yiladi
        x = a.cars[o] + (x - a.cars[o]) * f
        y = a.cars[o + 1] + (y - a.cars[o + 1]) * f
        const ah = a.cars[o + 2]
        h = ah + Math.atan2(Math.sin(h - ah), Math.cos(h - ah)) * f
      }
      const c = PALETTE[color | 0] ?? PALETTE[0]
      pos[i * 2] = x
      pos[i * 2 + 1] = y
      if (solid) {
        // yerda — soya (tanlangan bo‘lsa halqa ham), ustida — g‘ildiraklar, kuzov va kabina
        data.set([x, y, h, CAR[0], CAR[1], 0, 0, 0, 7], n * (FLOATS + 1))
        n++
        if (i === selected) {
          data.set([x, y, h, CAR[0], CAR[1], 0, 0, 0, 6], n * (FLOATS + 1))
          n++
        }
        for (const [len, wid, z0, z1, fwd, kind] of CAR_PARTS) {
          const k = kind === 2 ? DARK : c
          box3(x, y, h, len, wid, z0, z1, fwd, k[0], k[1], k[2], kind === 1 ? 1 : 0)
        }
        continue
      }
      data.set([x, y, h, CAR[0], CAR[1], c[0], c[1], c[2], i === selected ? 2 : 0], n * (FLOATS + 1))
      n++
    }
    for (let i = 0; i < lights; i++) {
      const o = i * SIGNAL_STRIDE
      const st = b.signals[o + 2] | 0
      if (solid) {
        // trotuardagi ustun va uning tepasida haydovchilarga qaragan svetofor boshi
        const [x, y, h] = [b.signals[o], b.signals[o + 1], b.signals[o + 3]]
        box3(x, y, h, 0.16, 0.16, 0, 3.1, 0, 0.32, 0.33, 0.35, 4)
        box3(x, y, h, 0.35, 0.4, 3.1, 4.1, 0, 0.07, 0.07, 0.08, 3 + st / 10)
        continue
      }
      // tur 1.x: x — holat (0 qizil, 1 sariq, 2 yashil); korpus yo‘l yo‘nalishi bo‘yicha buriladi
      data.set([b.signals[o], b.signals[o + 1], b.signals[o + 3], HEAD[0], HEAD[1], 0, 0, 0, 1 + st / 10], n * (FLOATS + 1))
      n++
    }
    return n
  }

  return {
    layer,
    push(frame: Frame) {
      prev = cur
      tPrev = tCur
      cur = frame
      tCur = performance.now()
      if (import.meta.env.DEV) (window as unknown as { __frame: Frame }).__frame = frame
      onStats?.(frame.stats)
      if (visible) map?.triggerRepaint()
    },
    /* ekrandagi nuqtaga eng yaqin mashina (oyna koordinatasida maxPx ichida) yoki −1 */
    pick(point: PointLike, maxPx = 14) {
      if (!map || !cur || !visible) return -1
      const ll = map.unproject(point)
      const x = mercX(ll.lng) - ORIGIN_X
      const y = mercY(ll.lat) - ORIGIN_Y
      const pxPerM = (512 * 2 ** map.getZoom()) / EARTH
      let best = -1
      let bestD = Math.max(maxPx / pxPerM, CAR[0] * 0.7)
      const slots = cur.cars.length / CAR_STRIDE
      for (let i = 0; i < slots; i++) {
        if (cur.cars[i * CAR_STRIDE + 3] < 0) continue
        const d = Math.hypot(pos[i * 2] - x, pos[i * 2 + 1] - y)
        if (d < bestD) {
          bestD = d
          best = i
        }
      }
      return best
    },
    /* mashinaning hozir chizilgan joyi (Merkator metri, boshlang‘ichga nisbatan) */
    posOf(slot: number): [number, number] | null {
      // hali chizilmagan (pane yashirin yoki birinchi kadr) — joyi noma’lum
      if (!cur || slot < 0 || slot * 2 + 1 >= pos.length || cur.cars[slot * CAR_STRIDE + 3] < 0) return null
      return [pos[slot * 2], pos[slot * 2 + 1]]
    },
    /* yerdagi chiziqlar (to‘xtash chizig‘i, zebra, yo‘l ber) — grafik o‘zgarganda keladi */
    setMarks(m: Float32Array) {
      marks = m
      map?.triggerRepaint()
    },
    select(slot: number) {
      selected = slot
      map?.triggerRepaint()
    },
    setVisible(v: boolean) {
      visible = v
      map?.triggerRepaint()
    },
  }
}

/* birlik kub: 6 yuz × 2 uchburchak; har cho‘qqi — joy (3) + normal (3) */
function cubeMesh() {
  const out: number[] = []
  const faces: [number[], number[], number[]][] = [
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[-1, 0, 0], [0, -1, 0], [0, 0, 1]],
    [[0, 1, 0], [-1, 0, 0], [0, 0, 1]],
    [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
    [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
  ]
  for (const [nrm, u, v] of faces) {
    const corner = (su: number, sv: number) => [0, 1, 2].map((k) => nrm[k] + u[k] * su + v[k] * sv)
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) out.push(...corner(su, sv), ...nrm)
  }
  return new Float32Array(out)
}

function hex(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/* ustunli (column-major) 4×4 matritsa ko‘paytmasi: a × b — Float64’da, keyin Float32’ga */
function mul(a: number[], b: number[]) {
  const o = new Array<number>(16)
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]
  return o
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
    return s
  }
  const p = gl.createProgram()!
  gl.attachShader(p, make(gl.VERTEX_SHADER, vs))
  gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link')
  return p
}

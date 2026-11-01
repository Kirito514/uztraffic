import type { CustomLayerInterface, Map as MLMap } from 'maplibre-gl'
import { CAR_STRIDE, EARTH, ORIGIN_X, ORIGIN_Y, SIGNAL_STRIDE, type FromWorker } from './protocol'

/* Mashinalar va svetofor chiroqlari — maplibre ichidagi bitta WebGL2 qatlam.
   Har mashina — instanced to‘rtburchak, shakli (yumaloq kuzov, old/orqa oyna) fragment shader’da chiziladi:
   2500 mashina = bitta draw call. Simulyatsiya 20 Hz’da keladi; ekranda oxirgi ikki kadr orasida
   interpolyatsiya qilinadi (silliq harakat), qayta chizish ~30 fps bilan cheklangan. */

const K = Math.cos((41.31 * Math.PI) / 180) // haqiqiy metr → Merkator metri
const CAR = [4.5 / K, 1.85 / K] // uzunlik, kenglik (Merkator metrida)
const LIGHT_R = 0.9 / K
const MIN_PX = 6 // uzoqroqda ham mashina kamida shuncha piksel

// Toshkent ko‘chalari: oq/kumush ko‘p, qolganlari kamroq
const PALETTE = ['#f4f3ef', '#eceae5', '#c3c6ca', '#f7f7f5', '#a9adb3', '#2b2c30', '#6b6f75', '#2f4b6e', '#a8382f', '#c8b69a'].map(hex)
const LIGHTS = [hex('#ff4d45'), hex('#ffc233'), hex('#3ddc84')]
const FLOATS = 8 // x, y, yo‘nalish, uzunlik, kenglik, r, g, b … + tur (pastda alohida)

const VS = `#version 300 es
in vec2 a_corner;
in vec3 a_pose;     // x, y (Merkator metri, boshlang‘ichga nisbatan), yo‘nalish
in vec2 a_size;     // uzunlik, kenglik
in vec4 a_color;    // rgb + tur (0 mashina, 1 chiroq)
uniform mat4 u_matrix;
uniform float u_scale;
out vec2 v_local;
out vec2 v_half;
out vec4 v_color;
void main() {
  vec2 half_ = a_size * 0.5 * u_scale;
  vec2 p = a_corner * (half_ + 0.6 * u_scale); // chekka yumshatish uchun ozgina zaxira
  float c = cos(a_pose.z), s = sin(a_pose.z);
  vec2 w = vec2(p.x * c - p.y * s, p.x * s + p.y * c) + a_pose.xy;
  gl_Position = u_matrix * vec4(w, 0.0, 1.0);
  v_local = p;
  v_half = half_;
  v_color = a_color;
}`

const FS = `#version 300 es
precision highp float;
in vec2 v_local;
in vec2 v_half;
in vec4 v_color;
out vec4 o;
float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec3 col = v_color.rgb;
  float d;
  if (v_color.a > 0.5) {
    // chiroq: rangli doira, to‘q halqa
    d = length(v_local) - v_half.x;
    col = mix(vec3(0.06), col, step(d, -v_half.x * 0.28));
  } else {
    d = box(v_local, v_half, v_half.y * 0.55);
    float x = v_local.x / v_half.x; // -1 orqa … +1 old
    float y = abs(v_local.y / v_half.y);
    float glass = (step(0.18, x) * step(x, 0.52) + step(-0.78, x) * step(x, -0.56)) * step(y, 0.78);
    col = mix(col, vec3(0.11, 0.13, 0.16), glass * 0.85);
    col *= mix(0.72, 1.0, smoothstep(0.0, v_half.y * 0.35, -d)); // kuzov qirrasi biroz to‘qroq
  }
  float aa = fwidth(d);
  float a = 1.0 - smoothstep(-aa, aa, d);
  if (a <= 0.0) discard;
  o = vec4(col * a, a);
}`

export function createCarLayer(onStats?: (s: FromWorker['stats']) => void) {
  let map: MLMap | null = null
  let gl: WebGL2RenderingContext | null = null
  let prog: WebGLProgram | null = null
  let vao: WebGLVertexArrayObject | null = null
  let inst: WebGLBuffer | null = null
  let data = new Float32Array(0)
  let prev: FromWorker | null = null
  let cur: FromWorker | null = null
  let tPrev = 0
  let tCur = 0
  let visible = true
  let repaint = 0

  const layer: CustomLayerInterface = {
    id: 'cars',
    type: 'custom',
    renderingMode: '2d',
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
    },
    onRemove() {
      if (gl) {
        gl.deleteProgram(prog)
        gl.deleteVertexArray(vao)
        gl.deleteBuffer(inst)
      }
      clearTimeout(repaint)
      map = null
    },
    render(_gl, matrix) {
      if (!gl || !prog || !cur || !visible || !map) return
      const n = fill()
      if (n) {
        // Merkator metri (boshlang‘ichga nisbatan) → maplibre Merkator birligi → ekran
        const m = mul(Array.from(matrix as ArrayLike<number>), [1 / EARTH, 0, 0, 0, 0, 1 / EARTH, 0, 0, 0, 0, 1, 0, ORIGIN_X / EARTH, ORIGIN_Y / EARTH, 0, 1])
        const pxPerM = (512 * 2 ** map.getZoom()) / EARTH
        gl.useProgram(prog)
        gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'u_matrix'), false, new Float32Array(m))
        gl.uniform1f(gl.getUniformLocation(prog, 'u_scale'), Math.max(1, MIN_PX / (CAR[0] * pxPerM)))
        gl.bindVertexArray(vao)
        gl.bindBuffer(gl.ARRAY_BUFFER, inst)
        gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, n * (FLOATS + 1)), gl.DYNAMIC_DRAW)
        gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n)
        gl.bindVertexArray(null)
      }
      // keyingi kadr — ~30 fps (xarita har kadrda to‘liq qayta chiziladi, 60 fps shart emas)
      clearTimeout(repaint)
      repaint = window.setTimeout(() => map?.triggerRepaint(), 33)
    },
  }

  /* oxirgi ikki simulyatsiya kadri orasida joriy holat */
  function fill() {
    const a = prev
    const b = cur!
    const slots = b.cars.length / CAR_STRIDE
    const lights = b.signals.length / SIGNAL_STRIDE
    const need = (slots + lights) * (FLOATS + 1)
    if (data.length < need) data = new Float32Array(need)
    const span = tCur - tPrev || 50
    const f = a ? Math.min(1, Math.max(0, (performance.now() - 50 - tPrev) / span)) : 1
    let n = 0
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
      data.set([x, y, h, CAR[0], CAR[1], c[0], c[1], c[2], 0], n * (FLOATS + 1))
      n++
    }
    for (let i = 0; i < lights; i++) {
      const o = i * SIGNAL_STRIDE
      const c = LIGHTS[b.signals[o + 2] | 0]
      data.set([b.signals[o], b.signals[o + 1], 0, LIGHT_R * 2, LIGHT_R * 2, c[0], c[1], c[2], 1], n * (FLOATS + 1))
      n++
    }
    return n
  }

  return {
    layer,
    push(frame: FromWorker) {
      prev = cur
      tPrev = tCur
      cur = frame
      tCur = performance.now()
      if (import.meta.env.DEV) (window as unknown as { __frame: FromWorker }).__frame = frame
      onStats?.(frame.stats)
      if (visible) map?.triggerRepaint()
    },
    setVisible(v: boolean) {
      visible = v
      map?.triggerRepaint()
    },
  }
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

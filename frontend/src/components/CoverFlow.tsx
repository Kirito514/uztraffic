import { useEffect, useRef, useState } from 'react'
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
} from 'motion/react'
import { Icon } from '@iconify/react'
import type { Feature } from '@/data/features'
import { project, spring, springMomentum } from '@/lib/motion'
import { cn } from '@/lib/utils'

const SPACING = 300 // qo‘shni kartalar markazlari orasidagi masofa (px) — yon kartalar sarlavhasi yopilmasin
const DRAG_SLOP = 8 // yo‘nalishni aniqlashdan oldingi histerezis
const AUTOPLAY_MS = 4800
const CARD_W = 320

/* Cheksiz halqa: pozitsiya chegarasiz son, karta esa eng qisqa yo‘l bo‘yicha [-n/2, n/2) oralig‘ida turadi */
const mod = (x: number, n: number) => ((x % n) + n) % n
const ringOffset = (x: number, n: number) => mod(x + n / 2, n) - n / 2
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/* Cover Flow joylashuvi: markazdan uzoqlashgan karta kichrayadi, ichkariga suriladi,
   3D’da tashqariga buriladi va chekkada to‘liq shaffof bo‘ladi (halqadan o‘tish ko‘rinmaydi) */
function layout(offset: number) {
  const d = Math.abs(offset)
  const sign = Math.sign(offset)
  const x = sign * (d <= 1 ? d * SPACING : SPACING + (d - 1) * SPACING * 0.85)
  const scale = 1 - Math.min(d, 2.5) * 0.08
  const opacity = d > 2.2 ? Math.max(0, 1 - (d - 2.2) * 1.25) : 1
  const rotateY = -sign * Math.min(d, 1) * 24 // birinchi qadamda buriladi, keyin burchak saqlanadi
  return { x, scale, opacity, rotateY, z: 100 - Math.round(d * 10) }
}

export function CoverFlow({ items, start = 2 }: { items: Feature[]; start?: number }) {
  const n = items.length
  const pos = useMotionValue(start)
  const progress = useMotionValue(0) // avtomatik aylanish taymeri 0→1
  const [active, setActive] = useState(start)
  const anim = useRef<AnimationPlaybackControls | null>(null)
  const track = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  useMotionValueEvent(pos, 'change', (p) => setActive(mod(Math.round(p), n)))

  /* target — chegarasiz pozitsiya (halqada istalgan aylanish) */
  const animateTo = (target: number, velocity = 0) => {
    anim.current?.stop()
    lastInput.current = performance.now()
    anim.current = animate(pos, target, reduce ? { duration: 0 } : velocity ? { ...springMomentum, velocity } : spring)
  }
  const step = (dir: number) => animateTo(Math.round(pos.get()) + dir)
  const goTo = (i: number) => animateTo(Math.round(pos.get()) + ringOffset(i - Math.round(pos.get()), n))

  /* --- avtomatik aylanish: kursor ustida, surish, fokus yoki ekrandan tashqarida bo‘lsa taymer to‘xtaydi
         (vaqt “muzlaydi”, keyin qolgan joydan davom etadi — progress chizig‘i sakramaydi) --- */
  const lastInput = useRef(performance.now())
  const hovering = useRef(false)
  const focused = useRef(false)
  const inView = useRef(false)
  useEffect(() => {
    if (reduce) return
    const el = track.current
    const io = new IntersectionObserver(([e]) => (inView.current = e.isIntersecting), { threshold: 0.4 })
    if (el) io.observe(el)
    let raf = 0
    let prev = performance.now()
    const loop = (now: number) => {
      const dt = now - prev
      prev = now
      if (!inView.current || hovering.current || focused.current || drag.current) lastInput.current += dt
      const p = clamp01((now - lastInput.current) / AUTOPLAY_MS)
      progress.set(p)
      if (p >= 1) step(1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [reduce]) // eslint-disable-line react-hooks/exhaustive-deps

  /* --- to‘g‘ridan-to‘g‘ri boshqaruv: 1:1 kuzatish, inersiya, tezlikni uzatish --- */
  const drag = useRef<{ id: number; x0: number; p0: number; hist: { x: number; t: number }[]; moved: boolean } | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    anim.current?.stop() // harakatdagi kartani istalgan payt ushlash mumkin — joriy qiymatdan davom etadi
    drag.current = { id: e.pointerId, x0: e.clientX, p0: pos.get(), hist: [{ x: e.clientX, t: e.timeStamp }], moved: false }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x0
    if (!d.moved) {
      if (Math.abs(dx) < DRAG_SLOP) return
      d.moved = true
      // element chegarasidan chiqsa ham kuzatish davom etsin
      try {
        track.current?.setPointerCapture(e.pointerId)
      } catch {
        /* pointer allaqachon qo‘yib yuborilgan */
      }
    }
    d.hist.push({ x: e.clientX, t: e.timeStamp })
    if (d.hist.length > 6) d.hist.shift()
    pos.set(d.p0 - dx / SPACING) // halqa — chegara yo‘q, 1:1 kuzatish
  }

  const dragged = useRef(false)

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d || d.id !== e.pointerId || !d.moved) return
    dragged.current = true // surishdan keyingi click kartani tanlab yubormasin
    setTimeout(() => (dragged.current = false), 0)
    const h = d.hist
    const a = h[0]
    const b = h[h.length - 1]
    const dt = Math.max(1, b.t - a.t)
    const vPx = ((b.x - a.x) / dt) * 1000 // px/s
    const vIdx = -vPx / SPACING
    const projected = pos.get() + -project(vPx) / SPACING
    animateTo(Math.round(projected), vIdx)
  }

  useEffect(() => () => anim.current?.stop(), [])

  return (
    <div className="relative">
      <div
        ref={track}
        role="region"
        aria-roledescription="karusel"
        aria-label="OQIM imkoniyatlari"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1)
          if (e.key === 'ArrowLeft') step(-1)
        }}
        onFocus={() => (focused.current = true)}
        onBlur={() => (focused.current = false)}
        onPointerEnter={(e) => e.pointerType === 'mouse' && (hovering.current = true)}
        onPointerLeave={() => (hovering.current = false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          if (dragged.current) {
            e.stopPropagation()
            e.preventDefault()
          }
        }}
        style={{
          perspective: 1400,
          maskImage: 'linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)',
        }}
        className="relative mx-auto h-[520px] w-full cursor-grab touch-pan-y select-none overflow-hidden outline-none active:cursor-grabbing"
      >
        {items.map((f, i) => (
          <Card key={f.title} f={f} i={i} n={n} pos={pos} active={i === active} onSelect={() => goTo(i)} />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-6">
        <RoundButton label="Oldingi" icon="tabler:arrow-left" onClick={() => step(-1)} />
        <div className="flex min-w-[200px] flex-col items-center gap-3">
          <span className="font-display text-[17px] font-bold tracking-[-0.02em]">{items[active].title}</span>
          <div className="flex items-center gap-1.5">
            {items.map((f, i) => (
              <button
                key={f.title}
                aria-label={f.title}
                aria-current={i === active}
                onClick={() => goTo(i)}
                className={cn(
                  'relative h-1.5 overflow-hidden rounded-full bg-ink/15 transition-[width,background-color] duration-300 ease-out-soft',
                  i === active ? 'w-8' : 'w-1.5 hover:bg-ink/35',
                )}
              >
                {i === active && (
                  <motion.span
                    style={{ scaleX: reduce ? 1 : progress }}
                    className="absolute inset-0 origin-left rounded-full bg-ink"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
        <RoundButton label="Keyingi" icon="tabler:arrow-right" onClick={() => step(1)} />
      </div>
    </div>
  )
}

type CardProps = { f: Feature; i: number; n: number; pos: MotionValue<number>; active: boolean; onSelect: () => void }

function Card({ f, i, n, pos, active, onSelect }: CardProps) {
  const off = (p: number) => ringOffset(i - p, n)
  const x = useTransform(pos, (p) => layout(off(p)).x)
  const scale = useTransform(pos, (p) => layout(off(p)).scale)
  const opacity = useTransform(pos, (p) => layout(off(p)).opacity)
  const zIndex = useTransform(pos, (p) => layout(off(p)).z)
  const dim = useTransform(pos, (p) => Math.min(0.35, Math.max(0, Math.abs(off(p)) - 0.5) * 0.25))
  // tafsilotlar (matn, tugma) faqat markazga yaqinlashganda ochiladi
  const details = useTransform(pos, (p) => clamp01(1 - (Math.abs(off(p)) - 0.15) * 2.4))
  const detailsY = useTransform(details, [0, 1], [10, 0])

  /* 3D egilish (faqat markaziy karta, sichqoncha) + Cover Flow burilishi bitta rotateY’da qo‘shiladi */
  const reduce = useReducedMotion()
  const tiltX = useSpring(0, { stiffness: 220, damping: 30 })
  const tiltY = useSpring(0, { stiffness: 220, damping: 30 })
  const rotateY = useTransform([pos, tiltY], ([p, t]) => layout(off(p as number)).rotateY + (t as number))
  const tilt = (e: React.PointerEvent<HTMLElement>) => {
    if (!active || reduce || e.pointerType !== 'mouse' || e.buttons !== 0) return resetTilt()
    const r = e.currentTarget.getBoundingClientRect()
    tiltX.set(-((e.clientY - r.top) / r.height - 0.5) * 8)
    tiltY.set(((e.clientX - r.left) / r.width - 0.5) * 10)
  }
  const resetTilt = () => {
    tiltX.set(0)
    tiltY.set(0)
  }
  useEffect(() => {
    if (!active) resetTilt()
  })

  return (
    <motion.article
      style={{ x, scale, opacity, zIndex, rotateX: tiltX, rotateY, marginLeft: -CARD_W / 2, width: CARD_W }}
      aria-hidden={!active}
      onPointerMove={tilt}
      onPointerLeave={resetTilt}
      onClick={() => !active && onSelect()}
      className="absolute left-1/2 top-6 h-[460px] overflow-hidden rounded-[30px] bg-ink shadow-[0_40px_70px_-34px_rgb(12_11_10/0.6)] ring-1 ring-black/5 will-change-transform"
    >
      <img src={f.img} alt={f.alt} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(12_11_10/0.25)_0%,rgb(12_11_10/0)_22%,rgb(12_11_10/0)_45%,rgb(12_11_10/0.82)_100%)]" />
      <motion.div style={{ opacity: dim }} className="absolute inset-0 bg-ink" />

      <span className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-ink">{f.chip}</span>

      <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-6 text-white">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[26px] font-bold leading-[1.05] tracking-[-0.03em]">{f.title}</h3>
          <motion.p style={{ opacity: details, y: detailsY }} className="mt-2 text-[14px] leading-snug text-white/80">
            {f.text}
          </motion.p>
        </div>
        <motion.a
          href="#qanday"
          aria-label={`${f.title} — batafsil`}
          tabIndex={active ? 0 : -1}
          onClick={(e) => e.stopPropagation()}
          style={{ opacity: details }}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.1 }}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-ink transition-transform duration-300 ease-out-soft hover:scale-110"
        >
          <Icon icon="tabler:arrow-up-right" className="size-5" />
        </motion.a>
      </div>
    </motion.article>
  )
}

function RoundButton({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <motion.button
      aria-label={label}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.1 }}
      className="grid size-12 place-items-center rounded-full border border-ink/15 text-ink transition-colors hover:bg-mist"
    >
      <Icon icon={icon} className="size-5" />
    </motion.button>
  )
}

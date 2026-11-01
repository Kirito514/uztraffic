import { useEffect, useRef, useState } from 'react'
import { scrollToY } from '@/lib/smoothScroll'
import { cn } from '@/lib/utils'

const PAD = 8 // trek chetlaridan bo‘sh joy
const MIN_THUMB = 44

/* macOS uslubidagi scrollbar: tizimnikini yashiradi, o‘rniga ingichka kapsula — aylantirganda
   paydo bo‘ladi va 1 s jimlikdan keyin so‘nadi. Ustiga kelinsa yo‘g‘onlashadi; sudrash 1:1
   (ushlangan joy saqlanadi), trekka bosish — o‘sha joyga silliq o‘tish. Pozitsiya — faqat transform.
   Sensorli ekranlarda o‘chiq: u yerda tizimning o‘z overlay scrollbar’i yaxshiroq. */
export function ScrollBar() {
  const thumb = useRef<HTMLDivElement>(null)
  const geo = useRef({ thumbH: MIN_THUMB, maxY: 1, room: 1 })
  const grab = useRef<number | null>(null)
  const [fine] = useState(() => matchMedia('(pointer: fine)').matches)
  const [scrolling, setScrolling] = useState(false)
  const [hover, setHover] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [needed, setNeeded] = useState(true)

  useEffect(() => {
    if (!fine) return
    const root = document.documentElement
    root.classList.add('custom-scrollbar')
    let idle = 0

    const update = () => {
      const vh = innerHeight
      const doc = root.scrollHeight
      const track = vh - PAD * 2
      const thumbH = Math.max((track * vh) / doc, MIN_THUMB)
      const maxY = Math.max(doc - vh, 1)
      const room = Math.max(track - thumbH, 1)
      geo.current = { thumbH, maxY, room }
      setNeeded(doc > vh + 1)
      const el = thumb.current
      if (!el) return
      el.style.height = `${thumbH}px`
      el.style.transform = `translate3d(0, ${PAD + (Math.min(scrollY, maxY) / maxY) * room}px, 0)`
    }
    const onScroll = () => {
      update()
      setScrolling(true)
      clearTimeout(idle)
      idle = window.setTimeout(() => setScrolling(false), 1000)
    }

    update()
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', update)
    const ro = new ResizeObserver(update) // rasmlar yuklanib sahifa uzayganda
    ro.observe(document.body)
    return () => {
      clearTimeout(idle)
      removeEventListener('scroll', onScroll)
      removeEventListener('resize', update)
      ro.disconnect()
      root.classList.remove('custom-scrollbar')
    }
  }, [fine])

  if (!fine || !needed) return null

  const toScroll = (thumbTop: number) => {
    const { maxY, room } = geo.current
    return (Math.min(Math.max(thumbTop - PAD, 0), room) / room) * maxY
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault() // matn belgilanmasin
    const rect = thumb.current!.getBoundingClientRect()
    if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
      // kapsulani ushladik — ushlangan nuqta barmoq ostida qoladi
      grab.current = e.clientY - rect.top
      e.currentTarget.setPointerCapture(e.pointerId)
      setDragging(true)
    } else {
      // trekka bosish: kapsula markazi shu nuqtaga silliq keladi
      scrollToY(toScroll(e.clientY - geo.current.thumbH / 2))
    }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (grab.current === null) return
    scrollToY(toScroll(e.clientY - grab.current), true)
  }
  const release = () => {
    grab.current = null
    setDragging(false)
  }

  const shown = scrolling || hover || dragging
  const wide = hover || dragging

  return (
    <div
      aria-hidden
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      className="fixed inset-y-0 right-0 z-[70] w-4 select-none"
    >
      <div
        ref={thumb}
        className={cn(
          'absolute right-[3px] top-0 rounded-full ring-1 ring-white/45 will-change-transform',
          'transition-[opacity,width,background-color] ease-out-soft',
          shown ? 'opacity-100 duration-150' : 'opacity-0 duration-500',
          wide ? 'w-[9px] bg-ink/70' : 'w-[6px] bg-ink/45',
        )}
      />
    </div>
  )
}

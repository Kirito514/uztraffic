import Lenis from 'lenis'

/* Silliq inersiyali scroll (Lenis). Sichqoncha g‘ildiragining “zinapoya” sakrashlarini
   bitta uzluksiz harakatga aylantiradi. Brauzerning haqiqiy scroll pozitsiyasi o‘zgaradi,
   shuning uchun Motion’ning useScroll/whileInView o‘zgarishsiz ishlaydi.
   Harakat kamaytirilgan bo‘lsa — umuman yoqilmaydi. Sensorli ekranda native scroll qoladi. */
const NAV_OFFSET = -64

let instance: Lenis | null = null

/* To‘liq ekranli menyu ochiq paytda orqadagi sahifa aylanmasin */
export function lockScroll(locked: boolean) {
  if (instance) {
    if (locked) instance.stop()
    // start() ichida reset() bor — boshlangan scroll animatsiyasini o‘chirmaslik uchun faqat to‘xtagan bo‘lsa
    else if (instance.isStopped) instance.start()
  }
  document.documentElement.style.overflow = locked ? 'hidden' : ''
}

/* Scrollbar’dan: sudrashda darhol (1:1), trekka bosilganda — silliq */
export function scrollToY(y: number, immediate = false) {
  if (instance) instance.scrollTo(y, { immediate, duration: 0.9 })
  else window.scrollTo({ top: y, behavior: immediate ? 'instant' : 'smooth' })
}

export function initSmoothScroll() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}

  const lenis = new Lenis({
    lerp: 0.1, // har kadrda masofaning 10% — Apple’ga yaqin “yumshoq” to‘xtash
    wheelMultiplier: 1,
    smoothWheel: true,
  })
  instance = lenis

  let raf = requestAnimationFrame(function loop(t) {
    lenis.raf(t)
    raf = requestAnimationFrame(loop)
  })

  // #langar havolalari ham silliq, navbar balandligini hisobga olib
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null
    if (!a) return
    const id = a.getAttribute('href')!
    const target = id === '#' ? 0 : document.querySelector<HTMLElement>(id)
    if (target === null) return
    e.preventDefault()
    lockScroll(false) // menyudan bosilgan bo‘lsa — avval qulfni ochamiz, keyin aylantiramiz
    lenis.scrollTo(target, { offset: NAV_OFFSET, duration: 1.1 })
    if (id !== '#') history.replaceState(null, '', id)
  }
  document.addEventListener('click', onClick)

  return () => {
    cancelAnimationFrame(raf)
    document.removeEventListener('click', onClick)
    lenis.destroy()
    instance = null
  }
}

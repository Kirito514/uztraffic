import type { Transition } from 'motion/react'

/* Apple springlari (WWDC "Designing Fluid Interfaces"):
   standart — kritik so‘nish (bounce 0); faqat impuls bilan otilgan harakatga ozgina bounce. */
export const spring: Transition = { type: 'spring', bounce: 0, duration: 0.45 }
export const springSoft: Transition = { type: 'spring', bounce: 0, duration: 0.7 }
export const springMomentum: Transition = { type: 'spring', bounce: 0.18, duration: 0.5 }

/* Inersiya proyeksiyasi: qo‘yib yuborilgan joydan emas, harakat yetib boradigan joydan
   eng yaqin to‘xtash nuqtasini tanlaymiz. decelerationRate ≈ 0.998 — oddiy scroll hissi. */
export function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate)
}

/* Chegaradan o‘tganda qattiq to‘xtash o‘rniga tobora kuchayuvchi qarshilik */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))
}

export const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '0px 0px -80px 0px' },
  transition: springSoft,
}

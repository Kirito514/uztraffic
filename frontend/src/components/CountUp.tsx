import { useEffect, useRef } from 'react'
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'motion/react'

/* Ekranga chiqqanda 0 dan qiymatgacha sanaydi (bir marta). Ming bo‘yicha bo‘sh joy: 770 000.
   Matnni Motion qiymati yangilaydi — React qayta render qilinmaydi. */
const fmt = (v: number) => Math.round(v).toLocaleString('ru-RU').replace(/ |,/g, ' ')

export function CountUp({ to, suffix = '', duration = 1.6 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduce = useReducedMotion()
  const value = useMotionValue(reduce ? to : 0)
  const text = useTransform(value, (v) => fmt(v) + suffix)

  useEffect(() => {
    if (!inView) return
    if (reduce) return value.set(to)
    const c = animate(value, to, { duration, ease: [0.22, 1, 0.36, 1] })
    return () => c.stop()
  }, [inView, reduce, to, duration, value])

  return (
    <motion.span ref={ref} className="tabular-nums">
      {text}
    </motion.span>
  )
}

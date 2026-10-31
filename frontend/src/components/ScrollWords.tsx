import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { cn } from '@/lib/utils'

/* Scroll bilan so‘zma-so‘z “yonadigan” matn (Apple mahsulot sahifalari uslubi).
   Faqat opacity o‘zgaradi — kompozitorda, qayta joylashuvsiz. `muted` so‘zlar yonganda ham kulrang qoladi. */
type Part = { text: string; muted?: boolean }

export function ScrollWords({ parts, className }: { parts: Part[]; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] })
  const words = parts.flatMap((p) => p.text.split(' ').filter(Boolean).map((w) => ({ w, muted: p.muted })))

  return (
    <p ref={ref} className={cn('flex flex-wrap', className)}>
      {words.map((x, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} muted={x.muted} still={!!reduce}>
          {x.w}
        </Word>
      ))}
    </p>
  )
}

function Word({ children, progress, range, muted, still }: { children: string; progress: MotionValue<number>; range: [number, number]; muted?: boolean; still: boolean }) {
  const opacity = useTransform(progress, range, [0.16, 1])
  return (
    <motion.span style={{ opacity: still ? 1 : opacity }} className={cn('mr-[0.25em]', muted && 'text-ash')}>
      {children}
    </motion.span>
  )
}

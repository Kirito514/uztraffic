import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'

type Props = {
  href: string
  children: ReactNode
  variant?: 'light' | 'dark' | 'ghost'
  className?: string
}

/* Bosilgan zahoti javob beradi (pointer-down), qo‘yib yuborilganda emas.
   Hover: matn chapga suriladi, o‘ngdan strelka chiqadi — faqat transform/opacity
   (kenglik o‘zgarmaydi, sahifa qayta hisoblanmaydi → silliq 60/120 fps). */
export function PillButton({ href, children, variant = 'light', className }: Props) {
  const slide = 'transition-[translate,opacity] duration-[450ms] ease-out-soft'
  return (
    <motion.a
      href={href}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
      className={cn(
        'group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full px-8 text-[15px] font-medium tracking-[-0.01em] transition-colors duration-300',
        variant === 'light' && 'bg-white text-ink shadow-[0_8px_30px_-12px_rgb(0_0_0/0.45)] hover:bg-krem',
        variant === 'dark' && 'bg-ink text-krem hover:bg-ink-2',
        variant === 'ghost' && 'border border-white/30 text-white hover:bg-white/10',
        className,
      )}
    >
      <span className={cn(slide, 'group-hover:-translate-x-2.5 group-focus-visible:-translate-x-2.5')}>{children}</span>
      <Icon
        icon="tabler:arrow-right"
        aria-hidden
        className={cn(
          slide,
          'absolute right-4 size-4 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100',
        )}
      />
    </motion.a>
  )
}

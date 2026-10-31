import { motion } from 'motion/react'
import { Icon } from '@iconify/react'
import { FEATURES } from '@/data/features'
import { springSoft } from '@/lib/motion'
import { cn } from '@/lib/utils'

/* D — Bento: har xil o‘lchamdagi plitkalar; foto sekin kattalashadi, matn pastdan ko‘tariladi.
   4×3 to‘r bo‘shliqsiz:  0 0 1 1 / 0 0 2 3 / 4 4 5 5 */
const SPAN = [
  'lg:col-span-2 lg:row-span-2', // aqlli svetofor — katta
  'lg:col-span-2',
  '',
  '',
  'lg:col-span-2',
  'lg:col-span-2',
]
const ICONS = ['tabler:traffic-lights', 'tabler:route', 'tabler:chart-dots-3', 'tabler:ambulance', 'tabler:device-mobile', 'tabler:message-circle']

export function FeaturesBento() {
  return (
    <div className="mx-auto mt-14 grid max-w-[1200px] auto-rows-[220px] grid-cols-1 gap-4 px-5 sm:grid-cols-2 md:px-8 lg:grid-cols-4">
      {FEATURES.map((f, k) => (
        <motion.a
          key={f.title}
          href="#qanday"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -60px 0px' }}
          transition={{ ...springSoft, delay: (k % 4) * 0.06 }}
          className={cn('group relative isolate overflow-hidden rounded-[28px] bg-ink text-white', SPAN[k])}
        >
          <img
            src={f.img}
            alt={f.alt}
            className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-[900ms] ease-out-soft will-change-transform group-hover:scale-[1.06]"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(12_11_10/0.05)_30%,rgb(12_11_10/0.8))]" />
          <span className="absolute left-5 top-5 grid size-10 place-items-center rounded-2xl bg-white/16 ring-1 ring-inset ring-white/25">
            <Icon icon={ICONS[k]} className="size-5" />
          </span>
          <div className="absolute inset-x-5 bottom-5 transition-transform duration-500 ease-out-soft group-hover:-translate-y-1">
            <h3 className={cn('font-display font-bold tracking-[-0.025em]', k === 0 ? 'text-[32px]' : 'text-[21px]')}>{f.title}</h3>
            <p className={cn('mt-1.5 text-white/75', k === 0 ? 'max-w-[420px] text-[15px]' : 'text-[13px] leading-snug')}>{f.text}</p>
          </div>
        </motion.a>
      ))}
    </div>
  )
}

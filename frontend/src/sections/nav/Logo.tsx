import { AnimatePresence, motion } from 'motion/react'
import { spring } from '@/lib/motion'

/* OQIM logotipi inline: tomchilar va so‘z belgisi `currentColor` — rang navbar bilan birga
   silliq o‘zgaradi (img almashtirish “sakrash”i yo‘q). Ixcham holatda so‘z belgisi
   belgiga “singib” ketadi, belgi esa joyida qoladi. */
const DROP = 'M128 110 L108.16 92.5 A30 30 0 1 1 147.84 92.5 Z'
const WORDMARK = 'M93.37 89.25Q82.09 101.07 64.42 101.07Q46.75 101.07 35.46 89.25Q24.18 77.43 24.18 59.88Q24.18 42.33 35.46 30.57Q46.75 18.81 64.42 18.81Q82.09 18.81 93.37 30.57Q104.66 42.33 104.66 59.88Q104.66 77.43 93.37 89.25ZM42.21 59.88Q42.21 70.99 47.94 77.73Q53.67 84.48 64.42 84.48Q75.16 84.48 80.9 77.73Q86.63 70.99 86.63 59.88Q86.63 48.78 80.9 42.03Q75.16 35.28 64.42 35.28Q53.67 35.28 47.94 42.09Q42.21 48.9 42.21 59.88Z M171.53 123.52Q161.27 123.4 155.53 117.19Q149.8 110.99 150.28 100.72Q134.76 98.93 125.09 87.46Q115.41 76 115.41 59.88Q115.41 42.33 126.7 30.57Q137.98 18.81 155.65 18.81Q173.33 18.81 184.61 30.57Q195.89 42.33 195.89 59.88Q195.89 75.88 186.4 87.28Q176.91 98.69 161.5 100.72Q161.98 105.01 164.43 107.1Q166.88 109.19 170.46 109.19Q176.07 109.19 180.37 105.49Q184.67 101.79 187.3 96.54L193.27 113.61Q184.43 123.52 171.53 123.52ZM155.65 84.12Q166.4 84.12 172.13 77.37Q177.86 70.63 177.86 59.88Q177.86 49.13 172.13 42.39Q166.4 35.64 155.65 35.64Q145.03 35.64 139.24 42.45Q133.44 49.25 133.44 59.88Q133.44 70.63 139.24 77.37Q145.03 84.12 155.65 84.12Z M225.99 100H208.92V20H225.99Z M258.48 100H241.41V20H263.98L276.99 49.73L284.51 73.49L292.04 49.73L305.05 20H327.62V100H310.54V70.03L312.93 37.79L303.38 64.42L293.47 86.15H275.56L265.65 64.42L255.98 37.79L258.48 70.03Z'

export function Logo({ compact }: { compact: boolean }) {
  return (
    <span className="flex items-center">
      <motion.svg
        layout
        transition={spring}
        viewBox="40 40 176 176"
        aria-hidden
        className={compact ? 'size-[26px]' : 'size-[30px]'}
      >
        <g fill="currentColor">
          {[0, 90, 180, 270].map((r) => (
            <path key={r} transform={`rotate(${r} 128 128)`} d={DROP} />
          ))}
        </g>
        <circle cx="128" cy="128" r="10" fill="var(--color-orik-deep)" />
      </motion.svg>
      <AnimatePresence initial={false} mode="popLayout">
        {!compact && (
          <motion.svg
            key="wordmark"
            viewBox="18 16 318 88"
            aria-hidden
            initial={{ opacity: 0, x: -10, scale: 0.92, filter: 'blur(4px)' }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -14, scale: 0.9, filter: 'blur(4px)' }}
            transition={{ ...spring, opacity: { duration: 0.2 } }}
            style={{ originX: 0 }}
            className="ml-[7px] h-[16px] w-auto"
          >
            <path fill="currentColor" d={WORDMARK} />
          </motion.svg>
        )}
      </AnimatePresence>
    </span>
  )
}

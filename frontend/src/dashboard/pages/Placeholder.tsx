import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { useTheme } from '../theme'

/* Hali qurilmagan sahifa uchun vaqtinchalik maydon */
export function Placeholder({ icon, text }: { icon: string; text: string }) {
  const dark = useTheme().tone === 'dark'
  return (
    <div className={cn('grid min-h-[60svh] flex-1 place-items-center rounded-[28px] border-2 border-dashed text-[14px]', dark ? 'border-white/10 text-krem/50' : 'border-line text-ash')}>
      <span className="flex flex-col items-center gap-3">
        <Icon icon={icon} className="size-7 opacity-70" />
        {text}
      </span>
    </div>
  )
}

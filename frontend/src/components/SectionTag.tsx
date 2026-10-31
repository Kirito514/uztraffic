import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function SectionTag({ children, className }: { children: string; className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn('h-8 rounded-full bg-mist px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/70', className)}
    >
      {children}
    </Badge>
  )
}

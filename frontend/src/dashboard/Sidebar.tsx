import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@iconify/react'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { pagePath } from './router'

export const NAV = [
  { id: 'xarita', icon: 'tabler:map-2', label: 'Jonli xarita' },
  { id: 'chorrahalar', icon: 'tabler:traffic-lights', label: 'Chorrahalar' },
  { id: 'tahlil', icon: 'tabler:chart-area-line', label: 'AI tahlil' },
  { id: 'tez-yordam', icon: 'tabler:ambulance', label: 'Tez yordam' },
  { id: 'hodisalar', icon: 'tabler:bell', label: 'Hodisalar' },
] as const
// sidebar pastida, asosiy bo‘limlardan alohida
export const SETTINGS = { id: 'sozlamalar', icon: 'tabler:settings', label: 'Sozlamalar' } as const
export const ALL_PAGES = [...NAV, SETTINGS]
export type PageId = (typeof ALL_PAGES)[number]['id']

const WIDE = 248
const NARROW = 84

/* yig‘ilganda matn o‘rnida tooltip (kursor yoki klaviatura fokusi bilan) */
function Tip({ show, children }: { show: boolean; children: string }) {
  if (!show) return null
  return (
    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-[12px] font-medium text-krem opacity-0 shadow-lg ring-1 ring-white/10 transition-[opacity,translate] duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
      {children}
    </span>
  )
}

/* To‘q “suzuvchi” sidebar (Eduplex / Coinview / Dispatch referenslari); Dispatch’dagidek yig‘iladi */
export function Sidebar({
  active,
  collapsed,
  onNavigate,
  onToggle,
  surface = 'solid',
}: {
  active: PageId
  collapsed: boolean
  onNavigate: (id: PageId) => void
  onToggle: () => void
  surface?: 'solid' | 'glass-light' | 'glass-dark' // to‘liq ekranli sahifada xarita ustida shisha bo‘ladi
}) {
  const light = surface === 'glass-light'
  const [moving, setMoving] = useState(false) // kenglik o‘zgarayotganda blur o‘chadi
  const label = (text: string) => (
    <AnimatePresence initial={false}>
      {!collapsed && (
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.08 } }} exit={{ opacity: 0, transition: { duration: 0.08 } }} className="whitespace-nowrap">
          {text}
        </motion.span>
      )}
    </AnimatePresence>
  )

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? NARROW : WIDE }}
      transition={spring}
      onAnimationStart={() => setMoving(true)}
      onAnimationComplete={() => setMoving(false)}
      className={cn(
        'pointer-events-auto sticky top-3 z-20 hidden h-[calc(100svh-24px)] shrink-0 flex-col rounded-[28px] p-4 transition-[background-color,color] duration-300 lg:flex',
        surface === 'solid' && 'bg-ink text-krem ring-1 ring-white/8', // halqa — to‘q mavzuda fondan ajralib tursin
        surface === 'glass-dark' && cn('bg-ink/55 text-krem ring-1 ring-white/10', !moving && 'backdrop-blur-2xl backdrop-saturate-150'),
        light && cn('bg-white/60 text-ink shadow-[0_16px_48px_-20px_rgb(12_11_10/0.35)] ring-1 ring-white/70', !moving && 'backdrop-blur-2xl backdrop-saturate-150'),
      )}
    >
      <div className={cn('flex items-center', collapsed ? 'flex-col gap-3' : 'justify-between pl-2 pt-1')}>
        <a href="/" className="flex items-center" aria-label="OQIM bosh sahifa">
          <img
            src={collapsed ? '/brand/favicon.svg' : light ? '/brand/oqim-horizontal.svg' : '/brand/oqim-horizontal-dark.svg'}
            alt="OQIM"
            className={collapsed ? 'size-11 rounded-[14px]' : 'h-10 w-auto'}
          />
        </a>
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Panelni kengaytirish' : 'Panelni yig‘ish'}
          aria-expanded={!collapsed}
          title={`${collapsed ? 'Kengaytirish' : 'Yig‘ish'} ( [ )`}
          className={cn('grid size-9 shrink-0 place-items-center rounded-full transition-colors', light ? 'text-ink/55 hover:bg-ink/5 hover:text-ink' : 'text-krem/60 hover:bg-white/8 hover:text-krem')}
        >
          <Icon icon={collapsed ? 'tabler:layout-sidebar-left-expand' : 'tabler:layout-sidebar-left-collapse'} className="size-5" />
        </button>
      </div>

      <nav className="mt-8 flex flex-col gap-1" aria-label="Panel bo‘limlari">
        {NAV.map((n) => link(n))}
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        {link(SETTINGS)}
        <a
          href="/"
          aria-label={collapsed ? 'Bosh sahifa' : undefined}
          className={cn(
            'group relative flex h-10 items-center gap-3 rounded-full text-[13px] transition-colors',
            light ? 'text-ink/55 hover:text-ink' : 'text-krem/55 hover:text-krem',
            collapsed ? 'justify-center' : 'px-4',
          )}
        >
          <Icon icon="tabler:arrow-back-up" className="size-4 shrink-0" />
          {label('Bosh sahifa')}
          <Tip show={collapsed}>Bosh sahifa</Tip>
        </a>
      </div>
    </motion.aside>
  )

  // bo‘lim havolasi: asosiy menyu va pastdagi Sozlamalar uchun bir xil
  function link(n: (typeof ALL_PAGES)[number]) {
    const on = n.id === active
    return (
      <a
        key={n.id}
        href={pagePath(n.id)}
        onClick={(e) => {
          // Ctrl/Cmd/Shift yoki o‘rta tugma — brauzerning o‘zi yangi tab/oyna ochsin
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
          e.preventDefault()
          onNavigate(n.id)
        }}
        aria-current={on ? 'page' : undefined}
        aria-label={collapsed ? n.label : undefined}
        className={cn(
          'group relative flex h-11 items-center gap-3 rounded-full text-left text-[14px] font-medium transition-colors duration-200',
          collapsed ? 'justify-center px-0' : 'px-4',
          on ? 'bg-orik text-ink' : light ? 'text-ink/70 hover:bg-ink/5 hover:text-ink' : 'text-krem/70 hover:bg-white/6 hover:text-krem',
        )}
      >
        <Icon icon={n.icon} className="size-5 shrink-0" />
        {label(n.label)}
        <Tip show={collapsed}>{n.label}</Tip>
      </a>
    )
  }
}


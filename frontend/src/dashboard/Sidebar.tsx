import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@iconify/react'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'

export const NAV = [
  { id: 'xarita', icon: 'tabler:map-2', label: 'Jonli xarita' },
  { id: 'chorrahalar', icon: 'tabler:traffic-lights', label: 'Chorrahalar' },
  { id: 'tahlil', icon: 'tabler:chart-area-line', label: 'AI tahlil' },
  { id: 'tez-yordam', icon: 'tabler:ambulance', label: 'Tez yordam' },
  { id: 'hodisalar', icon: 'tabler:bell', label: 'Hodisalar' },
]

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
}: {
  active: string
  collapsed: boolean
  onNavigate: (id: string) => void
  onToggle: () => void
}) {
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
      className="sticky top-3 hidden h-[calc(100svh-24px)] shrink-0 flex-col rounded-[28px] bg-ink p-4 text-krem lg:flex"
    >
      <div className={cn('flex items-center', collapsed ? 'flex-col gap-3' : 'justify-between pl-2 pt-1')}>
        <a href="/" className="flex items-center" aria-label="OQIM bosh sahifa">
          <img
            src={collapsed ? '/brand/favicon.svg' : '/brand/oqim-horizontal-dark.svg'}
            alt="OQIM"
            className={collapsed ? 'size-11 rounded-[14px]' : 'h-10 w-auto'}
          />
        </a>
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Panelni kengaytirish' : 'Panelni yig‘ish'}
          aria-expanded={!collapsed}
          title={`${collapsed ? 'Kengaytirish' : 'Yig‘ish'} ( [ )`}
          className="grid size-9 shrink-0 place-items-center rounded-full text-krem/60 transition-colors hover:bg-white/8 hover:text-krem"
        >
          <Icon icon={collapsed ? 'tabler:layout-sidebar-left-expand' : 'tabler:layout-sidebar-left-collapse'} className="size-5" />
        </button>
      </div>

      <nav className="mt-8 flex flex-col gap-1" aria-label="Panel bo‘limlari">
        {NAV.map((n) => {
          const on = n.id === active
          return (
            <button
              key={n.id}
              onClick={() => onNavigate(n.id)}
              aria-current={on}
              aria-label={collapsed ? n.label : undefined}
              className={cn(
                'group relative flex h-11 items-center gap-3 rounded-full text-left text-[14px] font-medium transition-colors duration-200',
                collapsed ? 'justify-center px-0' : 'px-4',
                on ? 'bg-orik text-ink' : 'text-krem/70 hover:bg-white/6 hover:text-krem',
              )}
            >
              <Icon icon={n.icon} className="size-5 shrink-0" />
              {label(n.label)}
              <Tip show={collapsed}>{n.label}</Tip>
            </button>
          )
        })}
      </nav>

      {/* pastki promo karta: telefonni GPS-qurilma sifatida ulash; yig‘ilganda — bitta ikonka */}
      <div className="mt-auto">
        {collapsed ? (
          <a href="/gps" aria-label="GPS kuzatuv" className="group relative mx-auto grid size-11 place-items-center rounded-2xl bg-orik text-ink">
            <Icon icon="tabler:device-mobile" className="size-5" />
            <Tip show>GPS kuzatuv</Tip>
          </a>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }} className="rounded-[22px] bg-[linear-gradient(160deg,#2a2622,#171513)] p-4 ring-1 ring-inset ring-white/8">
            <span className="grid size-10 place-items-center rounded-2xl bg-orik text-ink">
              <Icon icon="tabler:device-mobile" className="size-5" />
            </span>
            <p className="mt-4 font-display text-[17px] font-bold leading-tight tracking-[-0.02em]">Telefoningizni ulang</p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-krem/60">Telefon GPS’i xaritada haqiqiy mashina sifatida chiqadi.</p>
            <a href="/gps" className="mt-4 flex h-10 items-center justify-center gap-1.5 rounded-full bg-krem text-[13px] font-medium text-ink transition-colors hover:bg-white">
              GPS kuzatuv <Icon icon="tabler:arrow-right" className="size-4" />
            </a>
          </motion.div>
        )}
      </div>

      <a
        href="/"
        aria-label={collapsed ? 'Bosh sahifa' : undefined}
        className={cn('group relative mt-3 flex h-10 items-center gap-3 rounded-full text-[13px] text-krem/55 transition-colors hover:text-krem', collapsed ? 'justify-center' : 'px-4')}
      >
        <Icon icon="tabler:arrow-back-up" className="size-4 shrink-0" />
        {label('Bosh sahifa')}
        <Tip show={collapsed}>Bosh sahifa</Tip>
      </a>
    </motion.aside>
  )
}

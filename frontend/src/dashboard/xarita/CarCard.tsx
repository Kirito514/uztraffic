import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { CAR_COLORS } from './sim/carLayer'
import type { CarInfo } from './sim/protocol'
import { COLOR_NAMES, ownerOf, type Owner } from './sim/owner'

/* Tanlangan mashina kartochkasi: model va raqam, tezlik, holat va sababi, ko‘cha, bo‘lak, keyingi burilish,
   oldidagi svetofor, egasi. Mashina — simulyatsiya, egasi — to‘qima; kartochka buni yashirmaydi. */

const STATE: Record<CarInfo['state'], { label: string; icon: string; color: string }> = {
  red: { label: 'Qizil chiroqda kutmoqda', icon: 'tabler:traffic-lights', color: '#e5534b' },
  queue: { label: 'Tirbandlikda turibdi', icon: 'tabler:cars', color: '#f0a43a' },
  accel: { label: 'Tezlashmoqda', icon: 'tabler:trending-up', color: '#4cc38a' },
  brake: { label: 'Tormozlamoqda', icon: 'tabler:hand-stop', color: '#f0a43a' },
  cruise: { label: 'Bir tekis harakatda', icon: 'tabler:arrow-narrow-right', color: '#4cc38a' },
}
const TURN: Record<CarInfo['turn'], { label: string; icon: string }> = {
  straight: { label: 'To‘g‘riga', icon: 'tabler:arrow-up' },
  right: { label: 'O‘ngga', icon: 'tabler:corner-up-right' },
  left: { label: 'Chapga', icon: 'tabler:corner-up-left' },
  uturn: { label: 'Orqaga qaytadi', icon: 'tabler:arrow-back-up' },
  end: { label: 'Yo‘l tugaydi', icon: 'tabler:point' },
}
const ROAD: Record<string, string> = {
  motorway: 'Avtomagistral',
  trunk: 'Magistral',
  primary: 'Asosiy ko‘cha',
  secondary: 'Ikkinchi darajali',
  tertiary: 'Uchinchi darajali',
  residential: 'Turar-joy ko‘chasi',
  living_street: 'Mahalla ko‘chasi',
  unclassified: 'Kichik ko‘cha',
}
const LIGHT = [
  { label: 'qizil', color: '#e5534b' },
  { label: 'sariq', color: '#f0a43a' },
  { label: 'yashil', color: '#4cc38a' },
]

/* Kichik kartochka — mashina bosilganda uning yonida: kimligi, tezligi, holati va “Kuzatish” */
export function CarPeek({ info, dark, onFollow, onClose }: { info: CarInfo; dark: boolean; onFollow: () => void; onClose: () => void }) {
  const st = STATE[info.state]
  const owner = ownerOf(info.slot, info.gen)
  const muted = dark ? 'text-krem/55' : 'text-ash'
  return (
    <div className={cn('w-[232px] rounded-[18px] p-3 text-[12.5px] shadow-[0_16px_40px_-16px_rgb(12_11_10/0.55)] ring-1', dark ? 'bg-ink-2/95 text-krem ring-white/10' : 'bg-white/95 text-ink ring-black/5')}>
      <div className="flex items-center gap-2">
        <span className="size-3.5 shrink-0 rounded-[4px] ring-1 ring-black/15" style={{ background: CAR_COLORS[info.color] }} />
        <p className="min-w-0 flex-1 truncate font-semibold">{owner.model}</p>
        <button onClick={onClose} aria-label="Yopish" className={cn('grid size-6 shrink-0 place-items-center rounded-full', dark ? 'hover:bg-white/8' : 'hover:bg-ink/5')}>
          <Icon icon="tabler:x" className="size-3.5" />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Plate plate={owner.plate} />
        <p className="font-display text-[20px] font-bold leading-none tabular-nums">
          {Math.round(info.speed)}
          <span className={cn('ml-0.5 font-sans text-[11px] font-medium', muted)}>km/s</span>
        </p>
      </div>
      <p className={cn('mt-2 flex items-center gap-1.5 text-[12px]', muted)}>
        <Icon icon={st.icon} className="size-3.5" style={{ color: st.color }} />
        {st.label}
      </p>
      <button onClick={onFollow} className={cn('mt-2.5 flex h-8 w-full items-center justify-center gap-1.5 rounded-full text-[12px] font-medium', dark ? 'bg-krem text-ink hover:bg-white' : 'bg-ink text-krem hover:bg-ink-2')}>
        <Icon icon="tabler:focus-centered" className="size-3.5" /> Kuzatish
      </button>
    </div>
  )
}

/* To‘liq ma’lumot — kuzatish paytida yon panelda */
export function CarCard({
  info,
  dark,
  following,
  onFollow,
  onClose,
  className,
}: {
  info: CarInfo
  dark: boolean
  following: boolean
  onFollow: () => void
  onClose: () => void
  className?: string
}) {
  const st = STATE[info.state]
  const turn = TURN[info.turn]
  const muted = dark ? 'text-krem/55' : 'text-ash'
  const sub = dark ? 'bg-white/[0.06]' : 'bg-ink/[0.04]'
  const speed = Math.round(info.speed)
  const owner = ownerOf(info.slot, info.gen)
  // ixcham kataklar: yon panelda scrollsiz sig‘sin
  const tiles: { k: string; v: React.ReactNode; wide?: boolean }[] = [
    {
      k: 'Ko‘cha',
      wide: true,
      v: (
        <>
          {info.road || 'Nomsiz ko‘cha'}
          <span className={cn('ml-1.5 text-[11.5px] font-normal', muted)}>{ROAD[info.hw.replace('_link', '')] ?? info.hw}</span>
        </>
      ),
    },
    { k: 'Bo‘lak', v: `${info.lane} / ${info.lanes}` },
    {
      k: 'Burilish',
      v: (
        <span className="inline-flex items-center gap-1">
          <Icon icon={turn.icon} className="size-4" /> {turn.label}
        </span>
      ),
    },
    {
      k: 'Oldindagi svetofor',
      wide: true,
      v: info.signal ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: LIGHT[info.signal.state].color }} />
          {LIGHT[info.signal.state].label} · {Math.round(info.signal.dist)} m
        </span>
      ) : (
        <span className={cn('font-normal', muted)}>yo‘q</span>
      ),
    },
  ]
  const odo = info.odo < 1000 ? `${Math.round(info.odo)} m` : `${(info.odo / 1000).toFixed(1)} km`

  return (
    <div
      className={cn(
        'flex flex-col rounded-[22px] p-3.5 text-[13px] shadow-[0_20px_50px_-18px_rgb(12_11_10/0.55)] ring-1',
        className,
        dark ? 'bg-ink-2/95 text-krem ring-white/10' : 'bg-white/95 text-ink ring-black/5',
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="size-4 shrink-0 rounded-[5px] ring-1 ring-black/15" style={{ background: CAR_COLORS[info.color] }} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{owner.model}</p>
          <p className={cn('text-[11.5px]', muted)}>
            {COLOR_NAMES[info.color]} · #{info.slot + 1} · simulyatsiya
          </p>
        </div>
        <button onClick={onClose} aria-label="Yopish" className={cn('grid size-7 place-items-center rounded-full', dark ? 'hover:bg-white/8' : 'hover:bg-ink/5')}>
          <Icon icon="tabler:x" className="size-4" />
        </button>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <Plate plate={owner.plate} />
        <p className="font-display text-[28px] font-bold leading-none tabular-nums tracking-[-0.03em]">
          {speed}
          <span className={cn('ml-1 font-sans text-[11.5px] font-medium tracking-normal', muted)}>km/soat</span>
        </p>
      </div>
      <p className={cn('mt-2 inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[11.5px] font-medium', sub)}>
        <Icon icon={st.icon} className="size-3.5" style={{ color: st.color }} />
        {st.label}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <div className={cn('h-1.5 flex-1 overflow-hidden rounded-full', sub)}>
          <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.min(100, (info.speed / Math.max(info.limit, 1)) * 100)}%`, background: st.color }} />
        </div>
        <span className={cn('text-[11px]', muted)}>chegara {info.limit}</span>
      </div>

      <dl className="mt-2.5 grid grid-cols-2 gap-1.5">
        {tiles.map((t) => (
          <div key={t.k} className={cn('rounded-xl px-2.5 py-1.5', sub, t.wide && 'col-span-2')}>
            <dt className={cn('text-[10.5px]', muted)}>{t.k}</dt>
            <dd className="mt-0.5 text-[12.5px] font-semibold leading-snug">{t.v}</dd>
          </div>
        ))}
      </dl>
      <p className={cn('mt-1.5 px-1 text-[11.5px]', muted)}>
        Kutgan <b className={dark ? 'text-krem' : 'text-ink'}>{Math.round(info.wait)} s</b> · yurgan <b className={dark ? 'text-krem' : 'text-ink'}>{odo}</b>
      </p>

      <div className={cn('mt-2.5 flex items-center gap-2.5 rounded-xl px-2.5 py-1.5', sub)}>
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold', dark ? 'bg-white/10' : 'bg-white ring-1 ring-black/5')}>
          {owner.name
            .split(' ')
            .map((w) => w[0])
            .join('')}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-[11px]', muted)}>Egasi · to‘qima</p>
          <p className="truncate font-semibold leading-tight">{owner.name}</p>
        </div>
        <KindChip kind={owner.kind} dark={dark} />
      </div>

      {/* bo‘sh joy tugmani panel pastiga suradi (kamida 12 px) */}
      <div className="min-h-2.5 flex-1" />
      <button
        onClick={onFollow}
        className={cn(
          'flex h-9 w-full shrink-0 items-center justify-center gap-2 rounded-full text-[12.5px] font-medium transition-colors',
          following ? 'bg-orik text-ink' : dark ? 'bg-krem text-ink hover:bg-white' : 'bg-ink text-krem hover:bg-ink-2',
        )}
      >
        <Icon icon={following ? 'tabler:focus-2' : 'tabler:focus-centered'} className="size-4" />
        {following ? 'Kuzatilmoqda — to‘xtatish' : 'Kuzatish'}
      </button>
    </div>
  )
}

/* O‘zbekiston davlat raqami: chapda viloyat kodi, o‘ngda bayroq va UZ */
function Plate({ plate, className }: { plate: Owner['plate']; className?: string }) {
  return (
    <div className={cn('inline-flex h-7 items-stretch overflow-hidden rounded-[5px] bg-white font-mono text-[13.5px] font-bold tracking-[0.04em] text-ink ring-[1.5px] ring-ink', className)}>
      <span className="grid place-items-center border-r-[1.5px] border-ink px-1.5">{plate.region}</span>
      <span className="grid place-items-center px-2">{plate.rest}</span>
      <span className="flex flex-col items-center justify-center gap-[1px] pr-1.5">
        <span className="flex h-[7px] w-[11px] flex-col overflow-hidden rounded-[1px] ring-[0.5px] ring-black/20">
          <span className="flex-1 bg-[#1eb5e8]" />
          <span className="h-[1px] bg-[#ce1126]" />
          <span className="flex-1 bg-white" />
          <span className="h-[1px] bg-[#ce1126]" />
          <span className="flex-1 bg-[#1eb53a]" />
        </span>
        <span className="text-[7px] leading-none tracking-normal">UZ</span>
      </span>
    </div>
  )
}

function KindChip({ kind, dark }: { kind: Owner['kind']; dark: boolean }) {
  const icon = kind === 'Taksi' ? 'tabler:car-garage' : kind === 'Xizmat' ? 'tabler:building' : 'tabler:user'
  return (
    <span className={cn('inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium', dark ? 'bg-white/10' : 'bg-white ring-1 ring-black/5')}>
      <Icon icon={icon} className="size-3.5" />
      {kind}
    </span>
  )
}

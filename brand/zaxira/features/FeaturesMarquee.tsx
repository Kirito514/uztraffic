import { FEATURES, type Feature } from '@/data/features'

/* E — Lenta: ikki qator kartalar qarama-qarshi tomonga to‘xtovsiz oqadi (CSS, faqat transform).
   Kursor ustida to‘xtaydi. Ro‘yxat ikki marta takrorlanadi — -50% siljishda chok ko‘rinmaydi. */
function Row({ items, reverse }: { items: Feature[]; reverse?: boolean }) {
  const loop = [...items, ...items]
  return (
    <div className="marquee group flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <div className={`marquee-track flex w-max gap-4 pr-4 ${reverse ? 'marquee-reverse' : ''}`}>
        {loop.map((f, k) => (
          <a
            key={k}
            href="#qanday"
            aria-hidden={k >= items.length}
            tabIndex={k >= items.length ? -1 : 0}
            className="relative isolate flex h-[300px] w-[min(420px,80vw)] shrink-0 flex-col justify-end overflow-hidden rounded-[28px] p-6 text-white"
          >
            <img src={f.img} alt={k >= items.length ? '' : f.alt} className="absolute inset-0 -z-10 h-full w-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,transparent_35%,rgb(12_11_10/0.82))]" />
            <span className="mb-auto w-fit rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-ink">{f.chip}</span>
            <h3 className="font-display text-[24px] font-bold tracking-[-0.025em]">{f.title}</h3>
            <p className="mt-1.5 text-[14px] leading-snug text-white/75">{f.text}</p>
          </a>
        ))}
      </div>
    </div>
  )
}

export function FeaturesMarquee() {
  return (
    <div className="mt-14 flex flex-col gap-4">
      <Row items={FEATURES.slice(0, 3).concat(FEATURES.slice(3))} />
      <Row items={FEATURES.slice(3).concat(FEATURES.slice(0, 3))} reverse />
    </div>
  )
}

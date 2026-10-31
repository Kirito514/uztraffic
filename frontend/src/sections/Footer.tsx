const PHOTO_CREDITS = [
  ['samigov96', 'Sarvar Samigov'],
  ['tsvetoslav', 'tsvetoslav'],
  ['morekaccino', 'morekaccino'],
  ['mfrazi', 'mfrazi'],
  ['shellingfordyu', 'shellingfordyu'],
  ['tamas_tuzeskatai', 'Tamas Tuzes-Katai'],
  ['babanov', 'babanov'],
  ['canmehmet', 'Mehmet Can Özgümüş'],
  ['pl_gt', 'pl_gt'],
]

export function Footer() {
  return (
    <footer className="mx-auto max-w-[1200px] px-5 py-12 text-[13px] text-ash md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-6 border-b border-line pb-8">
        <img src="/brand/oqim-horizontal.svg" alt="OQIM" className="-ml-2 h-11 w-auto" />
        <nav className="flex flex-wrap gap-6 text-ink/80">
          <a href="/dashboard" className="hover:text-ink">Jonli xarita</a>
          <a href="/gps" className="hover:text-ink">GPS kuzatuv</a>
          <a href="/docs" className="hover:text-ink">API</a>
        </nav>
      </div>
      <div className="flex flex-wrap justify-between gap-4 pt-6 text-[12px]">
        <p>© 2026 OQIM AI · Guruh 4 · Sun’iy intellekt asoslari</p>
        <p className="max-w-[620px]">
          Fotosuratlar:{' '}
          {PHOTO_CREDITS.map(([u, n], i) => (
            <span key={u}>
              <a href={`https://unsplash.com/@${u}`} className="underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
                {n}
              </a>
              {i < PHOTO_CREDITS.length - 1 ? ', ' : ''}
            </span>
          ))}{' '}
          / Unsplash
        </p>
      </div>
    </footer>
  )
}

import { useCallback, useEffect, useState, type ComponentType } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { Icon } from '@iconify/react'
import { Sidebar, ALL_PAGES, type PageId } from './Sidebar'
import { useRoute } from './router'
import { CARD, ChromeContext, glassClass, type Chrome } from './chrome'
import { cn } from '@/lib/utils'
import { XaritaPage } from './pages/XaritaPage'
import { ChorrahalarPage } from './pages/ChorrahalarPage'
import { TahlilPage } from './pages/TahlilPage'
import { TezYordamPage } from './pages/TezYordamPage'
import { HodisalarPage } from './pages/HodisalarPage'
import { SozlamalarPage } from './pages/SozlamalarPage'
import { useTheme } from './theme'

const PAGES: Record<PageId, ComponentType> = {
  xarita: XaritaPage,
  chorrahalar: ChorrahalarPage,
  tahlil: TahlilPage,
  'tez-yordam': TezYordamPage,
  hodisalar: HodisalarPage,
  sozlamalar: SozlamalarPage,
}
const IDS = ALL_PAGES.map((n) => n.id)

/* Dashboard qobig‘i: sidebar + sarlavha; har bo‘lim alohida sahifa (/dashboard/<id>) */
export function Dashboard() {
  const [page, go] = useRoute(IDS)
  const label = ALL_PAGES.find((n) => n.id === page)!.label
  const Page = PAGES[page]
  const [chrome, setChrome] = useState<Chrome>(CARD)
  const [actions, setActions] = useState<HTMLElement | null>(null)
  const glassSidebar = chrome.full && chrome.sidebar === 'glass'
  const { tone } = useTheme()
  const dark = chrome.full ? chrome.glass === 'dark' : tone === 'dark'

  useEffect(() => {
    document.title = `${label} — OQIM`
  }, [label])

  // yig‘ilgan sidebar holati brauzerda eslab qolinadi; “[” tugmasi bilan ham almashadi
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('oqim.sidebar') === 'narrow'
    } catch {
      return false
    }
  })
  const toggleSidebar = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem('oqim.sidebar', c ? 'wide' : 'narrow')
      } catch {
        /* xususiy rejim — eslab qolmaymiz */
      }
      return !c
    })
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '[' && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|TEXTAREA/.test(t.tagName)) toggleSidebar()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [toggleSidebar])

  return (
    <MotionConfig reducedMotion="user">
      <ChromeContext.Provider value={{ chrome, setChrome, actions }}>
        {/* full: fon (xarita) sahifaning o‘zida, qobiq ustidan o‘tkazuvchan — faqat boshqaruvlar bosiladi */}
        <div className={cn('relative z-10 flex min-h-svh gap-5 p-3 pr-3 md:pr-5', chrome.full ? 'pointer-events-none h-svh' : dark ? 'bg-[#121110] text-krem' : 'bg-mist')}>
          <Sidebar active={page} collapsed={collapsed} onNavigate={go} onToggle={toggleSidebar} surface={glassSidebar ? `glass-${chrome.glass}` : 'solid'} />

          <main className="flex min-w-0 flex-1 flex-col py-3 pl-2 lg:pl-0">
            {/* telefon: ixcham sarlavha */}
            <div className="pointer-events-auto mb-4 flex items-center justify-between lg:hidden">
              <a href="/" aria-label="OQIM bosh sahifa">
                <img src="/brand/oqim-horizontal.svg" alt="OQIM" className="h-10 w-auto" />
              </a>
            </div>

            {/* sahifa almashganda: tez, bouncesiz o‘tish — eskisi so‘nadi, yangisi biroz pastdan chiqadi */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={page}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
                className="flex flex-1 flex-col"
              >
                <div className="flex items-center justify-between gap-3">
                  <header className={cn(chrome.full && cn('pointer-events-auto self-start rounded-[22px] px-5 py-3', glassClass(chrome.glass)))}>
                    <p className={cn('flex items-center gap-1.5 text-[13px]', dark ? 'text-krem/60' : 'text-ash')}>
                      Toshkent <Icon icon="tabler:chevron-right" className="size-3.5" /> Markaz
                    </p>
                    <h1 className="mt-1 font-display text-[clamp(28px,3vw,38px)] font-bold leading-none tracking-[-0.035em]">{label}</h1>
                  </header>
                  {/* sahifaning o‘z tugmalari (xaritada: rejim, sozlamalar…) — sarlavha bilan bir qatorda */}
                  <div ref={setActions} className="pointer-events-auto flex items-center gap-2" />
                </div>
                <div className={cn('flex min-h-0 flex-1 flex-col', chrome.full ? 'mt-3' : 'mt-6')}>
                  <Page />
                </div>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </ChromeContext.Provider>
    </MotionConfig>
  )
}

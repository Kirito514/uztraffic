import { createContext, useContext, useEffect } from 'react'

/* Dashboard “qobig‘i”ning ko‘rinishi — sahifa o‘zi tanlaydi (masalan, xarita to‘liq ekranga chiqadi).
   card  — oddiy: och fon, sidebar to‘q, kontent kartalarda.
   full  — sahifa fonini to‘liq egallaydi (xarita), sarlavha va boshqaruvlar shisha ustida. */
export type Chrome = {
  full: boolean
  glass: 'light' | 'dark' // shisha sirtlar tusi
  sidebar: 'solid' | 'glass'
}
export const CARD: Chrome = { full: false, glass: 'light', sidebar: 'solid' }

/* actions — sarlavha qatorining o‘ng tomonidagi joy: sahifa o‘z tugmalarini shu yerga chiqaradi (portal) */
export const ChromeContext = createContext<{ chrome: Chrome; setChrome: (c: Chrome) => void; actions: HTMLElement | null }>({
  chrome: CARD,
  setChrome: () => {},
  actions: null,
})

export const useChrome = () => useContext(ChromeContext).chrome
export const usePageActions = () => useContext(ChromeContext).actions

/* Sahifa ochiq turganda qobiq ko‘rinishini belgilaydi, chiqib ketganda odatiyga qaytaradi */
export function useSetChrome(c: Chrome) {
  const { setChrome } = useContext(ChromeContext)
  const key = `${c.full}-${c.glass}-${c.sidebar}`
  useEffect(() => {
    setChrome(c)
    return () => setChrome(CARD)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setChrome])
}

/* Shisha sirt: fon xiralashadi (backdrop-filter). Harakatdagi elementga qo‘yilmaydi — faqat turg‘unlariga */
export const glassClass = (tone: 'light' | 'dark') =>
  tone === 'light'
    ? 'bg-white/60 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-white/70 shadow-[0_16px_48px_-20px_rgb(12_11_10/0.35)]'
    : 'bg-ink/55 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-white/10 shadow-[0_16px_48px_-20px_rgb(0_0_0/0.6)] text-krem'

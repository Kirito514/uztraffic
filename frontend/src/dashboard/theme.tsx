import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/* Dashboard mavzusi: och yoki to‘q shisha. “Tizim” — kompyuterning o‘z sozlamasiga ergashadi.
   Tanlov shu brauzerda eslab qolinadi. */
export type ThemePref = 'light' | 'dark' | 'system'
export type Tone = 'light' | 'dark'

const KEY = 'oqim.theme'
const Ctx = createContext<{ pref: ThemePref; tone: Tone; setPref: (p: ThemePref) => void }>({ pref: 'light', tone: 'light', setPref: () => {} })

const systemTone = (): Tone => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => {
    try {
      const v = localStorage.getItem(KEY)
      return v === 'dark' || v === 'system' ? v : 'light'
    } catch {
      return 'light'
    }
  })
  const [sys, setSys] = useState<Tone>(systemTone)

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => setSys(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const setPref = (p: ThemePref) => {
    setPrefState(p)
    try {
      localStorage.setItem(KEY, p)
    } catch {
      /* saqlash yopiq — faqat shu sessiya */
    }
  }

  const tone = pref === 'system' ? sys : pref
  return <Ctx.Provider value={{ pref, tone, setPref }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)

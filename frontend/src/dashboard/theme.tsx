import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/* Dashboard mavzusi: och yoki to‘q shisha. “Tizim” — kompyuterning o‘z sozlamasiga ergashadi.
   Harakat: “tizim” — kompyuterda animatsiya kamaytirilgan bo‘lsa kamayadi; “kam” — har doim kamaytirilgan.
   Tanlovlar shu brauzerda eslab qolinadi. */
export type ThemePref = 'light' | 'dark' | 'system'
export type Tone = 'light' | 'dark'
export type MotionPref = 'system' | 'reduce'

const KEY = 'oqim.theme'
const MOTION_KEY = 'oqim.motion'
type Theme = { pref: ThemePref; tone: Tone; setPref: (p: ThemePref) => void; motion: MotionPref; setMotion: (m: MotionPref) => void }
const Ctx = createContext<Theme>({ pref: 'light', tone: 'light', setPref: () => {}, motion: 'system', setMotion: () => {} })

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const write = (key: string, v: string) => {
  try {
    localStorage.setItem(key, v)
  } catch {
    /* saqlash yopiq — faqat shu sessiya */
  }
}

const systemTone = (): Tone => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => {
    const v = read(KEY)
    return v === 'dark' || v === 'system' ? v : 'light'
  })
  const [motion, setMotionState] = useState<MotionPref>(() => (read(MOTION_KEY) === 'reduce' ? 'reduce' : 'system'))
  const [sys, setSys] = useState<Tone>(systemTone)

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => setSys(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const setPref = (p: ThemePref) => {
    setPrefState(p)
    write(KEY, p)
  }
  const setMotion = (m: MotionPref) => {
    setMotionState(m)
    write(MOTION_KEY, m)
  }

  const tone = pref === 'system' ? sys : pref
  return <Ctx.Provider value={{ pref, tone, setPref, motion, setMotion }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)

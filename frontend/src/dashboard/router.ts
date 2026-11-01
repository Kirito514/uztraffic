import { useCallback, useEffect, useState } from 'react'

/* Dashboard sahifalari uchun yengil router: har bo‘lim — o‘z manzili (/dashboard/chorrahalar …).
   History API: orqaga/oldinga tugmalari ishlaydi, havolani yangi tabda ochish mumkin.
   Serverda /dashboard/* hammasi dashboard.html’ga qaytariladi (dev’da — vite.config.ts). */
export const BASE = '/dashboard'

export const pagePath = (id: string) => `${BASE}/${id}`

export function useRoute<T extends string>(ids: readonly T[]) {
  const read = useCallback((): T => {
    const slug = location.pathname.slice(BASE.length).replace(/^\/|\/$/g, '')
    return (ids as readonly string[]).includes(slug) ? (slug as T) : ids[0]
  }, [ids])

  const [page, setPage] = useState(read)

  useEffect(() => {
    const onPop = () => setPage(read())
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [read])

  const go = useCallback((id: T) => {
    if (location.pathname !== pagePath(id)) history.pushState(null, '', pagePath(id))
    setPage(id)
    scrollTo({ top: 0 })
  }, [])

  return [page, go] as const
}

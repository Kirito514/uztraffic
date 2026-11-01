import { createPortal } from 'react-dom'
import { usePageActions } from '../chrome'
import { useTone } from '../chorrahalar/shared'
import { TahlilReport } from '../tahlil/TahlilReport'
import { SampleBadge } from '../xarita/ui'

/* AI tahlil — AI va fiks taymer natijalari hisoboti */
export function TahlilPage() {
  const t = useTone()
  const slot = usePageActions()
  return (
    <>
      {slot && createPortal(<SampleBadge tone={t.dark ? 'dark' : 'light'} />, slot)}
      <TahlilReport />
    </>
  )
}

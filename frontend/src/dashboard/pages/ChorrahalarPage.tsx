import { createPortal } from 'react-dom'
import { usePageActions } from '../chrome'
import { ChorrahaControl } from '../chorrahalar/ChorrahaControl'
import { useTone } from '../chorrahalar/shared'
import { SampleBadge } from '../xarita/ui'

/* Chorrahalar — ro‘yxat va tanlangan chorrahaning operator ekrani */
export function ChorrahalarPage() {
  const t = useTone()
  const slot = usePageActions()
  return (
    <>
      {slot && createPortal(<SampleBadge tone={t.dark ? 'dark' : 'light'} />, slot)}
      <ChorrahaControl />
    </>
  )
}

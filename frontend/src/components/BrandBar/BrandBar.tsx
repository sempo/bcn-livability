import { useEffect, useRef, useState } from 'react'
import { IconSearch, IconShare } from '@tabler/icons-react'
import { useSearchStore } from '../../store/searchStore'
import { useStore, URL_DEFAULTS, settingsOf } from '../../store'
import { encodeConfig, shareUrl } from '../../services/urlConfig'

const TOAST_MS = 3000

/**
 * Top-left brand mini-panel: the time2map agency mark (coral, links to time2map.com) + the page
 * heading "Barcelona livability map" as the single <h1>, a search button that opens the search field
 * under it (044) and a Share button (TODO-053). Glass style — see .app-brand / .top-panel.
 */
export function BrandBar() {
  const searchOpen = useSearchStore((s) => s.open)
  const setSearchOpen = useSearchStore((s) => s.setOpen)
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const say = (text: string) => {
    setMessage(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), TOAST_MS)
  }

  async function share() {
    // The settings as they are now, not as the address shows them (it follows after a short pause).
    const url = shareUrl(window.location.href, encodeConfig(settingsOf(useStore.getState()), URL_DEFAULTS))
    const phone = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 768px)').matches
    if (phone && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Barcelona livability map', url })
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return // the person closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      say('Link copied. It opens your map with your conditions.')
    } catch {
      say('Could not copy. Copy the link from the address bar.')
    }
  }

  return (
    <div className="app-brand">
      <a
        className="brand-link"
        href="https://time2map.com"
        target="_blank"
        rel="noopener noreferrer"
        title="Visit time2map.com"
      >
        <img
          className="brand-mark"
          src={`${import.meta.env.BASE_URL}time2map-mark.svg`}
          alt="time2map"
        />
      </a>
      <h1 className="app-title">Barcelona livability map</h1>
      <button type="button" className="brand-share" aria-label="Share this map" title="Share this map" onClick={share}>
        <IconShare size={18} stroke={2} />
      </button>
      <button
        type="button"
        className="brand-search"
        aria-label="Search an area or address"
        aria-expanded={searchOpen}
        aria-pressed={searchOpen}
        onClick={() => setSearchOpen(!searchOpen)}
      >
        <IconSearch size={18} stroke={2} />
      </button>
      {message && <div className="share-toast" role="status">{message}</div>}
    </div>
  )
}

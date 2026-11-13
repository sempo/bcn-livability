import { IconSearch, IconShare } from '@tabler/icons-react'
import { useSearchStore } from '../../store/searchStore'
import { useShare } from '../../hooks/useShare'

/**
 * Top-left brand mini-panel: the time2map agency mark (coral, links to time2map.com) + the page
 * heading "Barcelona livability map" as the single <h1>, a search button that opens the search field
 * under it (044) and a Share button (TODO-053). Glass style — see .app-brand / .top-panel.
 * On a phone it is only the first-visit header; after the onboarding the search pill takes over (TODO-062).
 */
export function BrandBar() {
  const searchOpen = useSearchStore((s) => s.open)
  const setSearchOpen = useSearchStore((s) => s.setOpen)
  const { share, message } = useShare()

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

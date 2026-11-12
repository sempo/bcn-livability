import { IconSearch } from '@tabler/icons-react'
import { useSearchStore } from '../../store/searchStore'

/**
 * Top-left brand mini-panel: the time2map agency mark (coral, links to time2map.com) + the page
 * heading "Barcelona livability map" as the single <h1>, and a search button that opens the search field
 * under it (TODO-044). Glass style — see .app-brand / .top-panel.
 */
export function BrandBar() {
  const searchOpen = useSearchStore((s) => s.open)
  const setSearchOpen = useSearchStore((s) => s.setOpen)
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
    </div>
  )
}

import { IconShare } from '@tabler/icons-react'
import { SearchBox } from '../SearchBox/SearchBox'
import { useShare } from '../../hooks/useShare'

/**
 * Top of the phone layout after the onboarding (TODO-062): one search pill. The product name is its placeholder, so
 * it stays in front of the person until they type; the mark opens "About", and Share sits on the right.
 * The page heading stays for screen readers and search engines.
 */
export function MobileTopBar({ onAbout }: { onAbout: () => void }) {
  const { share, message } = useShare()
  return (
    <div className="mobile-top">
      <h1 className="visually-hidden">Barcelona livability map</h1>
      <SearchBox
        pill
        leftSlot={
          <button type="button" className="pill-button pill-mark" aria-label="About Barcelona livability map" onClick={onAbout}>
            <img src={`${import.meta.env.BASE_URL}time2map-mark.svg`} alt="" />
          </button>
        }
        rightSlot={
          <button type="button" className="pill-button" aria-label="Share this map" onClick={share}>
            <IconShare size={20} stroke={2} />
          </button>
        }
      />
      {message && <div className="share-toast" role="status">{message}</div>}
    </div>
  )
}

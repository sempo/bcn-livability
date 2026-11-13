import { IconInfoCircle } from '@tabler/icons-react'
import { LocateButton } from './LocateButton'
import { MobileLegend } from './MobileLegend'

/** Above the sheet, on the left the colour scale, on the right "About" and "Where am I" (TODO-062). */
export function MapOverlay({ onAbout }: { onAbout: () => void }) {
  return (
    <div className="mobile-map-overlay">
      <MobileLegend />
      <div className="mobile-map-buttons">
        <button type="button" className="round-button" aria-label="About this map" onClick={onAbout}>
          <IconInfoCircle size={22} stroke={1.8} />
        </button>
        <LocateButton />
      </div>
    </div>
  )
}

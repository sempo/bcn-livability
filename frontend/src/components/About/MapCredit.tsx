import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MAP_CREDIT } from '../../services/mapCredit'
import { useAboutStore } from '../../store/aboutStore'

/**
 * The credit line on the map (TODO-066, docs/DATA_LICENSES.md section 6): always visible, never collapsed (ODbL asks
 * for it without a click). Each part links to its source; "Data sources" opens the full list.
 *
 * `compact` (the phone, where the line would cover a strip of a small map): a small "©" button that opens the line,
 * like the compact credit of MapLibre and Mapbox. OSM's guidelines accept that on small screens; one tap shows it.
 */
export function MapCredit({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const { t } = useTranslation('legal')
  const setOpen = useAboutStore((s) => s.setOpen)
  const [shown, setShown] = useState(false)
  if (compact && !shown) {
    return (
      <button type="button" className={`map-credit map-credit--toggle ${className}`.trim()} aria-expanded={false}
        aria-label={t('credit.label')} title={t('credit.label')} onClick={() => setShown(true)}>©</button>
    )
  }
  return (
    <p className={`map-credit ${className}`.trim()} aria-label={t('credit.label')}>
      {MAP_CREDIT.map((part) => (
        <span key={part.source}>
          <a href={part.url} target="_blank" rel="noopener noreferrer">{part.text}</a>
          {' · '}
        </span>
      ))}
      <button type="button" className="map-credit__more" title={t('credit.open')} onClick={() => setOpen(true)}>
        {t('credit.sources')}
      </button>
      {compact && (
        <button type="button" className="map-credit__more map-credit__hide" aria-label={t('dialog.close')} onClick={() => setShown(false)}>×</button>
      )}
    </p>
  )
}

import { useTranslation } from 'react-i18next'
import { MAP_CREDIT } from '../../services/mapCredit'
import { useAboutStore } from '../../store/aboutStore'

/**
 * The credit line on the map (TODO-066, docs/DATA_LICENSES.md section 6): always visible, never collapsed (ODbL asks
 * for it without a click). Each part links to its source; "Data sources" opens the full list.
 */
export function MapCredit({ className = '' }: { className?: string }) {
  const { t } = useTranslation('legal')
  const setOpen = useAboutStore((s) => s.setOpen)
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
    </p>
  )
}

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MAP_CREDIT } from '../../services/mapCredit'
import { useAboutStore } from '../../store/aboutStore'

/**
 * The credit line on the map (TODO-066, docs/DATA_LICENSES.md section 6): always visible, never collapsed (ODbL asks
 * for it without a click). Each part links to its source; "Data sources" opens the full list.
 *
 * `compact` (the phone, where the line would cover a strip of a small map): the line is shown first and folds into a
 * small "©" button after a few seconds or at the first touch of the map; a tap on "©" opens it again. This is the
 * collapse the OSMF attribution guidelines allow: shown first, findable afterwards (and in "About").
 */
export const CREDIT_FOLD_MS = 5000

export function MapCredit({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const { t } = useTranslation('legal')
  const setOpen = useAboutStore((s) => s.setOpen)
  const [shown, setShown] = useState(true)
  useEffect(() => {
    if (!compact || !shown) return
    const fold = () => setShown(false)
    const timer = setTimeout(fold, CREDIT_FOLD_MS)
    const onPointer = (e: Event) => { if (e.target instanceof Element && e.target.closest('.maplibregl-map')) fold() }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('wheel', onPointer, { passive: true })
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('wheel', onPointer)
    }
  }, [compact, shown])
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

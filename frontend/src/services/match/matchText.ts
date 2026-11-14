import i18n from '../../i18n'
import { formatNumber } from '../../i18n/format'

// Short texts of the match header rows (TODO-050). Compact on purpose: the full sentences stay in the
// per-condition blocks of the card (buildingCardText.ts). The wording is in the language files (conditions: match.*).

const eur = (n: number) => `€${formatNumber(n, { maximumFractionDigits: 0 })}`

/** "57 dB, under your 65" / "72 dB, 7 dB over your 65" */
export function noiseText(lden: number, limit: number): string {
  const db = Math.round(lden)
  return db <= limit
    ? i18n.t('conditions:match.noiseUnder', { db, limit })
    : i18n.t('conditions:match.noiseOver', { db, diff: db - limit, limit })
}

/** "7 of 10 within 10 min" */
export function poiText(within: number, total: number, limit: number): string {
  return i18n.t('conditions:match.poi', { within, total, limit })
}

/** "12 of 13 places within 30 min" */
export function cityCoreText(within: number, total: number, limit: number): string {
  return i18n.t('conditions:match.cityCore', { within, count: total, limit })
}

/** "€3,325/m², under your €4,000" / "€4,600/m², 15% over your €4,000" */
export function priceText(eurM2: number, budget: number): string {
  if (eurM2 <= budget) return i18n.t('conditions:match.priceUnder', { price: eur(eurM2), budget: eur(budget) })
  return i18n.t('conditions:match.priceOver', {
    price: eur(eurM2), pct: Math.round((100 * (eurM2 - budget)) / budget), budget: eur(budget),
  })
}

/** "rated 7.6, your minimum 7.5" */
export function localsText(rating: number, min: number): string {
  const one = { minimumFractionDigits: 1, maximumFractionDigits: 1 }
  return i18n.t('conditions:match.locals', { rating: formatNumber(rating, one), min: formatNumber(min, one) })
}

/** The era of the building, or that its year is unknown. */
export function ageText(era: string | null): string {
  return era ?? i18n.t('conditions:match.ageUnknown')
}

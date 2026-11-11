// Short texts of the match header rows (TODO-050). Compact on purpose: the full sentences stay in the
// per-condition blocks of the card (buildingCardText.ts).

const eur = (n: number) => `€${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)}`

/** "57 dB, under your 65" / "72 dB, 7 dB over your 65" */
export function noiseText(lden: number, limit: number): string {
  const db = Math.round(lden)
  return db <= limit ? `${db} dB, under your ${limit}` : `${db} dB, ${db - limit} dB over your ${limit}`
}

/** "7 of 10 within 10 min" */
export function poiText(within: number, total: number, limit: number): string {
  return `${within} of ${total} within ${limit} min`
}

/** "12 of 13 places within 30 min" */
export function cityCoreText(within: number, total: number, limit: number): string {
  return `${within} of ${total} ${total === 1 ? 'place' : 'places'} within ${limit} min`
}

/** "€3,325/m², under your €4,000" / "€4,600/m², 15% over your €4,000" */
export function priceText(eurM2: number, budget: number): string {
  if (eurM2 <= budget) return `${eur(eurM2)}/m², under your ${eur(budget)}`
  return `${eur(eurM2)}/m², ${Math.round((100 * (eurM2 - budget)) / budget)}% over your ${eur(budget)}`
}

/** "rated 7.6, your minimum 7.5" */
export function localsText(rating: number, min: number): string {
  return `rated ${rating.toFixed(1)}, your minimum ${min.toFixed(1)}`
}

/** The era of the building, or that its year is unknown. */
export function ageText(era: string | null): string {
  return era ?? 'year of construction unknown'
}

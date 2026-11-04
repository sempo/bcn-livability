// Plain-language texts of the building card (TODO-046, "Card texts").

export const USE_LABEL: Record<string, string> = {
  '1_residential': 'Residential',
  '2_agriculture': 'Agricultural',
  '3_industrial': 'Industrial',
  '4_1_office': 'Offices',
  '4_2_retail': 'Retail',
  '4_3_publicServices': 'Public services',
}

/** ACA river flood zone the building touches (036). */
export function riverText(zone: number | undefined): string {
  if (zone === 10) return 'In the 10-year river flood zone — high probability (about once in 10 years)'
  if (zone === 100) return 'In the 100-year river flood zone — medium probability'
  if (zone === 500) return 'In the 500-year river flood zone — low probability (the official floodable zone)'
  return 'Outside mapped river flood zones'
}

/** Depth as shown: the model's deep spots next to sunken roads read as ≥ 50 cm. */
export function depthText(cm: number): string {
  return cm >= 50 ? '≥ 50 cm' : `${Math.round(cm)} cm`
}

/** What a water depth at the door means. */
export function depthMeaning(cm: number): string {
  if (cm < 10) return 'stays in the gutter'
  if (cm < 30) return 'over the kerb, reaches doorsteps'
  if (cm < 50) return 'gets into ground floors and car parks'
  return 'serious damage, cars can float'
}

/** Street flooding at the building's door in heavy rain (RESCCUE, Barcelona only). */
export function doorWaterText(t10: number | undefined, t100: number | undefined): string {
  if (t10 === undefined && t100 === undefined) return 'No street-flooding model outside Barcelona'
  const [a, b] = [t10 ?? 0, t100 ?? 0]
  if (a < 1 && b < 1) return 'No water at the door modelled in heavy rain'
  return `Water at the door: ${depthText(a)} in a 10-year rain, ${depthText(b)} in a 100-year rain — ${depthMeaning(Math.max(a, b))}`
}

/** Ground floors, basements and garages are what floods; the card says so when water or a river zone is there. */
export function groundFloorWarning(
  t10: number | undefined, t100: number | undefined, riverZone: number | undefined, floorsBelow: number | undefined,
): string | null {
  if (Math.max(t10 ?? 0, t100 ?? 0) < 10 && riverZone === undefined) return null
  const below = floorsBelow ? ` This building has ${floorsBelow} floor${floorsBelow > 1 ? 's' : ''} below ground.` : ''
  return `Careful if you are looking at a ground-floor flat, basement or garage.${below}`
}

const SIDE = { street: 'Street side', inner: 'Courtyard side' } as const

/** "Street side 72 dB · night 64" */
export function sideText(side: keyof typeof SIDE, lden: number | undefined, ln: number | undefined): string | null {
  if (lden === undefined) return null
  return `${SIDE[side]}: ${Math.round(lden)} dB${ln !== undefined ? ` · night ${Math.round(ln)}` : ''}`
}

// ── The building against the user's conditions (049) ────────────────────────────────────────────────────────

const eur = (n: number) => `€${new Intl.NumberFormat('en-ES', { maximumFractionDigits: 0 }).format(n)}`

/** "62 dB — within your 65 dB" / "72 dB — 7 dB over your 65 dB" */
export function noiseVsLimit(lden: number, limit: number): string {
  const db = Math.round(lden)
  return db <= limit ? `${db} dB — within your ${limit} dB` : `${db} dB — ${db - limit} dB over your ${limit} dB`
}

/** "€4,700/m² — 18% over your €4,000/m²" */
export function priceVsBudget(eurM2: number, budget: number): string {
  if (eurM2 <= budget) return `${eur(eurM2)}/m² — within your ${eur(budget)}/m²`
  return `${eur(eurM2)}/m² — ${Math.round((100 * (eurM2 - budget)) / budget)}% over your ${eur(budget)}/m²`
}

/** "7 of 10 services within 10 min"; null minutes = out of reach. */
export function countWithin(minutes: readonly (number | null)[], limit: number, noun: string): string {
  const n = minutes.filter((m) => m !== null && m <= limit).length
  return `${n} of ${minutes.length} ${minutes.length === 1 ? noun.replace(/s$/, '') : noun} within ${limit} min`
}

/** "Residents rate 7.6 — meets your 7.5" */
export function ratingVsMin(rating: number, min: number): string {
  return `Residents rate ${rating.toFixed(1)} — ${rating >= min ? 'meets' : 'below'} your ${min.toFixed(1)}`
}

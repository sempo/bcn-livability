/**
 * Building age in the Livability Index (TODO-047): the user ticks the eras they like; a building of a liked era
 * scores 100, any other 0, fading over AGE_ERA_BLUR_YEARS at the edges of a liked era. The era names and the line
 * on what an era means for living there are written for the default bounds.
 */
const BOUNDS = String(import.meta.env.VITE_AGE_ERA_BOUNDS ?? '1900,1940,1980,2007').split(',').map(Number)
export const AGE_ERA_BLUR_YEARS = Number(import.meta.env.VITE_AGE_ERA_BLUR_YEARS ?? 5)
/** Catastro's date for many old buildings whose exact year is unknown (9,695 buildings say 1900). */
export const UNCERTAIN_YEAR = Number(import.meta.env.VITE_AGE_UNCERTAIN_YEAR ?? 1900)

const TEXTS = [
  { name: 'Historic', about: 'Old town and village cores: thick masonry walls, often no lift, small windows.' },
  { name: 'Modernista & early 20th c.', about: 'Eixample heyday: high ceilings, mosaic floors, big windows; often renovated.' },
  {
    name: 'Post-war boom',
    about: 'Fast mass housing: thin walls, no insulation (no thermal standard until 1979); aluminous-cement '
      + 'floors in some 1950s–70s buildings.',
  },
  { name: 'First building standards', about: 'First thermal (1979) and acoustic (1981–88) standards.' },
  { name: 'Current building code', about: 'Código Técnico (2006): insulation, soundproofing, accessibility.' },
]

export interface AgeEra {
  id: string
  name: string
  /** "before 1900", "1900–1939", "2007 on". */
  years: string
  about: string
  /** First year of the era; the era ends before `end`. */
  start: number
  end: number
}

export const AGE_ERAS: AgeEra[] = [-Infinity, ...BOUNDS].map((start, i) => {
  const end = BOUNDS[i] ?? Infinity
  const years = start === -Infinity ? `before ${end}` : end === Infinity ? `${start} on` : `${start}–${end - 1}`
  const id = start === -Infinity ? `before-${end}` : end === Infinity ? `${start}-on` : `${start}-${end - 1}`
  const text = BOUNDS.length === TEXTS.length - 1 ? TEXTS[i] : { name: years, about: '' }
  return { id, years, start, end, ...text }
})

export const ALL_AGE_ERA_IDS = AGE_ERAS.map((e) => e.id)

export function eraOf(year: number): AgeEra {
  return AGE_ERAS.find((e) => year >= e.start && year < e.end)!
}

/** 1 inside the era, fading to 0 over `blur` years outside it. */
function membership(year: number, era: AgeEra, blur: number): number {
  const d = year < era.start ? era.start - year : year >= era.end ? year - era.end + 1 : 0
  if (d === 0) return 1
  return blur > 0 ? Math.max(0, 1 - d / blur) : 0
}

/** Age score 0–100 of a building built in `year` for the liked eras; null when the year is unknown. */
export function ageScore(year: number | null, liked: readonly string[], blur = AGE_ERA_BLUR_YEARS): number | null {
  if (year === null) return null
  const years = year === UNCERTAIN_YEAR ? [year - 1, year] : [year]
  let best = 0
  for (const era of AGE_ERAS) {
    if (!liked.includes(era.id)) continue
    for (const y of years) best = Math.max(best, membership(y, era, blur))
  }
  return Math.round(best * 100)
}

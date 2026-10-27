import type { ExpressionSpecification } from 'maplibre-gl'

// RdYlGn sequential ramp: low index = red (worse), high index = green (better).
export const SCORE_RAMP = [
  { stop: 0, color: '#d73027' },
  { stop: 25, color: '#fc8d59' },
  { stop: 50, color: '#fee08b' },
  { stop: 75, color: '#91cf60' },
  { stop: 100, color: '#1a9850' },
] as const

// TODO-032: the ramp is fitted to the hexes in view. The extreme TRIM_PCT% on each side don't stretch
// it (one outlier would take a whole end), and it never spans less than MIN_SPAN points (a 2-point
// difference in a zoomed-in area must not read as "bad" vs "great").
const TRIM_PCT = Number(import.meta.env.VITE_SCORE_SCALE_TRIM_PCT ?? 2)
const MIN_SPAN = Number(import.meta.env.VITE_SCORE_SCALE_MIN_SPAN ?? 20)

/** Whole-number colour range for the given scores (the visible hexes); null when there are none. */
export function fitScoreRange(scores: number[], trimPct = TRIM_PCT, minSpan = MIN_SPAN): [number, number] | null {
  if (scores.length === 0) return null
  const sorted = [...scores].sort((a, b) => a - b)
  const cut = Math.floor((sorted.length * trimPct) / 100)
  const min = Math.floor(sorted[cut])
  const max = Math.ceil(sorted[sorted.length - 1 - cut])
  if (max - min >= minSpan) return [min, max]
  const lo = Math.max(0, Math.min(100 - minSpan, Math.round((min + max - minSpan) / 2)))
  return [lo, lo + minSpan]
}

/** Full 0–100 fill-color expression for a numeric property. */
export function buildScoreFillColor(property: string): ExpressionSpecification {
  return [
    'interpolate',
    ['linear'],
    ['get', property],
    ...SCORE_RAMP.flatMap((s) => [s.stop, s.color]),
  ] as ExpressionSpecification
}

/**
 * Fill-color expression remapped so that score=min → red and score=max → green.
 * Ramp stops are distributed proportionally within [min, max].
 */
export function buildScoreFillColorForRange(
  min: number,
  max: number,
  property: string,
): ExpressionSpecification {
  if (min >= max) return buildScoreFillColor(property)
  const span = max - min
  return [
    'interpolate',
    ['linear'],
    ['get', property],
    ...SCORE_RAMP.flatMap((s, i) => [
      min + span * (i / (SCORE_RAMP.length - 1)),
      s.color,
    ]),
  ] as ExpressionSpecification
}

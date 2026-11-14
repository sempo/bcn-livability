import i18n from '../../i18n'
import { lazyLabels } from '../../i18n/format'
import type { CompositeResult, CompositeWeights, ComponentScores } from '../composite/compositeScore'

// Match score (TODO-050): how the Livability score is shown. The score keeps its definition (049); this module
// only turns it into bands and a "meets N of M of your conditions" summary.

export type MatchBandId = 'great' | 'good' | 'partial' | 'poor'
/** Lower edges of the great / good / partial bands; below the last one is poor. */
export type Bands = readonly [number, number, number]

export const DEFAULT_BANDS: Bands = [85, 65, 40]

/** Reads VITE_MATCH_BANDS ("85,65,40"); anything that is not three descending numbers gives the default. */
export function parseBands(raw: string | undefined): Bands {
  const parts = (raw ?? '').split(',').map((p) => Number(p.trim()))
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return DEFAULT_BANDS
  return parts[0] > parts[1] && parts[1] > parts[2] ? [parts[0], parts[1], parts[2]] : DEFAULT_BANDS
}

export const MATCH_BANDS = parseBands(import.meta.env.VITE_MATCH_BANDS)

export const BAND_LABEL = lazyLabels('conditions:band', ['great', 'good', 'partial', 'poor'] as const)
/** Swatch colours; the same stops as the map ramp (scoreRamp.ts). Poor runs from orange to red on the map. */
export const BAND_COLOR: Record<MatchBandId, string> = {
  great: '#1a9850', good: '#91cf60', partial: '#fee08b', poor: '#fc8d59',
}
export const BAND_ORDER: readonly MatchBandId[] = ['great', 'good', 'partial', 'poor']

/** Band of a final score (after risk penalties). */
export function matchBand(score: number, bands: Bands = MATCH_BANDS): MatchBandId {
  if (score >= bands[0]) return 'great'
  if (score >= bands[1]) return 'good'
  if (score >= bands[2]) return 'partial'
  return 'poor'
}

/** Share of homes (percent) in each band, in `BAND_ORDER`, from the score of every building. */
export function bandShares(scores: Uint8Array, bands: Bands = MATCH_BANDS): number[] {
  const counts = BAND_ORDER.map(() => 0)
  for (let i = 0; i < scores.length; i++) counts[BAND_ORDER.indexOf(matchBand(scores[i], bands))]++
  return counts.map((n) => (scores.length > 0 ? (100 * n) / scores.length : 0))
}

export type ConditionId = keyof ComponentScores
export type ConditionStatus = 'met' | 'partly' | 'missed' | 'nodata'

/** Short names of the conditions, in the order the card lists them. */
export const CONDITION_LABEL = lazyLabels('conditions:label', ['noise', 'poiAccess', 'cityCore', 'openPrice', 'localsOpinion', 'age'] as const)
const ORDER = Object.keys(CONDITION_LABEL) as ConditionId[]

/** Met when the component scores 100, partly at 1–99, not met at 0; null = no data. */
export function conditionStatus(score: number | null): ConditionStatus {
  if (score === null) return 'nodata'
  if (score >= 100) return 'met'
  return score > 0 ? 'partly' : 'missed'
}

export interface MatchRow {
  id: ConditionId
  label: string
  status: ConditionStatus
  text: string
}

export interface MatchSummary {
  met: number
  total: number
  rows: MatchRow[]
}

/** The conditions that are on, how the building does on each, and how many it meets. */
export function matchSummary(
  result: CompositeResult,
  weights: CompositeWeights,
  texts: Partial<Record<ConditionId, string>> = {},
): MatchSummary {
  const rows: MatchRow[] = []
  for (const id of ORDER) {
    if ((weights[id] ?? 0) <= 0) continue
    const status = conditionStatus(result.components[id])
    rows.push({ id, label: CONDITION_LABEL[id], status, text: status === 'nodata' ? i18n.t('conditions:match.noData') : texts[id] ?? '' })
  }
  return { met: rows.filter((r) => r.status === 'met').length, total: rows.length, rows }
}

const RISK_KEYS = ['flood', 'street', 'fire'] as const
const RISK_LABEL = lazyLabels('conditions:risk', RISK_KEYS)

/** "Risk: −6 points — river flooding (100-year zone), street flooding"; null when no risk costs points. */
export function riskLine(
  penalties: CompositeResult['penalties'],
  detail: Partial<Record<keyof typeof RISK_LABEL, string>> = {},
): string | null {
  const costly = (Object.keys(RISK_LABEL) as (keyof typeof RISK_LABEL)[]).filter((k) => penalties[k] > 0)
  if (costly.length === 0) return null
  const points = costly.reduce((sum, k) => sum + penalties[k], 0)
  const names = costly.map((k) => (detail[k] ? `${RISK_LABEL[k]} (${detail[k]})` : RISK_LABEL[k]))
  return i18n.t('conditions:match.risk', { points, names: names.join(', ') })
}

/** Hover tooltip on a building: "Good match · 78 — meets 3 of 4"; "~78" when the data is incomplete (060). */
export function matchTooltip(
  score: number, summary: Pick<MatchSummary, 'met' | 'total'>, bands: Bands = MATCH_BANDS, incomplete = false,
): string {
  const head = `${BAND_LABEL[matchBand(score, bands)]} · ${incomplete ? '~' : ''}${score}`
  return summary.total > 0 ? i18n.t('conditions:match.tooltip', { head, met: summary.met, total: summary.total }) : head
}

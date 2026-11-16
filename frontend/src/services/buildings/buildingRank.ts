import type { BuildingArea } from './buildingData'

// Where a building stands among the others for the person's conditions (TODO-070): the share of homes with a
// lower final score in its barri (or municipality) and in the city. Homes are dwellings (TODO-073): a building
// counts as many times as it has dwellings, so a single-family house does not weigh as much as a block of 100 flats. Counted from one histogram of scores per
// area, built once per rescoring; the card only reads one bin sum. No general score: the scores are the ones
// the map shows under the current conditions. A rank is shown only as an award: when the building beats at least
// `RANK_SHOW_MIN_PCT` of the homes in that scope; otherwise the scope has no line. Homes with the same score are not
// beaten, so a score shared by most of a barri (a plateau) earns nothing.

/** Scores run 0–100. */
export const SCORE_BINS = 101

/** A scope gets a line only from this share (percent) of homes beaten. */
export const RANK_SHOW_MIN_PCT = Number(import.meta.env.VITE_RANK_SHOW_MIN_PCT ?? 70)

/** Below this many buildings a barri is too small to rank in (the same limit as the ranked list of areas, 051). */
export const RANK_MIN_BUILDINGS = Number(import.meta.env.VITE_AREA_MIN_BUILDINGS ?? 50)

/** Histograms of one kind: per area, Barcelona, and the whole data. */
export interface ScopeHistograms {
  /** Per area (index in `buildings-meta.json` areas). */
  areas: Uint32Array[]
  /** The barris together: Barcelona. */
  barcelona: Uint32Array
  /** Every building of the data: the Barcelona area. */
  all: Uint32Array
}

export interface ScoreHistograms extends ScopeHistograms {
  /** Buildings (not homes) per score: the size limit of a barri. */
  buildings: ScopeHistograms
}

const emptyScopes = (n: number): ScopeHistograms => ({
  areas: Array.from({ length: n }, () => new Uint32Array(SCORE_BINS)),
  barcelona: new Uint32Array(SCORE_BINS),
  all: new Uint32Array(SCORE_BINS),
})

/**
 * One pass over the scores of all buildings. `areaCol` is the `area` column (NaN = no area); `homes` the
 * `dwellings` column (each building counts that many times, at least once; absent = every building counts once).
 */
export function scoreHistograms(
  scores: Uint8Array, areaCol: Float32Array, areas: readonly BuildingArea[], homes?: Float32Array,
): ScoreHistograms {
  const h = emptyScopes(areas.length)
  const b = emptyScopes(areas.length)
  for (let i = 0; i < scores.length; i++) {
    const s = scores[i]
    const w = homeWeight(homes, i)
    h.all[s] += w
    b.all[s]++
    const a = areaCol[i]
    if (a !== a || a < 0 || a >= areas.length) continue
    h.areas[a][s] += w
    b.areas[a][s]++
    if (areas[a].kind === 'barri') { h.barcelona[s] += w; b.barcelona[s]++ }
  }
  return { ...h, buildings: b }
}

/** How many homes building i counts for: its dwellings, at least 1; 1 without the column or a value (TODO-073). */
export function homeWeight(homes: Float32Array | undefined, i: number): number {
  const v = homes?.[i]
  return v === undefined || v !== v || v < 1 ? 1 : v
}

/** Sum of a histogram: the size of the scope. */
export function histTotal(hist: Uint32Array): number {
  let n = 0
  for (let s = 0; s < hist.length; s++) n += hist[s]
  return n
}

export interface Rank {
  /** Percent (0–99, rounded down) of the homes in the scope with a lower score. */
  pct: number
  /** Homes in the scope. */
  n: number
}

/** The rank of `score` in a histogram of homes; null when the scope is empty. */
export function rankIn(hist: Uint32Array, score: number): Rank | null {
  let n = 0
  let below = 0
  for (let s = 0; s < hist.length; s++) {
    n += hist[s]
    if (s < score) below += hist[s]
  }
  if (n === 0) return null
  return { pct: Math.min(99, Math.floor((100 * below) / n)), n }
}

/** Worth an award: beating at least `minPct` of the homes of the scope. */
export const earnsAward = (r: Rank, minPct = RANK_SHOW_MIN_PCT) => r.pct >= minPct

export interface BuildingRanks {
  /** The barri (or municipality); null when it has too few buildings or the building does not stand out there. */
  local: { name: string; kind: BuildingArea['kind']; rank: Rank } | null
  /** Barcelona for a building in a barri, the Barcelona area for the rest; null when it does not stand out. */
  wide: { scope: 'barcelona' | 'metro'; rank: Rank } | null
}

/**
 * The awards of a building of area `areaIndex` with the final score `score`: each scope is judged alone, so a
 * building can stand out in the city and not in its barri. Null when it stands out nowhere.
 */
export function buildingRanks(
  h: ScoreHistograms, areas: readonly BuildingArea[], areaIndex: number | null, score: number,
  minBuildings = RANK_MIN_BUILDINGS, minPct = RANK_SHOW_MIN_PCT,
): BuildingRanks | null {
  const area = areaIndex === null ? undefined : areas[areaIndex]
  if (!area) return null
  const scope = area.kind === 'barri' ? 'barcelona' : 'metro'
  const wideRank = scope === 'barcelona'
    ? rankIn(h.barcelona, score)
    : rankIn(h.all, score)
  const own = rankIn(h.areas[areaIndex!], score)
  const bigEnough = histTotal(h.buildings.areas[areaIndex!]) >= minBuildings
  const local = own && bigEnough && earnsAward(own, minPct) ? { name: area.name, kind: area.kind, rank: own } : null
  const wide = wideRank && earnsAward(wideRank, minPct) ? { scope, rank: wideRank } as const : null
  return local || wide ? { local, wide } : null
}

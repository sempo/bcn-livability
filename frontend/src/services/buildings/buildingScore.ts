/**
 * Livability score of a building (TODO-046): the building's inputs fed to computeComposite. Where the inputs
 * come from:
 * - walkability is recomputed from the stored per-category sub-scores over the categories the user keeps;
 * - City Core uses walking minutes per landmark from the building's entrance;
 * - price and Locals' opinion come from the building's barri (Barcelona) or municipality;
 * - risks: the ACA zone the footprint touches, wildfire as before, and water depth at the door.
 */
import { latLngToCell } from 'h3-js'
import { computeComposite, type CompositeResult, type CompositeWeights, type ScoreInputs } from '../composite/compositeScore'
import {
  fireRisk, floodRisk, streetFloodRisk, type Risks, type RiskStrengths,
} from '../climateRisk/climateRisk'
import { SERVICE_CATEGORIES } from '../walkability/serviceCategories'
import type { BarriVibeData } from '../localsOpinion/localsOpinion'
import { valueOf, type BuildingArea, type BuildingData } from './buildingData'

/** Water at the door counts 0 up to MIN cm (stays in the gutter) and fully from MAX cm. */
export const STREET_FLOOD_MIN_CM = Number(import.meta.env.VITE_STREET_FLOOD_MIN_CM ?? 10)
export const STREET_FLOOD_MAX_CM = Number(import.meta.env.VITE_STREET_FLOOD_MAX_CM ?? 50)

const CATEGORY_WEIGHT: Record<string, number> = Object.fromEntries(SERVICE_CATEGORIES.map((c) => [c.id, c.weight]))

export interface BuildingSettings {
  weights: CompositeWeights
  enabledLandmarkIds: readonly string[]
  enabledCategories: readonly string[]
  riskStrengths: RiskStrengths
  /** Locals' opinion data (042); null = flag off or not loaded. */
  vibe: BarriVibeData | null
}

/** Walkability 0–100 over the categories the user keeps, weighted as in feature 010. */
export function walkFromCategories(subs: Record<string, number | null>, enabled: readonly string[]): number {
  let sum = 0
  let total = 0
  for (const id of enabled) {
    const w = CATEGORY_WEIGHT[id] ?? 0
    sum += (subs[id] ?? 0) * w
    total += w
  }
  return total === 0 ? 0 : Math.round(sum / total)
}

/** ACA zone the footprint touches (10 / 100 / 500; null = none) → nested zone shares for floodRisk. */
export function riverZoneShares(zone: number | null): { flood_t10: number; flood_t100: number; flood_t500: number } {
  return {
    flood_t10: zone === 10 ? 1 : 0,
    flood_t100: zone !== null && zone <= 100 ? 1 : 0,
    flood_t500: zone !== null ? 1 : 0,
  }
}

/** Water depth at the door (cm) → weight 0–1. */
export function doorWaterSeverity(cm: number | null, min = STREET_FLOOD_MIN_CM, max = STREET_FLOOD_MAX_CM): number {
  if (cm === null) return 0
  return Math.max(0, Math.min(1, (cm - min) / (max - min)))
}

export function buildingRisks(data: BuildingData, i: number): Risks {
  return {
    flood: floodRisk(riverZoneShares(valueOf(data, 'river_zone', i))),
    fire: fireRisk({ fire_wui: valueOf(data, 'fire_wui', i), fire_hazard: valueOf(data, 'fire_hazard', i) }),
    street: streetFloodRisk({
      street_t10: doorWaterSeverity(valueOf(data, 'street_t10_cm', i)),
      street_t100: doorWaterSeverity(valueOf(data, 'street_t100_cm', i)),
    }),
  }
}

export function buildingArea(data: BuildingData, i: number): BuildingArea | null {
  const a = valueOf(data, 'area', i)
  return a === null ? null : data.meta.areas[a] ?? null
}

export function buildingBundle(
  data: BuildingData, i: number, enabledCategories: readonly string[], vibe: BarriVibeData | null,
): ScoreInputs {
  const subs = Object.fromEntries(data.meta.categories.map((c) => [c, valueOf(data, `walk_${c}`, i)]))
  const minutes = Object.fromEntries(data.meta.landmarks.map((l) => [l, valueOf(data, `cc_${l}`, i)]))
  const area = buildingArea(data, i)
  const barri = area?.kind === 'barri' ? vibe?.barris[area.code] : undefined
  return {
    walk: walkFromCategories(subs, enabledCategories),
    lden: valueOf(data, 'lden_avg', i),
    cityCoreProps: minutes,
    saleEurM2: area?.price ?? null,
    risks: buildingRisks(data, i),
    locals: barri ? { satisfAdj: barri.satisfAdj, lowN: barri.lowN } : null,
  }
}

export function scoreBuilding(data: BuildingData, i: number, s: BuildingSettings): CompositeResult {
  return computeComposite(
    buildingBundle(data, i, s.enabledCategories, s.vibe), s.weights, s.enabledLandmarkIds,
    data.meta.price_bounds, s.riskStrengths,
  )
}

/** Final score and missing-data flag of every building, by row. */
export function scoreAll(data: BuildingData, s: BuildingSettings): { score: Uint8Array; gap: Uint8Array } {
  const score = new Uint8Array(data.count)
  const gap = new Uint8Array(data.count)
  for (let i = 0; i < data.count; i++) {
    const r = scoreBuilding(data, i, s)
    score[i] = r.score
    gap[i] = r.hasGap ? 1 : 0
  }
  return { score, gap }
}

/** H3 cell of every building centroid — Best zones (038) work on the res-9 grid. */
export function centroidCells(data: BuildingData, res: number): string[] {
  const cells = new Array<string>(data.count)
  for (let i = 0; i < data.count; i++) cells[i] = latLngToCell(data.cols.lat[i], data.cols.lng[i], res)
  return cells
}

/** Mean building score per cell. */
export function cellMeans(score: ArrayLike<number>, cells: readonly string[]): Map<string, number> {
  const sums = new Map<string, number>()
  const counts = new Map<string, number>()
  for (let i = 0; i < cells.length; i++) {
    sums.set(cells[i], (sums.get(cells[i]) ?? 0) + score[i])
    counts.set(cells[i], (counts.get(cells[i]) ?? 0) + 1)
  }
  return new Map([...sums].map(([h, sum]) => [h, sum / counts.get(h)!]))
}

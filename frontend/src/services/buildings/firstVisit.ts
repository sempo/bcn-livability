import { ALL_LANDMARK_IDS } from '../cityCore/landmarks'
import { SERVICE_CATEGORIES } from '../walkability/serviceCategories'
import { DEFAULT_RISK_STRENGTHS } from '../climateRisk/climateRisk'
import { ALL_AGE_ERA_IDS } from './buildingAge'
import { DEFAULT_CONDITIONS } from './conditions'
import type { BuildingSettings } from './buildingScore'

// The settings of a first visit: nothing saved, no settings in the address (TODO-058). The store starts from these,
// and the build precomputes the area colours for them (scripts/build-area-start.mjs), so this module must not
// touch the browser.

/** Which Livability conditions are on: 1 = on, 0 = off (049). */
export interface CompositeWeights {
  poiAccess: number
  noise: number
  cityCore: number
  openPrice: number
  /** Residents' satisfaction (042); off by default. */
  localsOpinion: number
  /** Building age against the eras the user likes (TODO-047); off by default. */
  age: number
}

export const DEFAULT_COMPOSITE_WEIGHTS: CompositeWeights = {
  poiAccess: 1,
  noise: 1,
  cityCore: 1,
  openPrice: 1,
  localsOpinion: 0,
  age: 0,
}

export const ALL_WALK_CATEGORY_IDS: readonly string[] = SERVICE_CATEGORIES.map((c) => c.id)

/** What the buildings are scored with (no locals' opinion data: that is loaded, not a setting). */
export type ScoreSettings = Omit<BuildingSettings, 'vibe'>

export function firstVisitSettings(): ScoreSettings {
  return {
    weights: DEFAULT_COMPOSITE_WEIGHTS,
    conditions: DEFAULT_CONDITIONS,
    enabledLandmarkIds: ALL_LANDMARK_IDS,
    enabledCategories: ALL_WALK_CATEGORY_IDS,
    riskStrengths: DEFAULT_RISK_STRENGTHS,
    ageEras: ALL_AGE_ERA_IDS,
  }
}

/** JSON with sorted keys and sorted id lists: equal for equal settings, whatever order they were built in. */
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return [...value].map(stable).sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable((value as Record<string, unknown>)[k])]))
  }
  return value
}

/** A text that is the same for two settings exactly when they score every building the same. */
export function settingsKey(s: ScoreSettings): string {
  const { weights, conditions, enabledLandmarkIds, enabledCategories, riskStrengths, ageEras } = s
  return JSON.stringify(stable({ weights, conditions, enabledLandmarkIds, enabledCategories, riskStrengths, ageEras }))
}

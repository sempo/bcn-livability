import { features } from '../features'
import { ALL_LANDMARK_IDS } from './cityCore/landmarks'
import { SERVICE_CATEGORIES } from './walkability/serviceCategories'
import { ALL_AGE_ERA_IDS } from './buildings/buildingAge'
import { DEFAULT_CONDITIONS, type Conditions } from './buildings/conditions'
import type { BuildingData } from './buildings/buildingData'
import { buildingArea } from './buildings/buildingScore'
import type { RiskStrengths } from './climateRisk/climateRisk'
import type { CompositeWeights } from '../store'

// Verbal steps for the sentence editor (TODO-031): the words a person taps, and the limits behind them. The
// steps come from ENV (VITE_QUIZ_*); "Custom…" in the picker covers everything between them.

/** The conditions a person can switch on: the six scored ones plus the flood / wildfire line. */
export type ConditionKey = keyof CompositeWeights | 'risk'

/** Default order of the rows (the order the card lists them in, risks last). */
export const CONDITION_KEYS: readonly ConditionKey[] = [
  'noise', 'poiAccess', 'cityCore', 'openPrice', 'localsOpinion', 'age', 'risk',
]

/** Short name for the "Your conditions" row. */
export const SHORT_LABEL: Record<ConditionKey, string> = {
  noise: 'Quiet', poiAccess: 'On foot', cityCore: 'Centre', openPrice: 'Budget',
  localsOpinion: 'Locals', age: 'Buildings', risk: 'Risks',
}

/** Label of the "+ add" chip. */
export const ADD_LABEL: Record<ConditionKey, string> = {
  noise: 'Quiet', poiAccess: 'Everything on foot', cityCore: 'Close to the centre', openPrice: 'Within my budget',
  localsOpinion: 'What locals think', age: 'Kind of building', risk: 'Avoid risks',
}

export interface WordOption {
  value: number
  label: string
  hint?: string
}

/** "50, 58,65" → [50, 58, 65]; anything unusable gives the fallback. */
export function parseNumberList(raw: string | undefined, fallback: readonly number[]): number[] {
  const parts = (raw ?? '').split(',').map((p) => p.trim())
  const nums = parts.map(Number)
  return parts.length > 0 && parts.every((p) => p !== '') && nums.every(Number.isFinite) ? nums : [...fallback]
}

/** 3500 → "3,500" (fixed grouping: the same text in every locale). */
function group(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function formatEuroM2(v: number): string {
  return `€${group(v)}/m²`
}

const NOISE_NAMES: Record<number, string> = { 50: 'a courtyard', 58: 'a calm street', 65: 'normal city noise' }
const LOCALS_NAMES: Record<number, string> = { 7: 'Happy', 7.5: 'Very happy', 8: 'Among the happiest' }

export const NOISE_OPTIONS: WordOption[] = parseNumberList(import.meta.env.VITE_QUIZ_NOISE_OPTIONS, [50, 58, 65])
  .map((v) => ({ value: v, label: NOISE_NAMES[v] ?? `${v} dB`, hint: `${v} dB` }))
export const WALK_OPTIONS: WordOption[] = parseNumberList(import.meta.env.VITE_QUIZ_WALK_OPTIONS, [5, 10, 15])
  .map((v) => ({ value: v, label: `${v} min` }))
export const CENTRE_OPTIONS: WordOption[] = parseNumberList(import.meta.env.VITE_QUIZ_CENTRE_OPTIONS, [15, 30, 45])
  .map((v) => ({ value: v, label: `${v} min` }))

// ---- budget: "A [70 m²] flat costs up to [€250,000] on average" ----
// The data is the average sale price per m² of the area, so a budget for a flat of a given size is a price per
// m²: budget ÷ size. The condition still stores the price per m² (`priceMaxEurM2`); the size is a preference.

export function formatEuro(v: number): string {
  return `€${group(v)}`
}

/** Size of the flat the budget is for, until the person picks another. */
export const DEFAULT_FLAT_AREA_M2 = Number(import.meta.env.VITE_FLAT_AREA_M2 ?? 70)
export const FLAT_AREA_RANGE = { min: 25, max: 250, step: 5 }
export const BUDGET_RANGE = { min: 50_000, max: 1_500_000, step: 10_000 }

export const FLAT_AREA_OPTIONS: WordOption[] = parseNumberList(import.meta.env.VITE_QUIZ_FLAT_AREA_OPTIONS, [50, 70, 90, 120])
  .map((v) => ({ value: v, label: `${v} m²` }))
export const BUDGET_OPTIONS: WordOption[] = parseNumberList(import.meta.env.VITE_QUIZ_BUDGET_OPTIONS, [150_000, 250_000, 350_000, 500_000])
  .map((v) => ({ value: v, label: formatEuro(v) }))

/** Price per m² that a budget for a flat of `areaM2` stands for (kept to cents). */
export function priceForBudget(budgetEur: number, areaM2: number): number {
  return Math.round((budgetEur / areaM2) * 100) / 100
}

/** The budget shown for a price per m² and a flat size, to the nearest €1,000. */
export function budgetFor(pricePerM2: number, areaM2: number): number {
  return Math.round((pricePerM2 * areaM2) / 1000) * 1000
}

/** A new flat size keeps the budget (the money a person has), so the price per m² moves. */
export function priceAfterAreaChange(pricePerM2: number, oldAreaM2: number, newAreaM2: number): number {
  return Math.round(((pricePerM2 * oldAreaM2) / newAreaM2) * 100) / 100
}
export const LOCALS_OPTIONS: WordOption[] = parseNumberList(import.meta.env.VITE_QUIZ_LOCALS_OPTIONS, [7, 7.5, 8])
  .map((v) => ({ value: v, label: v.toFixed(1), hint: LOCALS_NAMES[v] }))

/** The option with exactly this value; null = a custom value between the steps. */
export function optionFor(options: readonly WordOption[], value: number): WordOption | null {
  return options.find((o) => o.value === value) ?? null
}

// ---- risks: one line, "Avoid / Strongly avoid" instead of three sliders ----

export type RiskLevel = 'avoid' | 'strong' | 'off' | 'custom'

const RISK_AVOID = Number(import.meta.env.VITE_RISK_PRESET_AVOID ?? 5)
const RISK_STRONG = Number(import.meta.env.VITE_RISK_PRESET_STRONG ?? 8)

export function strengthsFor(level: 'avoid' | 'strong' | 'off'): RiskStrengths {
  const n = level === 'avoid' ? RISK_AVOID : level === 'strong' ? RISK_STRONG : 0
  return { flood: n, fire: n, street: n }
}

export function riskLevel(s: RiskStrengths): RiskLevel {
  const all = (n: number) => s.flood === n && s.fire === n && s.street === n
  if (all(0)) return 'off'
  if (all(RISK_AVOID)) return 'avoid'
  if (all(RISK_STRONG)) return 'strong'
  return 'custom'
}

// ---- which rows are on, and in what order ----

function isOn(key: ConditionKey, weights: CompositeWeights, strengths: RiskStrengths): boolean {
  if (key === 'risk') return riskLevel(strengths) !== 'off'
  if (key === 'localsOpinion' && !features.localsOpinion) return false
  return weights[key] > 0
}

/** The conditions that are on: first in the order the person added them, then the rest in the default order. */
export function activeConditions(
  weights: CompositeWeights,
  strengths: RiskStrengths,
  order: readonly ConditionKey[],
): ConditionKey[] {
  const first = [...new Set(order)].filter((k) => isOn(k, weights, strengths))
  return [...first, ...CONDITION_KEYS.filter((k) => !first.includes(k) && isOn(k, weights, strengths))]
}

// ---- profiles and one-shot settings ----

/** Everything the sentence editor can set, applied in one store update. */
export interface SettingsPatch {
  weights?: CompositeWeights
  conditions?: Conditions
  walkCategories?: readonly string[]
  landmarkIds?: readonly string[]
  eras?: readonly string[]
  riskStrengths?: RiskStrengths
  order?: ConditionKey[]
}

export interface Profile {
  id: string
  name: string
  blurb: string
  /** Rows, in priority order. */
  order: ConditionKey[]
  /** Limits that differ from the defaults. */
  conditions?: Partial<Conditions>
  walkCategories?: string[]
  landmarkIds?: string[]
  eras?: string[]
  /** How hard to avoid risks; only used when `order` has 'risk'. */
  risk?: 'avoid' | 'strong'
}

const ALL_WALK_IDS: readonly string[] = SERVICE_CATEGORIES.map((c) => c.id)
const SCORED: (keyof CompositeWeights)[] = ['poiAccess', 'noise', 'cityCore', 'openPrice', 'localsOpinion', 'age']

/** The full settings a profile stands for: conditions not in `order` are off. */
export function profileToPatch(p: Profile): SettingsPatch {
  const order = p.order.filter((k) => k !== 'localsOpinion' || features.localsOpinion)
  const weights = Object.fromEntries(SCORED.map((k) => [k, order.includes(k) ? 1 : 0])) as unknown as CompositeWeights
  return {
    weights,
    conditions: { ...DEFAULT_CONDITIONS, ...p.conditions },
    walkCategories: p.walkCategories ?? ALL_WALK_IDS,
    landmarkIds: p.landmarkIds ?? ALL_LANDMARK_IDS,
    eras: p.eras ?? ALL_AGE_ERA_IDS,
    riskStrengths: strengthsFor(order.includes('risk') ? p.risk ?? 'avoid' : 'off'),
    order,
  }
}

// ---- "≈ N % of homes" next to each budget step ----

const priceCache = new WeakMap<BuildingData, Float32Array>()

/** Area prices (€/m²) of the buildings that have one, ascending. Cached per data set. */
export function sortedPrices(data: BuildingData): Float32Array {
  const cached = priceCache.get(data)
  if (cached) return cached
  const prices: number[] = []
  for (let i = 0; i < data.count; i++) {
    const price = buildingArea(data, i)?.price
    if (price !== null && price !== undefined) prices.push(price)
  }
  const sorted = Float32Array.from(prices).sort()
  priceCache.set(data, sorted)
  return sorted
}

/** Percent (0–100) of the buildings whose area price is at or below `limit`. */
export function shareUnder(sorted: Float32Array, limit: number): number {
  if (sorted.length === 0) return 0
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] <= limit) lo = mid + 1
    else hi = mid
  }
  return Math.round((100 * lo) / sorted.length)
}

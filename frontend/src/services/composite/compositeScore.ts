import { applyRiskPenalties, type Risks, type RiskStrengths } from '../climateRisk/climateRisk'

/**
 * Which conditions are on: 1 = on, 0 = off (049: every condition counts the same). Stored weights from before 049
 * (1–10) are read as "on" by the store.
 */
export interface CompositeWeights {
  poiAccess: number
  noise: number
  cityCore: number
  openPrice: number
  /** 042, behind a flag; absent = 0. */
  localsOpinion?: number
  /** Building age (047); absent = 0. */
  age?: number
}

/**
 * True when at least one condition is on. With none, there is nothing to score and the map stays neutral (061).
 * "Avoid flood and wildfire risk" is a condition too: on its own it colours the map by risk (everything starts at 100).
 */
export function hasConditions(weights: CompositeWeights, riskStrengths?: RiskStrengths): boolean {
  const weighted = (['poiAccess', 'noise', 'cityCore', 'openPrice', 'localsOpinion', 'age'] as const).some((k) => (weights[k] ?? 0) > 0)
  return weighted || (riskStrengths !== undefined && Object.values(riskStrengths).some((v) => v > 0))
}

/** Score 0–100 of each component of one building against the user's conditions; null = no data. */
export interface ComponentScores {
  poiAccess: number | null
  noise: number | null
  cityCore: number | null
  openPrice: number | null
  localsOpinion: number | null
  age: number | null
}

/** Inputs of one building's score (services/buildings/buildingScore.ts builds them). */
export interface ScoreInputs {
  components: ComponentScores
  /** Locals' opinion from a small survey sample (042): treated as missing data (060). */
  localsLowN?: boolean
  /** Climate risks 0–1 (036, 037); missing = no risk. */
  risks?: Risks
}

const NO_RISK_PENALTY: RiskStrengths = { flood: 0, fire: 0, street: 0 }
const NO_RISKS: Risks = { flood: 0, fire: 0, street: 0 }

export interface CompositeResult {
  /** Final score after climate-risk penalties. With gaps this is the best case (060): the missing conditions are dropped. */
  score: number
  /** Worst case (060): every missing condition counts 0. Equals `score` when there are no gaps. */
  scoreMin: number
  /** Mean over the conditions that are on, before penalties. */
  baseScore: number
  hasGap: boolean
  components: ComponentScores
  risks: Risks
  /** Points lost to each risk. */
  penalties: { flood: number; fire: number; street: number }
}

/**
 * Livability score (0–100) of one building: how well it meets the user's conditions, then the climate-risk
 * penalties (036), applied as multiplicative factors so safe buildings keep their score.
 *
 * Missing-data rule (060): a condition that is on but has no data makes the score a range. `scoreMin` counts it as
 * 0 and keeps its weight in the mean; `score` (max) drops it and renormalises the remaining weights. hasGap is set
 * so the building gets the hatch. Locals' opinion from a small sample counts as missing.
 */
export function computeComposite(
  inputs: ScoreInputs,
  weights: CompositeWeights,
  riskStrengths: RiskStrengths = NO_RISK_PENALTY,
): CompositeResult {
  const { components } = inputs
  let sum = 0
  let total = 0
  let totalKnown = 0
  let hasGap = false
  for (const key of Object.keys(components) as (keyof ComponentScores)[]) {
    const w = weights[key] ?? 0
    if (w <= 0) continue
    const lowN = key === 'localsOpinion' && inputs.localsLowN === true
    const v = lowN ? null : components[key]
    total += w
    if (v === null) {
      hasGap = true
      continue
    }
    sum += v * w
    totalKnown += w
  }

  const risks = inputs.risks ?? NO_RISKS
  const penalised = (base: number) => applyRiskPenalties(base, risks, riskStrengths)
  // Only risks are on (no weighted condition): nothing to average, every home starts at 100 and loses points to risk.
  const onlyRisks = total === 0 && hasConditions(weights, riskStrengths)
  const baseMin = onlyRisks ? 100 : total === 0 ? 0 : Math.round(sum / total)
  const baseScore = onlyRisks ? 100 : totalKnown === 0 ? 0 : Math.round(sum / totalKnown)
  const { score, floodPenalty, firePenalty, streetPenalty } = penalised(baseScore)
  return {
    score, scoreMin: hasGap ? penalised(baseMin).score : score, baseScore, hasGap, components, risks,
    penalties: { flood: floodPenalty, fire: firePenalty, street: streetPenalty },
  }
}

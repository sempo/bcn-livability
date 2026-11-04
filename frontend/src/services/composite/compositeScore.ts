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
  /** Locals' opinion from a small survey sample (042): counted, but marked like missing data. */
  localsLowN?: boolean
  /** Climate risks 0–1 (036, 037); missing = no risk. */
  risks?: Risks
}

const NO_RISK_PENALTY: RiskStrengths = { flood: 0, fire: 0, street: 0 }
const NO_RISKS: Risks = { flood: 0, fire: 0, street: 0 }

export interface CompositeResult {
  /** Final score after climate-risk penalties. */
  score: number
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
 * Missing-data rule: a condition that is on but has no data counts 0 and stays in the mean; hasGap is set so the
 * building gets the black outline.
 */
export function computeComposite(
  inputs: ScoreInputs,
  weights: CompositeWeights,
  riskStrengths: RiskStrengths = NO_RISK_PENALTY,
): CompositeResult {
  const { components } = inputs
  let sum = 0
  let total = 0
  let hasGap = false
  for (const key of Object.keys(components) as (keyof ComponentScores)[]) {
    const w = weights[key] ?? 0
    if (w <= 0) continue
    const v = components[key]
    if (v === null) hasGap = true
    sum += (v ?? 0) * w
    total += w
  }
  if ((weights.localsOpinion ?? 0) > 0 && inputs.localsLowN) hasGap = true

  const baseScore = total === 0 ? 0 : Math.round(sum / total)
  const risks = inputs.risks ?? NO_RISKS
  const { score, floodPenalty, firePenalty, streetPenalty } = applyRiskPenalties(baseScore, risks, riskStrengths)
  return {
    score, baseScore, hasGap, components, risks,
    penalties: { flood: floodPenalty, fire: firePenalty, street: streetPenalty },
  }
}

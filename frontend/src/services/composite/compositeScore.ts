import { noiseScore } from '../noise/noiseScore'
import { cityCoreIndex, type LandmarkMinutes } from '../cityCore/cityCoreScore'
import { applyRiskPenalties, type Risks, type RiskStrengths } from '../climateRisk/climateRisk'
import { localsOpinionScore } from '../localsOpinion/localsOpinion'

export interface CompositeWeights {
  poiAccess: number
  noise: number
  cityCore: number
  openPrice: number
  /** 042, behind a flag; absent = 0. */
  localsOpinion?: number
}

/** Inputs of one building's score (TODO-046: services/buildings/buildingScore.ts builds them). */
export interface ScoreInputs {
  walk: number
  lden: number | null
  cityCoreProps: LandmarkMinutes
  saleEurM2: number | null
  /** Climate risks 0–1 (036, 037); missing = no risk. */
  risks?: Risks
  /** Residents' view of the building's barri (042); null outside Barcelona city. */
  locals?: { satisfAdj: number; lowN: boolean } | null
}

export interface OpenPriceBounds {
  p5: number
  p95: number
}

/**
 * Normalises INCASOL sale price (EUR/m²) to 0–100 using dataset p5/p95 bounds.
 * Lower price → higher score (cheaper is better).
 */
export function openPriceScore(
  saleEurM2: number,
  bounds: OpenPriceBounds,
): number {
  const { p5, p95 } = bounds
  if (p95 === p5) return 50
  return Math.max(0, Math.min(100, Math.round(((p95 - saleEurM2) / (p95 - p5)) * 100)))
}


/**
 * Computes the composite livability score (0–100) of one building.
 *
 * Missing-data rule: if a component has weight > 0 but no data (null),
 * it contributes 0 to the numerator while its weight still counts in the denominator.
 * hasGap is set true so the building can be rendered with a black outline. Locals' opinion from a
 * small survey sample is counted but marked the same way.
 */
export interface ComponentScores {
  poiAccess: number
  noise: number | null
  cityCore: number
  openPrice: number | null
  localsOpinion: number | null
}

const NO_RISK_PENALTY: RiskStrengths = { flood: 0, fire: 0, street: 0 }
const NO_RISKS: Risks = { flood: 0, fire: 0, street: 0 }

export interface CompositeResult {
  /** Final score after climate-risk penalties. */
  score: number
  /** Weighted-mean score before penalties. */
  baseScore: number
  hasGap: boolean
  components: ComponentScores
  risks: Risks
  /** Points lost to each risk. */
  penalties: { flood: number; fire: number; street: number }
}

/**
 * Climate risks (036) are applied after the weighted mean as multiplicative penalties
 * (see applyRiskPenalties), so safe buildings keep their score. Default strengths 0 = no penalty.
 */
export function computeComposite(
  bundle: ScoreInputs,
  weights: CompositeWeights,
  enabledLandmarkIds: readonly string[],
  openPriceBounds: OpenPriceBounds,
  riskStrengths: RiskStrengths = NO_RISK_PENALTY,
): CompositeResult {
  const noiseVal = bundle.lden !== null ? noiseScore(bundle.lden) : null
  const cityVal = cityCoreIndex(bundle.cityCoreProps, enabledLandmarkIds)
  const openPriceVal = bundle.saleEurM2 !== null
    ? openPriceScore(bundle.saleEurM2, openPriceBounds)
    : null
  const localsVal = bundle.locals ? localsOpinionScore(bundle.locals.satisfAdj) : null

  const components: ComponentScores = {
    poiAccess: bundle.walk,
    noise: noiseVal,
    cityCore: cityVal,
    openPrice: openPriceVal,
    localsOpinion: localsVal,
  }

  let weightedSum = 0
  let totalWeight = 0
  let hasGap = false

  if (weights.poiAccess > 0) {
    weightedSum += bundle.walk * weights.poiAccess
    totalWeight += weights.poiAccess
  }

  if (weights.noise > 0) {
    if (noiseVal === null) {
      hasGap = true
    } else {
      weightedSum += noiseVal * weights.noise
    }
    totalWeight += weights.noise
  }

  if (weights.cityCore > 0) {
    weightedSum += cityVal * weights.cityCore
    totalWeight += weights.cityCore
  }

  if (weights.openPrice > 0) {
    if (openPriceVal === null) {
      hasGap = true
    } else {
      weightedSum += openPriceVal * weights.openPrice
    }
    totalWeight += weights.openPrice
  }

  const localsWeight = weights.localsOpinion ?? 0
  if (localsWeight > 0) {
    if (localsVal === null || bundle.locals?.lowN) hasGap = true
    weightedSum += (localsVal ?? 0) * localsWeight
    totalWeight += localsWeight
  }

  const baseScore = totalWeight === 0 ? 0 : Math.round(weightedSum / totalWeight)
  const risks = bundle.risks ?? NO_RISKS
  const { score, floodPenalty, firePenalty, streetPenalty } = applyRiskPenalties(baseScore, risks, riskStrengths)
  return {
    score, baseScore, hasGap, components, risks,
    penalties: { flood: floodPenalty, fire: firePenalty, street: streetPenalty },
  }
}

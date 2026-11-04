import type { ClimateRiskProps } from '../../services/climateRisk/climateRisk'

/** Wildfire line of the building card (036): the WUI gates the risk, the nearest rated forest explains it. */
export function fireText(climate: Pick<ClimateRiskProps, 'fire_wui' | 'fire_class' | 'fire_dist_m'>): string {
  if (!climate.fire_wui) return 'Not in the wildland–urban interface'
  if (climate.fire_class == null || climate.fire_dist_m == null) {
    return 'Wildland–urban interface · no rated forest nearby'
  }
  return `Wildland–urban interface · hazard class ${climate.fire_class} forest at ~${climate.fire_dist_m} m`
}

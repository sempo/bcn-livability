import { useStore } from '../../store'
import { hasConditions } from '../../services/composite/compositeScore'
import { BAND_COLOR, BAND_LABEL, BAND_ORDER } from '../../services/match/matchSummary'
import { SCORE_RAMP } from '../BuildingsLayer/scoreRamp'

/**
 * The colour scale on the map itself (TODO-062): the four match bands, or the fitted gradient with "Boost contrast".
 * Hidden while the map is neutral (061) or match colours are off.
 */
export function MobileLegend() {
  const visible = useStore((s) => s.compositeVisible && hasConditions(s.compositeWeights, s.compositeRiskStrengths))
  const boost = useStore((s) => s.contrastBoost)
  const [min, max] = useStore((s) => s.compositeColorRange)
  if (!visible) return <span />
  if (boost) {
    const gradient = `linear-gradient(to right, ${SCORE_RAMP.map((s) => s.color).join(', ')})`
    return (
      <div className="mobile-legend" aria-label="Composite score colour scale">
        <span>{min}</span>
        <i className="mobile-legend__ramp" style={{ background: gradient }} />
        <span>{max}</span>
      </div>
    )
  }
  return (
    <ul className="mobile-legend" aria-label="Match bands">
      {BAND_ORDER.map((band) => (
        <li key={band}><i style={{ background: BAND_COLOR[band] }} />{BAND_LABEL[band].replace(' match', '')}</li>
      ))}
    </ul>
  )
}

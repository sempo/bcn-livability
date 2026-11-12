import { useMemo } from 'react'
import { useStore } from '../../store'
import { BAND_COLOR, BAND_LABEL, BAND_ORDER, bandShares } from '../../services/match/matchSummary'

/** Share of homes per match band (Great / Good / Partial / Poor), from the scores the map is showing. */
export function MatchBar() {
  const scores = useStore((s) => s.buildingScores)
  const shares = useMemo(() => (scores ? bandShares(scores) : null), [scores])
  if (!shares) return null
  const text = BAND_ORDER.map((b, i) => `${BAND_LABEL[b].replace(' match', '')} ${Math.round(shares[i])}%`).join(', ')
  return (
    <div className="match-bar">
      <div className="match-bar__caption">Homes by match</div>
      <div className="match-bar__bar" role="img" aria-label={`Homes by match: ${text}`}>
        {BAND_ORDER.map((b, i) => (
          <i key={b} style={{ width: `${shares[i]}%`, background: BAND_COLOR[b] }} />
        ))}
      </div>
      <div className="match-bar__values" aria-hidden="true">
        {BAND_ORDER.map((b, i) => (
          <span key={b}><b>{Math.round(shares[i])}%</b><em>{BAND_LABEL[b].replace(' match', '')}</em></span>
        ))}
      </div>
    </div>
  )
}

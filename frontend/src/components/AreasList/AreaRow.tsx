import type { AreaRank } from '../../services/areas/areaRank'
import { SHORT_LABEL } from '../../services/conditionOptions'

const KIND: Record<AreaRank['kind'], string> = { barri: 'barri', muni: 'municipality' }

/** One area of the list: rank, name, how many homes fit, and what the area is best at. */
export function AreaRow({ rank, position, onPick }: {
  rank: AreaRank
  position: number
  /** Undefined when the area has no polygon to fly to. */
  onPick?: (rank: AreaRank) => void
}) {
  const pct = Math.round(rank.shareGood)
  return (
    <button
      type="button"
      className="area-row"
      disabled={!onPick}
      onClick={() => onPick?.(rank)}
      aria-label={`${position}. ${rank.name}, ${pct}% of homes are a good match`}
    >
      <span className="area-row__rank" aria-hidden="true">{position}</span>
      <span className="area-row__body">
        <span className="area-row__head">
          <b>{rank.name}</b>
          <span className="area-row__kind">{KIND[rank.kind]}</span>
        </span>
        <span className="area-row__text">{pct}% of homes are a good match</span>
        <span className="area-row__bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
        {rank.strongest.length > 0 && (
          <span className="area-row__chips">
            {rank.strongest.map((k) => <span key={k} className="area-row__chip">{SHORT_LABEL[k].toLowerCase()}</span>)}
          </span>
        )}
      </span>
    </button>
  )
}

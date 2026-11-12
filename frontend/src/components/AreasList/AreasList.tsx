import { useState } from 'react'
import { useStore } from '../../store'
import { useAreaJoin } from '../../hooks/useAreaJoin'
import { selectAreaFeature } from '../../services/areas/areaSelect'
import type { AreaRank } from '../../services/areas/areaRank'
import { AreaRow } from './AreaRow'

const TOP = 10

/** "Your areas" (TODO-051): the areas ranked by the share of their homes that fit the conditions. */
export function AreasList() {
  const ranks = useStore((s) => s.areaRanks)
  const join = useAreaJoin()
  const [showAll, setShowAll] = useState(false)

  if (!ranks) return <p className="areas-list__note">Scoring the homes…</p>
  const ranked = ranks.filter((r) => r.ranked)
  const small = ranks.filter((r) => !r.ranked)
  if (ranked.length === 0) return <p className="areas-list__note">No areas to rank yet. Pick a condition first.</p>

  const shown = showAll ? ranked : ranked.slice(0, TOP)
  const pick = (r: AreaRank) => {
    const feature = join?.get(r.index)
    if (feature) selectAreaFeature(feature)
  }
  return (
    <div className="areas-list">
      <p className="areas-list__note">
        {showAll || ranked.length <= TOP ? `All ${ranked.length} areas` : `Top ${TOP} of ${ranked.length} areas`}, by the share of homes that fit.
      </p>
      <div className="areas-list__rows">
        {shown.map((r, i) => (
          <AreaRow key={r.index} rank={r} position={i + 1} onPick={join?.has(r.index) ? pick : undefined} />
        ))}
      </div>
      {!showAll && ranked.length > TOP && (
        <button type="button" className="areas-list__more" onClick={() => setShowAll(true)}>
          Show all {ranked.length}
        </button>
      )}
      {small.length > 0 && (
        <p className="areas-list__small">
          Too few homes to rank: {small.map((r) => r.name).join(', ')}.
        </p>
      )}
    </div>
  )
}

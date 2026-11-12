import { useState } from 'react'
import { useStore } from '../../store'
import { hasConditions } from '../../services/composite/compositeScore'
import { useAreaJoin } from '../../hooks/useAreaJoin'
import { selectAreaFeature } from '../../services/areas/areaSelect'
import type { AreaRank } from '../../services/areas/areaRank'
import type { AreaFeature } from '../../services/areas'
import { AreaRow } from './AreaRow'

/** Areas shown at first: all of Barcelona's districts matter more than the metro-area towns. */
const TOP = { barri: 10, muni: 5 } as const

function Section({ id, title, ranks, join, onPick }: {
  id: 'barri' | 'muni'
  title: string
  ranks: AreaRank[]
  join: Map<number, AreaFeature> | null
  onPick: (r: AreaRank) => void
}) {
  const [showAll, setShowAll] = useState(false)
  if (ranks.length === 0) return null
  const top = TOP[id]
  const all = showAll || ranks.length <= top
  const shown = all ? ranks : ranks.slice(0, top)
  return (
    <section className="areas-list__section" aria-label={title}>
      <div className="areas-list__section-head">
        <h3>{title}</h3>
        <span>{all ? `All ${ranks.length}` : `Top ${top} of ${ranks.length}`}</span>
      </div>
      {shown.map((r, i) => (
        <AreaRow key={r.index} rank={r} position={i + 1} showKind={false} onPick={join?.has(r.index) ? onPick : undefined} />
      ))}
      {!all && (
        <button type="button" className="areas-list__more" onClick={() => setShowAll(true)}>
          Show all {ranks.length}
        </button>
      )}
    </section>
  )
}

/**
 * "Your areas" (TODO-051, 052): the areas ranked by the share of their homes that fit the conditions, in two
 * sections: the barris of Barcelona and the towns of the metro area.
 */
export function AreasList() {
  const ranks = useStore((s) => s.areaRanks)
  const join = useAreaJoin()
  const anyCondition = useStore((s) => hasConditions(s.compositeWeights))

  if (!anyCondition) return <p className="areas-list__note">Add a condition to rank the areas.</p>
  if (!ranks) return <p className="areas-list__note">Scoring the homes…</p>
  const ranked = ranks.filter((r) => r.ranked)
  const small = ranks.filter((r) => !r.ranked)
  if (ranked.length === 0) return <p className="areas-list__note">No areas to rank yet. Pick a condition first.</p>

  const pick = (r: AreaRank) => {
    const feature = join?.get(r.index)
    if (feature) selectAreaFeature(feature)
  }
  return (
    <div className="areas-list">
      <p className="areas-list__note">By the share of homes that fit.</p>
      {/* The note above stays put; the sections and the small print scroll together. */}
      <div className="areas-list__rows">
        <Section id="barri" title="Barcelona" ranks={ranked.filter((r) => r.kind === 'barri')} join={join} onPick={pick} />
        <Section id="muni" title="Metro area" ranks={ranked.filter((r) => r.kind === 'muni')} join={join} onPick={pick} />
        {small.length > 0 && (
          <p className="areas-list__small">
            Too few homes to rank: {small.map((r) => r.name).join(', ')}.
          </p>
        )}
      </div>
    </div>
  )
}

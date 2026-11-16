import { useTranslation } from 'react-i18next'
import { inPlace } from './inPlace'
import type { BuildingRanks, Rank } from '../../services/buildings/buildingRank'

function RankTile({ place, rank, id }: { place: string; rank: Rank; id: string }) {
  const { t } = useTranslation('card')
  const pct = rank.tied ? rank.samePct : rank.pct
  return (
    <div className="rank-tile" data-testid={`rank-${id}`}>
      <b>{pct}%</b>
      <span>{rank.tied ? t('rank.tileTied', { place }) : t('rank.tileBetter', { place })}</span>
    </div>
  )
}

/**
 * Where this building stands out, in its barri and in the city (TODO-070), as one or two tiles: the share as a
 * number, a short sentence beside it. A scope where it does not stand out has no tile (the card passes only the
 * scopes that earned one); with none, nothing is drawn.
 */
export function RankLines({ ranks }: { ranks: BuildingRanks }) {
  const { t } = useTranslation('card')
  const count = (ranks.local ? 1 : 0) + (ranks.wide ? 1 : 0)
  if (count === 0) return null
  return (
    <div className="rank-tiles" data-testid="rank-lines" data-count={count}>
      {ranks.local && <RankTile id="local" rank={ranks.local.rank} place={inPlace(t as never, ranks.local.name)} />}
      {ranks.wide && (
        <RankTile id="wide" rank={ranks.wide.rank}
          place={ranks.wide.scope === 'barcelona' ? inPlace(t as never, 'Barcelona') : t('rank.inMetro')} />
      )}
    </div>
  )
}

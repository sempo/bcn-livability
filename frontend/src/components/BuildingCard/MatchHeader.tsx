import { Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { BAND_LABEL, matchBand, type ConditionStatus, type MatchSummary } from '../../services/match/matchSummary'
import type { BuildingRanks } from '../../services/buildings/buildingRank'
import { RankLines } from './RankLines'

const MARK: Record<ConditionStatus, string> = { met: '✓', partly: '◐', missed: '✗', nodata: '–' }
const MARK_COLOR: Record<ConditionStatus, string> = { met: 'green.8', partly: 'yellow.9', missed: 'red.7', nodata: 'dimmed' }

interface Props {
  score: number
  summary: MatchSummary
  /** "Risk: −6 points — river flooding"; absent when no risk costs points. */
  riskText: string | null
  /** Colour of the score on the map's scale. */
  color: string
  /** Worst-case score (060). With `incomplete`, the card shows the range `scoreMin–score`. */
  scoreMin?: number
  /** Some condition that is on has no data for this building (060). */
  incomplete?: boolean
  /** Without the band and the "Meets n of m" lines: the phone sheet shows them in its header (TODO-062). */
  compact?: boolean
  /** Where the building stands in its barri and the city (TODO-070); null = no rank lines. */
  ranks?: BuildingRanks | null
}

/** Top of the building card (TODO-050): is this a match, and how it meets each of the user's conditions. */
export function MatchHeader({ score, summary, riskText, color, scoreMin, incomplete = false, compact = false, ranks = null }: Props) {
  const { t } = useTranslation('card')
  const range = incomplete && scoreMin !== undefined && scoreMin < score ? `${scoreMin}–${score}` : String(score)
  return (
    <Stack gap={4} data-testid="match-header">
      {!compact && (
        <>
          <Text size="xs" c="dimmed" fw={600} data-testid="match-label">{t('match.label')}</Text>
          <Text fw={800} lh={1.1} style={{ fontSize: 20, color }} data-testid="match-band">
            {t('match.score', { score: range })} · {BAND_LABEL[matchBand(score)]}
          </Text>
        </>
      )}
      {incomplete && (
        <Text size="xs" c="dimmed" data-testid="incomplete-note">
          {t('match.incomplete')}
        </Text>
      )}
      {!compact && (
        <Text size="sm" fw={500}>
          {summary.total > 0 ? t('match.meets', { met: summary.met, total: summary.total }) : t('match.noneOn')}
        </Text>
      )}
      {summary.rows.map((r) => (
        <Text key={r.id} size="xs" c={MARK_COLOR[r.status]}>
          {`${MARK[r.status]} ${r.label} — ${r.text}`}
        </Text>
      ))}
      {riskText && <Text size="xs" c="red.7">{`▼ ${riskText}`}</Text>}
      {ranks && <RankLines ranks={ranks} />}
      {incomplete && !ranks && (
        <Text size="xs" c="dimmed" data-testid="rank-incomplete">{t('rank.incomplete')}</Text>
      )}
    </Stack>
  )
}

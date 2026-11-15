import { Group, Stack, Text } from '@mantine/core'
import { IconAward } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { inPlace } from './inPlace'
import type { BuildingRanks, Rank } from '../../services/buildings/buildingRank'

const AWARD = '#b7791f'

function RankLine({ place, rank, id }: { place: string; rank: Rank; id: string }) {
  const { t } = useTranslation('card')
  const text = rank.tied ? t('rank.tied', { pct: rank.samePct, place }) : t('rank.better', { pct: rank.pct, place })
  return (
    <Group gap={6} wrap="nowrap" align="flex-start" data-testid={`rank-${id}`}>
      <IconAward size={16} stroke={1.8} color={AWARD} style={{ flex: 'none', marginTop: 1 }} aria-hidden />
      <Text size="xs" fw={500}>{text}</Text>
    </Group>
  )
}

/**
 * "For your conditions": where this building stands out, in its barri and in the city (TODO-070), as a sentence
 * with an award mark: "This home is better than 85% of homes in Sant Antoni". A scope where it does not stand
 * out has no line (the card passes only the scopes that earned one).
 */
export function RankLines({ ranks }: { ranks: BuildingRanks }) {
  const { t } = useTranslation('card')
  return (
    <Stack gap={5} mt={4} data-testid="rank-lines">
      <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: 0.4 }}>{t('rank.heading')}</Text>
      {ranks.local && <RankLine id="local" rank={ranks.local.rank} place={inPlace(t as never, ranks.local.name)} />}
      {ranks.wide && (
        <RankLine id="wide" rank={ranks.wide.rank}
          place={ranks.wide.scope === 'barcelona' ? inPlace(t as never, 'Barcelona') : t('rank.inMetro')} />
      )}
    </Stack>
  )
}

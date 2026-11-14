import { Group, Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import {
  PROBLEM_LABELS, topProblems, type BarriVibe, type BarriVibeData,
} from '../../services/localsOpinion/localsOpinion'
import { dec1 } from './cardColors'

const PENALTY_COLOR = '#d73027'

export function RiskRow({ label, text, penalty, hint }: { label: string; text: string; penalty: number; hint?: string }) {
  const { t } = useTranslation('card')
  return (
    <Stack gap={0}>
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Text size="xs" fw={500}>{label}</Text>
        {penalty > 0 && (
          <Text size="xs" fw={600} style={{ color: PENALTY_COLOR }}>{t('ui.penalty', { n: penalty })}</Text>
        )}
      </Group>
      <Text size="xs" c="dimmed">{text}</Text>
      {hint && penalty > 0 && (
        <Text size="xs" c="dimmed" fs="italic" style={{ fontSize: 10 }}>{hint}</Text>
      )}
    </Stack>
  )
}

/** Value next to the city median (median over barris). */
function VsCityRow({ label, value, city, indent }: { label: string; value: string; city: string; indent?: boolean }) {
  const { t } = useTranslation('card')
  return (
    <Group gap={6} wrap="nowrap" pl={indent ? 8 : 0}>
      <Text size="xs" c="dimmed" style={{ flex: 1 }}>{label}</Text>
      <Text size="xs" fw={600}>{value}</Text>
      <Text size="xs" c="dimmed" w={58} ta="right" style={{ fontSize: 10 }}>{t('locals.city', { value: city })}</Text>
    </Group>
  )
}

function trendText(delta: number, noChange: string): string {
  if (delta > 0) return `▲ ${dec1(delta)}`
  if (delta < 0) return `▼ ${dec1(-delta)}`
  return noChange
}

/** "What locals say" — residents' view of the barri, raw survey values (042). */
export function LocalsSay({ barri, data }: { barri: BarriVibe; data: BarriVibeData }) {
  const { t } = useTranslation('card')
  const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v)}%`)
  return (
    <Stack gap={3}>
      <VsCityRow label={t('locals.satisfaction')} value={t('locals.outOf10', { value: dec1(barri.satisf) })} city={dec1(data.city.satisf)} />
      <VsCityRow label={t('locals.stay')} value={pct(barri.stay)} city={pct(data.city.stay)} />
      {!barri.lowN && barri.delta !== null && (
        <Group gap={6} wrap="nowrap">
          <Text size="xs" c="dimmed" style={{ flex: 1 }}>{t('locals.trend')}</Text>
          <Text size="xs" fw={600}>{trendText(barri.delta, t('locals.noChange'))}</Text>
        </Group>
      )}
      <Text size="xs" c="dimmed" mt={2}>{t('locals.problems')}</Text>
      {topProblems(barri).map((p) => (
        <VsCityRow key={p.id} indent label={PROBLEM_LABELS[p.id]} value={pct(p.pct)}
          city={pct(data.city.problems[p.id])} />
      ))}
      <Text size="xs" c="dimmed" style={{ fontSize: 10, opacity: 0.7 }} mt={2}>
        {t('locals.source', { years: data.years, n: barri.n })}
      </Text>
      {barri.lowN && (
        <Text size="xs" c="dimmed" fs="italic" style={{ fontSize: 10 }}>
          {t('locals.smallSample')}
        </Text>
      )}
    </Stack>
  )
}

export function ScoreBar({ score, color }: { score: number | null; color: string }) {
  return (
    <Group gap={8} align="center" wrap="nowrap">
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#eee', overflow: 'hidden', minWidth: 50 }}>
        {score !== null && (
          <div style={{ height: '100%', width: `${score}%`, background: color }} />
        )}
      </div>
      <Text size="xs" fw={600} style={{ color: score !== null ? color : '#aaa', minWidth: 48, textAlign: 'right' }}>
        {score !== null ? `${score} / 100` : '— / 100'}
      </Text>
    </Group>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text size="xs" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.05em' }}>
      {children}
    </Text>
  )
}

export function LandmarkRow({ name, minutes }: { name: string; minutes: number }) {
  const { t } = useTranslation('card')
  return (
    <Group justify="space-between" gap="xs" wrap="nowrap">
      <Text size="xs" c="dimmed" style={{ flexShrink: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </Text>
      <Text size="xs" fw={500} style={{ flexShrink: 0 }}>{t('minutes', { n: Math.round(minutes) })}</Text>
    </Group>
  )
}

/** Small colour-coded label for noise level relative to reference thresholds. */
export function NoiseLabel({ lden }: { lden: number }) {
  const { t } = useTranslation('card')
  let label: string
  let color: string
  if (lden < 45) { label = t('noise.veryQuiet'); color = '#1a9850' }
  else if (lden < 53) { label = t('noise.quiet'); color = '#91cf60' }
  else if (lden < 55) { label = t('noise.nearWho'); color = '#fee08b' }
  else if (lden < 65) { label = t('noise.aboveEu'); color = '#fc8d59' }
  else { label = t('noise.highly'); color = '#d73027' }
  return <Text size="xs" style={{ color }}>{label}</Text>
}

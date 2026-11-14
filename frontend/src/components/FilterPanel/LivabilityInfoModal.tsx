import { Modal, Stack, Text } from '@mantine/core'
import { Trans, useTranslation } from 'react-i18next'
import { formatNumber } from '../../i18n/format'
import {
  MINUTES_FALLOFF_FACTOR, NOISE_FALLOFF_DB, PRICE_FALLOFF_PCT, SATISF_FALLOFF,
} from '../../services/buildings/conditions'
import { features } from '../../features'

/** One block of the explanation: a heading and a paragraph from the language files. */
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap={6}>
      <Text size="sm" fw={600}>{title}</Text>
      {children}
    </Stack>
  )
}

export function LivabilityInfoModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { t } = useTranslation('info')
  return (
    <Modal opened={opened} onClose={onClose} title={t('livability.title')} size="md">
      <Stack gap={12} pb={8}>
        <Text size="sm">{t('livability.intro')}</Text>

        <Block title={t('livability.walkTitle')}>
          <Text size="xs" c="dimmed">{t('livability.walk', { factor: MINUTES_FALLOFF_FACTOR })}</Text>
        </Block>

        <Block title={t('livability.noiseTitle')}>
          <Text size="xs" c="dimmed">{t('livability.noise', { falloff: NOISE_FALLOFF_DB })}</Text>
        </Block>

        <Block title={t('livability.coreTitle')}>
          <Text size="xs" c="dimmed">{t('livability.core', { factor: MINUTES_FALLOFF_FACTOR })}</Text>
        </Block>

        <Block title={t('livability.priceTitle')}>
          <Text size="xs" c="dimmed">{t('livability.price', { pct: PRICE_FALLOFF_PCT })}</Text>
        </Block>

        {features.localsOpinion && (
          <Block title={t('livability.localsTitle')}>
            <Text size="xs" c="dimmed">{t('livability.locals', { falloff: formatNumber(SATISF_FALLOFF) })}</Text>
          </Block>
        )}

        <Block title={t('livability.ageTitle')}>
          <Text size="xs" c="dimmed">{t('livability.age')}</Text>
        </Block>

        <Block title={t('livability.riskTitle')}>
          <Text size="xs" c="dimmed">{t('livability.risk')}</Text>
          <Text size="xs" c="dimmed"><Trans i18nKey="livability.river" ns="info" components={{ b: <b /> }} /></Text>
          <Text size="xs" c="dimmed"><Trans i18nKey="livability.fire" ns="info" components={{ b: <b /> }} /></Text>
          <Text size="xs" c="dimmed"><Trans i18nKey="livability.street" ns="info" components={{ b: <b /> }} /></Text>
        </Block>
      </Stack>
    </Modal>
  )
}

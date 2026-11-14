import { Anchor, Drawer, Stack, Text } from '@mantine/core'
import { Trans, useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher'

/** "About": the name, what the map is, who made it and where the data and the map come from (TODO-062). */
export function AboutSheet({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const mapAttribution = useStore((s) => s.mapAttribution)
  return (
    <Drawer
      opened={opened} onClose={onClose} position="bottom" size="auto" radius="lg" title={t('about.title')} padding="lg"
      classNames={{ content: 'bottom-sheet' }}
    >
      <Stack gap="sm" pb="md">
        <Stack gap={6} align="flex-start">
          <img src={`${import.meta.env.BASE_URL}time2map-mark.svg`} alt="time2map" height={28} />
          <Text fw={700} size="lg">{t('brand.title')}</Text>
        </Stack>
        <Text size="sm">{t('about.what')}</Text>
        <Text size="sm">
          <Trans i18nKey="about.madeBy"
            components={{ link: <Anchor href="https://time2map.com" target="_blank" rel="noopener noreferrer" /> }} />
        </Text>
        <LanguageSwitcher inline />
        <Text size="xs" c="dimmed">{t('about.data')}</Text>
        {mapAttribution && (
          // HTML attribution from the trusted ICGC style
          <div className="panel-attribution" dangerouslySetInnerHTML={{ __html: mapAttribution }} />
        )}
      </Stack>
    </Drawer>
  )
}

import { Anchor, Drawer, Stack, Text } from '@mantine/core'
import { useStore } from '../../store'

/** "About": the name, what the map is, who made it and where the data and the map come from (TODO-062). */
export function AboutSheet({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const mapAttribution = useStore((s) => s.mapAttribution)
  return (
    <Drawer
      opened={opened} onClose={onClose} position="bottom" size="auto" radius="lg" title="About" padding="lg"
      classNames={{ content: 'bottom-sheet' }}
    >
      <Stack gap="sm" pb="md">
        <Stack gap={6} align="flex-start">
          <img src={`${import.meta.env.BASE_URL}time2map-mark.svg`} alt="time2map" height={28} />
          <Text fw={700} size="lg">Barcelona livability map</Text>
        </Stack>
        <Text size="sm">
          Every home in Barcelona and its metropolitan area, coloured by how well it fits your own conditions: noise,
          walking distance to everyday services, access to the centre, price and climate risks.
        </Text>
        <Text size="sm">
          Made by <Anchor href="https://time2map.com" target="_blank" rel="noopener noreferrer">time2map</Anchor>.
          No account needed; your settings stay in this browser.
        </Text>
        <Text size="xs" c="dimmed">
          Data: Dirección General del Catastro, Ajuntament de Barcelona (Open Data BCN), Generalitat de Catalunya,
          ICGC, © OpenStreetMap contributors.
        </Text>
        {mapAttribution && (
          // HTML attribution from the trusted ICGC style
          <div className="panel-attribution" dangerouslySetInnerHTML={{ __html: mapAttribution }} />
        )}
      </Stack>
    </Drawer>
  )
}

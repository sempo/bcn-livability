import { SegmentedControl, Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { features } from '../../features'
import { useStore, mapLayerOf, type MapLayerId } from '../../store'
import { NoiseLegend } from '../NoiseLayer/NoiseLegend'
import { FloodZonesLegend } from '../FloodZonesLayer/FloodZonesLegend'
import { StreetFloodingLegend } from '../StreetFloodingLayer/StreetFloodingLegend'
import { WildfireLegend } from '../WildfireLayer/WildfireLegend'

const LAYER_IDS: MapLayerId[] = (['none', 'noise', 'river', 'street', 'wildfire'] as MapLayerId[])
  .filter((id) => !(features.commercialUse && id === 'street')) // no licence for the RESCCUE data (TODO-066)

/** The expert layers under one control: one at a time, with the legend of the chosen one (TODO-052). */
export function MapLayersControl() {
  const { t } = useTranslation('panel')
  const layer = useStore(mapLayerOf)
  const setMapLayer = useStore((s) => s.setMapLayer)
  return (
    <Stack gap={8}>
      <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.06em' }}>{t('layers.title')}</Text>
      <SegmentedControl
        fullWidth
        size="xs"
        radius="md"
        value={layer}
        onChange={(v) => setMapLayer(v as MapLayerId)}
        data={LAYER_IDS.map((value) => ({ value, label: t(`layers.${value}`) }))}
        aria-label={t('layers.title')}
        className="map-layers-control"
      />
      {layer === 'none' && <Text size="xs" c="dimmed">{t('layers.hint')}</Text>}
      {layer === 'noise' && <NoiseLegend />}
      {layer === 'river' && <FloodZonesLegend />}
      {layer === 'street' && <StreetFloodingLegend />}
      {layer === 'wildfire' && <WildfireLegend />}
    </Stack>
  )
}

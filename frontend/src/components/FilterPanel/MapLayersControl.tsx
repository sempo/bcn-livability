import { SegmentedControl, Stack, Text } from '@mantine/core'
import { useStore, mapLayerOf, type MapLayerId } from '../../store'
import { NoiseLegend } from '../NoiseLayer/NoiseLegend'
import { FloodZonesLegend } from '../FloodZonesLayer/FloodZonesLegend'
import { StreetFloodingLegend } from '../StreetFloodingLayer/StreetFloodingLegend'
import { WildfireLegend } from '../WildfireLayer/WildfireLegend'

const LAYERS: { value: MapLayerId; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'noise', label: 'Noise' },
  { value: 'river', label: 'River floods' },
  { value: 'street', label: 'Street flooding' },
  { value: 'wildfire', label: 'Wildfire' },
]

/** The expert layers under one control: one at a time, with the legend of the chosen one (TODO-052). */
export function MapLayersControl() {
  const layer = useStore(mapLayerOf)
  const setMapLayer = useStore((s) => s.setMapLayer)
  return (
    <Stack gap={8}>
      <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.06em' }}>Map layers</Text>
      <SegmentedControl
        fullWidth
        size="xs"
        radius="md"
        value={layer}
        onChange={(v) => setMapLayer(v as MapLayerId)}
        data={LAYERS}
        aria-label="Map layers"
        className="map-layers-control"
      />
      {layer === 'none' && <Text size="xs" c="dimmed">One layer at a time, with its own legend.</Text>}
      {layer === 'noise' && <NoiseLegend />}
      {layer === 'river' && <FloodZonesLegend />}
      {layer === 'street' && <StreetFloodingLegend />}
      {layer === 'wildfire' && <WildfireLegend />}
    </Stack>
  )
}

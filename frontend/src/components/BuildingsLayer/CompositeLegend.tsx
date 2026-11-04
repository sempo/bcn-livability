import { Group, Text } from '@mantine/core'
import { useStore } from '../../store'
import { SCORE_RAMP } from './scoreRamp'

/** Colour scale of the map: the score range of the visible buildings (TODO-032). */
export function CompositeLegend() {
  const [min, max] = useStore((s) => s.compositeColorRange)
  const gradient = `linear-gradient(to right, ${SCORE_RAMP.map((s) => s.color).join(', ')})`
  return (
    <div>
      <div
        style={{ height: 10, borderRadius: 3, background: gradient }}
        aria-label="Composite score colour scale"
      />
      <Group justify="space-between" gap={0} mt={2}>
        <Text size="9px" c="dimmed">{min}</Text>
        <Text size="9px" c="dimmed">{max}</Text>
      </Group>
      <Text size="xs" c="dimmed">Colours relative to the visible area</Text>
    </div>
  )
}

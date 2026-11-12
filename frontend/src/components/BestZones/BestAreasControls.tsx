import { ActionIcon, Button, Checkbox, Group, Popover, Stack, Text } from '@mantine/core'
import { IconSettings } from '@tabler/icons-react'
import { useStore } from '../../store'
import { useMapStore } from '../../store/mapStore'
import { TOP_PCT_STEPS, stepIndex } from '../../services/bestZonesConfig'
import { visibleBounds } from '../Map/visibleBounds'
import { BaseUrlInput } from './BaseUrlInput'
import { features } from '../../features'

/**
 * Best areas, inside the filter panel (TODO-052): one button to draw the best zones for what is in view, then
 * More / Fewer areas instead of a "top X %" slider. The zones themselves are drawn by BestZones on the map.
 */
export function BestAreasControls() {
  const map = useMapStore((s) => s.map)
  const visible = useStore((s) => s.compositeVisible)
  const bounds = useStore((s) => s.bestZonesBounds)
  const setBounds = useStore((s) => s.setBestZonesBounds)
  const topPct = useStore((s) => s.bestZonesTopPct)
  const setTopPct = useStore((s) => s.setBestZonesTopPct)
  const count = useStore((s) => s.bestZonesCount)
  const restrict = useStore((s) => s.bestZonesRestrict)
  const setRestrict = useStore((s) => s.setBestZonesRestrict)

  const heading = (
    <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.06em' }}>Best areas</Text>
  )
  if (!visible) {
    return (
      <Stack gap={8}>
        {heading}
        <Text size="xs" c="dimmed">Turn on the match colours to see your best areas.</Text>
      </Stack>
    )
  }
  if (!bounds) {
    return (
      <Stack gap={8}>
        {heading}
        <Button fullWidth variant="default" disabled={!map} onClick={() => map && setBounds(visibleBounds(map))}>
          Show my best areas
        </Button>
      </Stack>
    )
  }

  const i = stepIndex(topPct)
  return (
    <Stack gap={8}>
      <Group justify="space-between" wrap="nowrap">
        {heading}
        <Popover width={300} position="bottom-end" withArrow transitionProps={{ duration: 0 }}>
          <Popover.Target>
            <ActionIcon variant="subtle" color="gray" size="md" aria-label="Search filters" title="Search filters">
              <IconSettings size={16} />
            </ActionIcon>
          </Popover.Target>
          <Popover.Dropdown>
            <Text size="xs" c="dimmed" mb={6}>Zone links reuse the filters from this Idealista search:</Text>
            <BaseUrlInput />
          </Popover.Dropdown>
        </Popover>
      </Group>
      <Text size="sm" fw={600}>
        {count === null ? 'Looking for your best areas…' : count === 1 ? '1 best area in view' : `${count} best areas in view`}
      </Text>
      {count === 0 ? (
        <Text size="xs" c="dimmed">No area fits this view. Zoom out or ask for more areas.</Text>
      ) : (
        <Text size="xs" c="dimmed">Top {topPct}% of homes, numbered on the map.</Text>
      )}
      <Group gap={8} wrap="nowrap">
        <Button variant="default" size="sm" style={{ flex: 1 }} disabled={i === TOP_PCT_STEPS.length - 1}
          onClick={() => setTopPct(TOP_PCT_STEPS[i + 1])}>
          Fewer areas
        </Button>
        <Button variant="default" size="sm" style={{ flex: 1 }} disabled={i === 0}
          onClick={() => setTopPct(TOP_PCT_STEPS[i - 1])}>
          More areas
        </Button>
        <Button variant="subtle" color="gray" size="sm" onClick={() => setBounds(null)} title="Esc">Hide</Button>
      </Group>
      {(features.isochrone || features.exclusions) && (
        <Checkbox
          size="xs"
          color="#F06965"
          label="Inside commute zone, outside exclusion zones"
          checked={restrict}
          onChange={(e) => setRestrict(e.currentTarget.checked)}
        />
      )}
    </Stack>
  )
}

import { useState } from 'react'
import { ActionIcon, Group, Stack, Switch, Text } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { useStore } from '../../store'
import { hasConditions } from '../../services/composite/compositeScore'
import { LivabilityInfoModal } from './LivabilityInfoModal'

/** "Show match colours": the index on or off on the map, with the explanation behind (i) (TODO-052). */
export function MatchColoursSwitch() {
  const visible = useStore((s) => s.compositeVisible)
  const setVisible = useStore((s) => s.setCompositeVisible)
  const anyCondition = useStore((s) => hasConditions(s.compositeWeights))
  const [info, setInfo] = useState(false)
  return (
    <Stack gap={4}>
      <LivabilityInfoModal opened={info} onClose={() => setInfo(false)} />
      <Group gap={4} wrap="nowrap" align="center">
        <Switch
          label="Show match colours"
          size="sm"
          checked={visible}
          onChange={(e) => setVisible(e.currentTarget.checked)}
          style={{ flex: 1 }}
        />
        <ActionIcon size={20} variant="subtle" color="gray" onClick={() => setInfo(true)} aria-label="About Livability Index">
          <IconInfoCircle size={16} stroke={1.8} />
        </ActionIcon>
      </Group>
      {anyCondition && <Text size="xs" c="dimmed">Hatched = incomplete data (score is a range, colour shows the best case)</Text>}
    </Stack>
  )
}

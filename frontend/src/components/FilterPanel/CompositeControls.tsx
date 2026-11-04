import { useState } from 'react'
import { ActionIcon, Checkbox, Group, Modal, Slider, Stack, Switch, Text } from '@mantine/core'
import { IconSettings, IconInfoCircle } from '@tabler/icons-react'
import { useStore, ALL_WALK_CATEGORY_IDS, DEFAULT_COMPOSITE_WEIGHTS, type CompositeWeights } from '../../store'
import { LANDMARKS, ALL_LANDMARK_IDS } from '../../services/cityCore/landmarks'
import { SERVICE_CATEGORIES } from '../../services/walkability/serviceCategories'
import { DEFAULT_RISK_STRENGTHS, type RiskStrengths } from '../../services/climateRisk/climateRisk'
import { CompositeLegend } from '../BuildingsLayer/CompositeLegend'
import { SATISF_MAX, SATISF_MIN } from '../../services/localsOpinion/localsOpinion'
import { features } from '../../features'

interface GearButtonProps {
  onClick: () => void
  label: string
}

function GearButton({ onClick, label }: GearButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '0 2px', color: '#868e96', lineHeight: 0, display: 'inline-flex',
      }}
    >
      <IconSettings size={15} stroke={1.8} />
    </button>
  )
}

interface ComponentRowProps {
  label: string
  weight: number
  /** Value restored when the row is re-enabled and had no previous value. */
  defaultWeight: number
  onChange: (value: number) => void
  onGear?: () => void
  /** Noun used in the slider's accessible name, e.g. "weight" or "strength". */
  sliderNoun?: string
}

function ComponentRow({ label, weight, defaultWeight, onChange, onGear, sliderNoun = 'weight' }: ComponentRowProps) {
  const [lastWeight, setLastWeight] = useState(weight > 0 ? weight : defaultWeight)
  const enabled = weight > 0

  function toggle(checked: boolean) {
    if (checked) {
      onChange(lastWeight)
    } else {
      setLastWeight(weight)
      onChange(0)
    }
  }

  return (
    <Stack gap={4}>
      <Group gap={6} wrap="nowrap">
        <Checkbox
          size="xs"
          checked={enabled}
          onChange={(e) => toggle(e.currentTarget.checked)}
          aria-label={`Enable ${label}`}
        />
        <Text size="xs" style={{ flex: 1 }}>{label}</Text>
        {enabled && onGear && (
          <GearButton onClick={onGear} label={`Configure ${label}`} />
        )}
        {enabled && (
          <Text size="xs" c="dimmed" w={12} ta="right">{weight}</Text>
        )}
      </Group>
      {enabled && (
        <Slider
          min={1}
          max={10}
          step={1}
          size="xs"
          value={weight}
          onChange={(v) => onChange(v)}
          aria-label={`${label} ${sliderNoun}`}
          style={{ '--slider-color': '#F06965' } as React.CSSProperties}
        />
      )}
    </Stack>
  )
}

function InfoModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  return (
    <Modal opened={opened} onClose={onClose} title="About Livability Index" size="md">
      <Stack gap={12} pb={8}>
        <Text size="sm">
          The Livability Index is a weighted average of up to 5 components. Each component is
          normalised to 0–100 before combining. Adjust weights to reflect your priorities.
        </Text>

        <Stack gap={6}>
          <Text size="sm" fw={600}>Walkability</Text>
          <Text size="xs" c="dimmed">
            Scores how well-served a building is by everyday services: supermarket, pharmacy,
            park, school, kindergarten, clinic, metro, café, restaurant, beach. Distances are walked
            along the street network from the building's entrance (OSM); parks and beaches count to
            their edge. Closer services count more (decay ~400 m, max 1 500 m). Use the gear icon to
            pick which services count — the score is the mean over the ones you keep, 0–100.
          </Text>
        </Stack>

        <Stack gap={6}>
          <Text size="sm" fw={600}>Noise</Text>
          <Text size="xs" c="dimmed">
            Lden (day-evening-night level, dB) along every exposed facade of the building — street
            and courtyard sides — averaged by facade length: the noise of a typical window. Barcelona:
            the city's 2022 strategic noise map; 14 AMB municipalities: their 2022 official maps (SICA),
            a different model that reads a few dB louder.{' '}
            Formula: score = clamp((75 − Lden) / 30 × 100, 0, 100).
            Very quiet (≤ 45 dB) → 100 · WHO recommended (53 dB) → 73 · EU action level (55 dB) →
            67 · highly noisy (≥ 75 dB) → 0.
          </Text>
        </Stack>

        <Stack gap={6}>
          <Text size="sm" fw={600}>City Core Access</Text>
          <Text size="xs" c="dimmed">
            Average walking-minute score across your selected landmarks (Sagrada Família, Plaça
            Catalunya…), walked along the street network from the building.
            Per-landmark score: ≤ 15 min → 100, 30 min → 75, 45 min → 50,
            90 min → 25, &gt; 90 min → 0. Use the gear icon to pick which landmarks count.
          </Text>
        </Stack>

        <Stack gap={6}>
          <Text size="sm" fw={600}>Market Price (Generalitat)</Text>
          <Text size="xs" c="dimmed">
            Official average transaction price €/m² per neighbourhood (Generalitat de Catalunya
            open data). Normalised with dataset p5/p95 bounds — cheaper relative to the city
            distribution → higher score.
          </Text>
        </Stack>

        {features.localsOpinion && (
          <Stack gap={6}>
            <Text size="sm" fw={600}>Locals' opinion</Text>
            <Text size="xs" c="dimmed">
              How satisfied residents are with living in their barri (0–10), from Barcelona's
              municipal services survey (ESM, 2022–2026, about 30,000 interviews). Barris with few
              interviews are pulled towards their wider area (gran barri). Stretched to 0–100:
              {' '}{SATISF_MIN} → 0, {SATISF_MAX} → 100. Barcelona city only — buildings outside count
              as missing data.
            </Text>
          </Stack>
        )}

        <Stack gap={6}>
          <Text size="sm" fw={600}>Risk penalties</Text>
          <Text size="xs" c="dimmed">
            Climate risks are not averaged in — they reduce the score of exposed buildings only:
            score × (1 − strength/10 × risk). Safe buildings keep their score; strength 10 on a
            building in the highest-risk zone drives it to 0.
          </Text>
          <Text size="xs" c="dimmed">
            <b>River flood risk</b> — the building touches one of the official river flood zones (ACA): 10-year
            zone counts fully, 100-year 60%, 500-year 25%. Rivers overflowing only — rain water on
            streets is the separate Street flooding risk.
          </Text>
          <Text size="xs" c="dimmed">
            <b>Wildfire risk</b> — the building touches the wildland–urban interface (Protecció
            Civil, zones around forests ≥ 5 ha) × the hazard of the nearest forest (Generalitat
            structural wildfire hazard map 2024, classes 1–10), fading with distance. A static
            hazard map, not a forecast; recent burned areas are not reflected.
          </Text>
          <Text size="xs" c="dimmed">
            <b>Street flooding risk</b> — how deep the water gets at the building's door in a 10-year and a
            100-year rain (RESCCUE drainage model, Barcelona only). Depth is weighted smoothly: water
            up to 10 cm stays in the gutter and counts 0, 50 cm or more counts fully. Matters most for
            ground-floor flats, basements and underground parking.
          </Text>
        </Stack>

      </Stack>
    </Modal>
  )
}

export function CompositeControls() {
  const visible = useStore((s) => s.compositeVisible)
  const setVisible = useStore((s) => s.setCompositeVisible)
  const weights = useStore((s) => s.compositeWeights)
  const setWeights = useStore((s) => s.setCompositeWeights)
  const enabledIds = useStore((s) => s.enabledLandmarkIds)
  const setEnabledIds = useStore((s) => s.setEnabledLandmarkIds)
  const riskStrengths = useStore((s) => s.compositeRiskStrengths)
  const setRiskStrengths = useStore((s) => s.setCompositeRiskStrengths)
  const walkCategories = useStore((s) => s.enabledWalkCategories)
  const setWalkCategories = useStore((s) => s.setEnabledWalkCategories)

  const [cityModalOpen, setCityModalOpen] = useState(false)
  const [walkModalOpen, setWalkModalOpen] = useState(false)
  const [infoModalOpen, setInfoModalOpen] = useState(false)

  function weightRow(id: keyof CompositeWeights) {
    return {
      weight: weights[id],
      defaultWeight: DEFAULT_COMPOSITE_WEIGHTS[id] || 5,
      onChange: (value: number) => setWeights({ ...weights, [id]: value }),
    }
  }

  function riskRow(id: keyof RiskStrengths) {
    return {
      weight: riskStrengths[id],
      defaultWeight: DEFAULT_RISK_STRENGTHS[id] || 5,
      onChange: (value: number) => setRiskStrengths({ ...riskStrengths, [id]: value }),
      sliderNoun: 'strength',
    }
  }

  function toggleLandmark(id: string, checked: boolean) {
    if (checked) {
      setEnabledIds([...enabledIds, id])
    } else {
      const next = enabledIds.filter((i) => i !== id)
      if (next.length > 0) setEnabledIds(next)
    }
  }

  function toggleWalkCategory(id: string, checked: boolean) {
    const next = checked ? [...walkCategories, id] : walkCategories.filter((i) => i !== id)
    if (next.length > 0) setWalkCategories(next)
  }

  return (
    <>
      <InfoModal opened={infoModalOpen} onClose={() => setInfoModalOpen(false)} />

      <Modal
        opened={cityModalOpen}
        onClose={() => setCityModalOpen(false)}
        title="City Core landmarks"
        size="sm"
      >
        <Stack gap={6} pb={8}>
          {LANDMARKS.map((lm) => (
            <Checkbox
              key={lm.id}
              label={lm.name}
              size="xs"
              checked={enabledIds.includes(lm.id)}
              onChange={(e) => toggleLandmark(lm.id, e.currentTarget.checked)}
            />
          ))}
          <Checkbox
            label="All landmarks"
            size="xs"
            checked={enabledIds.length === ALL_LANDMARK_IDS.length}
            indeterminate={enabledIds.length > 0 && enabledIds.length < ALL_LANDMARK_IDS.length}
            onChange={(e) =>
              setEnabledIds(e.currentTarget.checked ? ALL_LANDMARK_IDS : [ALL_LANDMARK_IDS[0]])
            }
            styles={{ root: { borderTop: '1px solid #eee', paddingTop: 6, marginTop: 4 } }}
          />
        </Stack>
      </Modal>

      <Modal
        opened={walkModalOpen}
        onClose={() => setWalkModalOpen(false)}
        title="Walkability services"
        size="sm"
      >
        <Stack gap={6} pb={8}>
          {SERVICE_CATEGORIES.map((cat) => (
            <Checkbox
              key={cat.id}
              label={`${cat.emoji} ${cat.label}`}
              size="xs"
              checked={walkCategories.includes(cat.id)}
              onChange={(e) => toggleWalkCategory(cat.id, e.currentTarget.checked)}
            />
          ))}
          <Checkbox
            label="All services"
            size="xs"
            checked={walkCategories.length === ALL_WALK_CATEGORY_IDS.length}
            indeterminate={walkCategories.length > 0 && walkCategories.length < ALL_WALK_CATEGORY_IDS.length}
            onChange={(e) =>
              setWalkCategories(e.currentTarget.checked ? ALL_WALK_CATEGORY_IDS : [ALL_WALK_CATEGORY_IDS[0]])
            }
            styles={{ root: { borderTop: '1px solid #eee', paddingTop: 6, marginTop: 4 } }}
          />
        </Stack>
      </Modal>

      <Stack gap={8}>
        <Group gap={4} wrap="nowrap" align="center">
          <Switch
            label="Livability Index"
            size="sm"
            checked={visible}
            onChange={(e) => setVisible(e.currentTarget.checked)}
            style={{ flex: 1 }}
          />
          <ActionIcon
            size={16}
            variant="subtle"
            color="gray"
            onClick={() => setInfoModalOpen(true)}
            aria-label="About Livability Index"
          >
            <IconInfoCircle size={16} stroke={1.8} />
          </ActionIcon>
        </Group>
        {visible && (
          <Stack gap={10} pl={28}>
            <ComponentRow label="Walkability" {...weightRow('poiAccess')}
              onGear={() => setWalkModalOpen(true)} />
            <ComponentRow label="Noise" {...weightRow('noise')} />
            <ComponentRow label="City Core Access" {...weightRow('cityCore')}
              onGear={() => setCityModalOpen(true)} />
            <ComponentRow label="Market Price" {...weightRow('openPrice')} />
            {features.localsOpinion && (
              <ComponentRow label="Locals' opinion" {...weightRow('localsOpinion')} />
            )}

            <Text size="xs" c="dimmed" mt={2}>Risk penalties</Text>
            <ComponentRow label="River flood risk" {...riskRow('flood')} />
            <ComponentRow label="Wildfire risk" {...riskRow('fire')} />
            <ComponentRow label="Street flooding risk" {...riskRow('street')} />

            <CompositeLegend />
            <Text size="xs" c="dimmed">Black outline = missing data</Text>
          </Stack>
        )}
      </Stack>
    </>
  )
}

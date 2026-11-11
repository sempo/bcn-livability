import { useState } from 'react'
import { ActionIcon, Checkbox, Group, Modal, Slider, Stack, Switch, Text } from '@mantine/core'
import { IconSettings, IconInfoCircle } from '@tabler/icons-react'
import { useStore, ALL_WALK_CATEGORY_IDS, type CompositeWeights } from '../../store'
import { LANDMARKS, ALL_LANDMARK_IDS } from '../../services/cityCore/landmarks'
import { SERVICE_CATEGORIES } from '../../services/walkability/serviceCategories'
import { DEFAULT_RISK_STRENGTHS, type RiskStrengths } from '../../services/climateRisk/climateRisk'
import { CompositeLegend } from '../BuildingsLayer/CompositeLegend'
import { AGE_ERAS, ALL_AGE_ERA_IDS } from '../../services/buildings/buildingAge'
import {
  CONDITION_RANGES, MINUTES_FALLOFF_FACTOR, NOISE_FALLOFF_DB, PRICE_FALLOFF_PCT, SATISF_FALLOFF, noiseAnchor,
  type Conditions,
} from '../../services/buildings/conditions'
import { features } from '../../features'

const fmt = (n: number) => new Intl.NumberFormat('en-ES', { maximumFractionDigits: 0 }).format(n)

/** How much a risk penalty strength 1–10 matters, in words (047). */
function importance(weight: number): string {
  if (weight <= 2) return 'Slightly important'
  if (weight <= 4) return 'Somewhat important'
  if (weight <= 6) return 'Matters'
  if (weight <= 8) return 'Important'
  return 'Top priority'
}

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

interface StrengthRowProps {
  label: string
  weight: number
  /** Value restored when the row is re-enabled and had no previous value. */
  defaultWeight: number
  onChange: (value: number) => void
}

/** A risk penalty: on / off and how much it matters (036, 047). */
function StrengthRow({ label, weight, defaultWeight, onChange }: StrengthRowProps) {
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
        {enabled && (
          <Text size="xs" c="dimmed" ta="right" data-testid={`importance-${label}`}>{importance(weight)}</Text>
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
          aria-label={`${label} strength`}
          style={{ '--slider-color': '#F06965' } as React.CSSProperties}
        />
      )}
    </Stack>
  )
}

interface ConditionRowProps {
  label: string
  on: boolean
  onToggle: (on: boolean) => void
  onGear?: () => void
  /** The limit in real units; absent for conditions set in the gear modal only (building age). */
  limit?: { value: number; range: { min: number; max: number; step: number }; onChange: (value: number) => void }
  /** What is OK for the user, in their words. */
  sentence: string
}

/** A Livability condition in real units (049): on / off, the limit, and the sentence it amounts to. */
function ConditionRow({ label, on, onToggle, onGear, limit, sentence }: ConditionRowProps) {
  return (
    <Stack gap={4}>
      <Group gap={6} wrap="nowrap">
        <Checkbox
          size="xs"
          checked={on}
          onChange={(e) => onToggle(e.currentTarget.checked)}
          aria-label={`Enable ${label}`}
        />
        <Text size="xs" style={{ flex: 1 }}>{label}</Text>
        {on && onGear && <GearButton onClick={onGear} label={`Configure ${label}`} />}
      </Group>
      {on && limit && (
        <Slider
          {...limit.range}
          size="xs"
          value={limit.value}
          onChange={limit.onChange}
          label={null}
          aria-label={`${label} limit`}
          style={{ '--slider-color': '#F06965' } as React.CSSProperties}
        />
      )}
      {on && <Text size="xs" c="dimmed">{sentence}</Text>}
    </Stack>
  )
}

function InfoModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  return (
    <Modal opened={opened} onClose={onClose} title="About Livability Index" size="md">
      <Stack gap={12} pb={8}>
        <Text size="sm">
          The Livability Index shows how well each home meets your conditions. Turn a condition on and set
          what is OK for you: a home that meets it scores 100 on it, and less the further it falls short.
          The index is the average over the conditions that are on, then reduced by the climate risks you
          care about. Colours are relative to the visible area.
        </Text>

        <Stack gap={6}>
          <Text size="sm" fw={600}>Walkability</Text>
          <Text size="xs" c="dimmed">
            Walking minutes from the building's entrance to the nearest supermarket, pharmacy, park, school,
            kindergarten, clinic, metro, café, restaurant and beach, along the street network (OSM); parks and
            beaches count to their edge. A service within your limit counts fully, fading to 0 at {MINUTES_FALLOFF_FACTOR}×
            the limit; one beyond 1.5 km counts 0. The score is the share of your services within reach — use
            the gear icon to pick them.
          </Text>
        </Stack>

        <Stack gap={6}>
          <Text size="sm" fw={600}>Noise outside the window</Text>
          <Text size="xs" c="dimmed">
            Lden (day-evening-night level, dB) along every exposed facade of the building — street and
            courtyard sides — averaged by facade length: the noise of a typical window, modelled 4 m above the
            ground. Within your limit → 100; {NOISE_FALLOFF_DB} dB over it → 0. For reference: 45 dB a quiet courtyard,
            55 a calm street, 65 a busy street, 75 a main road; the WHO recommends below 53 dB. Barcelona: the
            city's 2022 strategic noise map; 14 AMB municipalities: their 2022 official maps (SICA), a different
            model that reads a few dB louder.
          </Text>
        </Stack>

        <Stack gap={6}>
          <Text size="sm" fw={600}>City Core Access</Text>
          <Text size="xs" c="dimmed">
            Walking minutes to each place you pick (Sagrada Família, Plaça Catalunya… — gear icon), along the
            street network from the building. A place within your limit counts fully, fading to 0 at
            {' '}{MINUTES_FALLOFF_FACTOR}× the limit; the score is the share of your places within reach.
          </Text>
        </Stack>

        <Stack gap={6}>
          <Text size="sm" fw={600}>Market Price (Generalitat)</Text>
          <Text size="xs" c="dimmed">
            Official average sale price €/m² of the building's barri (Barcelona) or municipality (Generalitat
            de Catalunya, INCASOL) — the area's average, not the price of a specific flat. At or below your
            budget → 100; {PRICE_FALLOFF_PCT}% over it → 0.
          </Text>
        </Stack>

        {features.localsOpinion && (
          <Stack gap={6}>
            <Text size="sm" fw={600}>Locals' opinion</Text>
            <Text size="xs" c="dimmed">
              How satisfied residents are with living in their barri (0–10), from Barcelona's municipal
              services survey (ESM, 2022–2026, about 30,000 interviews). Barris with few interviews are pulled
              towards their wider area (gran barri). At or above your minimum → 100; {SATISF_FALLOFF} point below it →
              0. Barcelona city only — buildings outside count as missing data.
            </Text>
          </Stack>
        )}

        <Stack gap={6}>
          <Text size="sm" fw={600}>Building age</Text>
          <Text size="xs" c="dimmed">
            Off by default. Tick the eras of construction you like (gear icon): a building of a liked era
            scores 100, any other 0, fading over a few years at the edges of an era. Year of construction from
            Catastro; a renovation is shown in the building card but does not change the score. Catastro gives
            1900 for many old buildings whose exact year is unknown, so 1900 counts for both neighbouring eras.
          </Text>
        </Stack>

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
  const contrastBoost = useStore((s) => s.contrastBoost)
  const setContrastBoost = useStore((s) => s.setContrastBoost)
  const weights = useStore((s) => s.compositeWeights)
  const setWeights = useStore((s) => s.setCompositeWeights)
  const enabledIds = useStore((s) => s.enabledLandmarkIds)
  const setEnabledIds = useStore((s) => s.setEnabledLandmarkIds)
  const riskStrengths = useStore((s) => s.compositeRiskStrengths)
  const setRiskStrengths = useStore((s) => s.setCompositeRiskStrengths)
  const walkCategories = useStore((s) => s.enabledWalkCategories)
  const setWalkCategories = useStore((s) => s.setEnabledWalkCategories)
  const ageEras = useStore((s) => s.ageEras)
  const setAgeEras = useStore((s) => s.setAgeEras)
  const conditions = useStore((s) => s.conditions)
  const setConditions = useStore((s) => s.setConditions)

  const [cityModalOpen, setCityModalOpen] = useState(false)
  const [walkModalOpen, setWalkModalOpen] = useState(false)
  const [ageModalOpen, setAgeModalOpen] = useState(false)
  const [infoModalOpen, setInfoModalOpen] = useState(false)

  function conditionRow(id: keyof CompositeWeights, limitKey?: keyof Conditions) {
    return {
      on: (weights[id] ?? 0) > 0,
      onToggle: (on: boolean) => setWeights({ ...weights, [id]: on ? 1 : 0 }),
      limit: limitKey && {
        value: conditions[limitKey],
        range: CONDITION_RANGES[limitKey],
        onChange: (value: number) => setConditions({ ...conditions, [limitKey]: value }),
      },
    }
  }

  function riskRow(id: keyof RiskStrengths) {
    return {
      weight: riskStrengths[id],
      defaultWeight: DEFAULT_RISK_STRENGTHS[id] || 5,
      onChange: (value: number) => setRiskStrengths({ ...riskStrengths, [id]: value }),
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

  function toggleAgeEra(id: string, checked: boolean) {
    const next = checked ? ALL_AGE_ERA_IDS.filter((i) => i === id || ageEras.includes(i)) : ageEras.filter((i) => i !== id)
    if (next.length > 0) setAgeEras(next)
  }

  const services = walkCategories.length === ALL_WALK_CATEGORY_IDS.length
    ? 'Everyday services'
    : `My ${walkCategories.length} service${walkCategories.length > 1 ? 's' : ''}`
  const places = enabledIds.length > 1 ? 'My places' : 'My place'
  const ageScale = ageEras.length === ALL_AGE_ERA_IDS.length
    ? "All eras count — untick the ones you don't want"
    : `Liked: ${AGE_ERAS.filter((e) => ageEras.includes(e.id)).map((e) => e.years).join(', ')}`

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

      <Modal
        opened={ageModalOpen}
        onClose={() => setAgeModalOpen(false)}
        title="Building age — eras you like"
        size="sm"
      >
        <Stack gap={8} pb={8}>
          {AGE_ERAS.map((era) => (
            <Checkbox
              key={era.id}
              label={`${era.name} · ${era.years}`}
              description={era.about}
              size="xs"
              checked={ageEras.includes(era.id)}
              onChange={(e) => toggleAgeEra(era.id, e.currentTarget.checked)}
            />
          ))}
          <Checkbox
            label="All eras"
            size="xs"
            checked={ageEras.length === ALL_AGE_ERA_IDS.length}
            indeterminate={ageEras.length > 0 && ageEras.length < ALL_AGE_ERA_IDS.length}
            onChange={(e) => setAgeEras(e.currentTarget.checked ? ALL_AGE_ERA_IDS : [ALL_AGE_ERA_IDS[0]])}
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
            <ConditionRow label="Walkability" {...conditionRow('poiAccess', 'walkMaxMin')}
              onGear={() => setWalkModalOpen(true)}
              sentence={`${services} within ${conditions.walkMaxMin} min walk`} />
            <ConditionRow label="Noise outside the window" {...conditionRow('noise', 'noiseMaxDb')}
              sentence={`Up to ${conditions.noiseMaxDb} dB is OK for me — like ${noiseAnchor(conditions.noiseMaxDb)}`} />
            <ConditionRow label="City Core Access" {...conditionRow('cityCore', 'cityCoreMaxMin')}
              onGear={() => setCityModalOpen(true)}
              sentence={`${places} within ${conditions.cityCoreMaxMin} min walk`} />
            <ConditionRow label="Market Price" {...conditionRow('openPrice', 'priceMaxEurM2')}
              sentence={`I'm ready to pay up to €${fmt(conditions.priceMaxEurM2)}/m²`} />
            {features.localsOpinion && (
              <ConditionRow label="Locals' opinion" {...conditionRow('localsOpinion', 'localsMin')}
                sentence={`Residents rate their barri at least ${conditions.localsMin.toFixed(1)} / 10`} />
            )}
            <ConditionRow label="Building age" {...conditionRow('age')}
              onGear={() => setAgeModalOpen(true)} sentence={ageScale} />

            <Text size="xs" c="dimmed" mt={2}>Risk penalties</Text>
            <StrengthRow label="River flood risk" {...riskRow('flood')} />
            <StrengthRow label="Wildfire risk" {...riskRow('fire')} />
            <StrengthRow label="Street flooding risk" {...riskRow('street')} />

            <CompositeLegend />
            <Switch
              size="xs"
              label="Boost contrast for this view"
              checked={contrastBoost}
              onChange={(e) => setContrastBoost(e.currentTarget.checked)}
            />
            <Text size="xs" c="dimmed">Black outline = missing data</Text>
          </Stack>
        )}
      </Stack>
    </>
  )
}

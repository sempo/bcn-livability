import { useStore } from '../../store'
import { useBudgetShares } from '../../hooks/useBudgetShares'
import {
  CENTRE_OPTIONS, LOCALS_OPTIONS, NOISE_OPTIONS, PRICE_OPTIONS, WALK_OPTIONS,
  formatEuroM2, optionFor, riskLevel, strengthsFor, type ConditionKey, type WordOption,
} from '../../services/conditionOptions'
import { CONDITION_RANGES, type Conditions } from '../../services/buildings/conditions'
import { AGE_ERAS } from '../../services/buildings/buildingAge'
import { LANDMARKS } from '../../services/cityCore/landmarks'
import { SERVICE_CATEGORIES } from '../../services/walkability/serviceCategories'
import { WordPicker } from './WordPicker'
import { OptionList, type Choice } from './OptionList'
import { CheckList } from './CheckList'

/** A number of a condition ("58 dB", "10 min") as a tappable word with verbal steps and a custom slider. */
function LimitWord({ field, options, title, format }: {
  field: keyof Conditions
  options: readonly WordOption[]
  title: string
  format: (v: number) => string
}) {
  const conditions = useStore((s) => s.conditions)
  const setConditions = useStore((s) => s.setConditions)
  const value = conditions[field]
  const set = (v: number) => setConditions({ ...conditions, [field]: v })
  const range = CONDITION_RANGES[field]
  return (
    <WordPicker label={optionFor(options, value)?.label ?? format(value)} title={title}>
      {(close) => (
        <OptionList
          options={options}
          value={value}
          onChange={(v) => { set(v); close() }}
          custom={{ ...range, format, onChange: set }}
        />
      )}
    </WordPicker>
  )
}

const dB = (v: number) => `${v} dB`
const min = (v: number) => `${v} min`

function ServicesWord() {
  const selected = useStore((s) => s.enabledWalkCategories)
  const set = useStore((s) => s.setEnabledWalkCategories)
  const all = SERVICE_CATEGORIES.every((c) => selected.includes(c.id))
  const label = all ? 'Everyday services' : selected.length === 1
    ? SERVICE_CATEGORIES.find((c) => c.id === selected[0])?.label ?? 'My service'
    : `My ${selected.length} services`
  return (
    <WordPicker label={label} title="Which services should be close?">
      {() => (
        <CheckList
          items={SERVICE_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))}
          selected={selected}
          onChange={set}
          allLabel="All services"
        />
      )}
    </WordPicker>
  )
}

function PlacesWord() {
  const selected = useStore((s) => s.enabledLandmarkIds)
  const set = useStore((s) => s.setEnabledLandmarkIds)
  const all = LANDMARKS.every((l) => selected.includes(l.id))
  const label = all ? 'The centre' : selected.length === 1
    ? LANDMARKS.find((l) => l.id === selected[0])?.name ?? 'My place'
    : `My ${selected.length} places`
  return (
    <WordPicker label={label} title="Close to which places?">
      {() => (
        <CheckList
          items={LANDMARKS.map((l) => ({ id: l.id, label: l.name }))}
          selected={selected}
          onChange={set}
          allLabel="The whole centre (all 13)"
        />
      )}
    </WordPicker>
  )
}

function ErasWord() {
  const selected = useStore((s) => s.ageEras)
  const set = useStore((s) => s.setAgeEras)
  const all = AGE_ERAS.every((e) => selected.includes(e.id))
  const label = all ? 'any era' : selected.length === 1
    ? AGE_ERAS.find((e) => e.id === selected[0])?.years ?? 'one era'
    : `${selected.length} eras`
  return (
    <WordPicker label={label} title="Which buildings do you like?">
      {() => (
        <CheckList
          items={AGE_ERAS.map((e) => ({ id: e.id, label: e.name, hint: e.years }))}
          selected={selected}
          onChange={set}
          allLabel="Any era"
        />
      )}
    </WordPicker>
  )
}

const RISK_CHOICES: Choice<'avoid' | 'strong'>[] = [
  { value: 'avoid', label: 'Avoid' },
  { value: 'strong', label: 'Strongly avoid' },
]

function RiskWord() {
  const strengths = useStore((s) => s.compositeRiskStrengths)
  const set = useStore((s) => s.setCompositeRiskStrengths)
  const level = riskLevel(strengths)
  const label = level === 'strong' ? 'Strongly avoid' : level === 'custom' ? 'Custom' : 'Avoid'
  return (
    <WordPicker label={label} title="How much should flood and wildfire risk count?">
      {(close) => (
        <OptionList
          options={RISK_CHOICES}
          value={level === 'avoid' || level === 'strong' ? level : ('custom' as 'avoid')}
          onChange={(v) => { set(strengthsFor(v)); close() }}
        />
      )}
    </WordPicker>
  )
}

/** One condition as a sentence whose highlighted words are the controls (TODO-031). */
export function SentenceRow({ condition }: { condition: ConditionKey }) {
  const share = useBudgetShares()
  const priceOptions = PRICE_OPTIONS.map((o) => ({ ...o, hint: share ? `≈ ${share(o.value)}% of homes` : undefined }))
  switch (condition) {
    case 'noise':
      return (
        <p className="sentence">
          Up to <LimitWord field="noiseMaxDb" options={NOISE_OPTIONS} title="How quiet should it be outside your window?" format={dB} /> outside my window
        </p>
      )
    case 'poiAccess':
      return (
        <p className="sentence">
          <ServicesWord /> within <LimitWord field="walkMaxMin" options={WALK_OPTIONS} title="How far would you walk for daily errands?" format={min} /> on foot
        </p>
      )
    case 'cityCore':
      return (
        <p className="sentence">
          <PlacesWord /> within <LimitWord field="cityCoreMaxMin" options={CENTRE_OPTIONS} title="How close to the centre?" format={min} /> on foot
        </p>
      )
    case 'openPrice':
      return (
        <p className="sentence">
          Up to <LimitWord field="priceMaxEurM2" options={priceOptions} title="Budget per m² in the area (average sale price, not one flat)" format={formatEuroM2} /> in the area
        </p>
      )
    case 'localsOpinion':
      return (
        <p className="sentence">
          Residents rate the area at least <LimitWord field="localsMin" options={LOCALS_OPTIONS} title="How happy should residents be with the area?" format={(v) => v.toFixed(1)} /> out of 10
        </p>
      )
    case 'age':
      return <p className="sentence">Built in <ErasWord /></p>
    case 'risk':
      return <p className="sentence"><RiskWord /> flood and wildfire risk</p>
  }
}

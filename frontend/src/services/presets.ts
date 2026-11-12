import { CONDITION_KEYS, type ConditionKey, type Profile } from './conditionOptions'

// Profiles of the first onboarding screen (TODO-031). A profile is a sentence that is already filled in; the
// person can still change every word. Override one with ENV `VITE_PRESET_<ID>` = JSON of the fields to change.

const BASE: Profile[] = [
  {
    id: 'family', name: 'Family',
    blurb: 'Quiet street, school and park on foot, up to €3,500/m²',
    order: ['noise', 'poiAccess', 'openPrice', 'risk'],
    conditions: { noiseMaxDb: 58, walkMaxMin: 10, priceMaxEurM2: 3500 },
    walkCategories: ['school', 'kindergarten', 'park', 'supermarket', 'pharmacy'],
    risk: 'avoid',
  },
  {
    id: 'remote', name: 'Remote worker',
    blurb: 'Café and park nearby, 30 min to the centre',
    order: ['poiAccess', 'cityCore', 'noise'],
    conditions: { walkMaxMin: 10, cityCoreMaxMin: 30, noiseMaxDb: 58 },
    walkCategories: ['cafe', 'supermarket', 'park'],
  },
  {
    id: 'city', name: 'City life',
    blurb: '15 min to the centre, bars and metro at the door',
    order: ['cityCore', 'poiAccess', 'noise'],
    conditions: { cityCoreMaxMin: 15, walkMaxMin: 5, noiseMaxDb: 65 },
    walkCategories: ['cafe', 'restaurant', 'metro'],
  },
  {
    id: 'investor', name: 'Investor',
    blurb: 'Up to €3,500/m², happy residents',
    order: ['openPrice', 'cityCore', 'localsOpinion'],
    conditions: { priceMaxEurM2: 3500, cityCoreMaxMin: 30, localsMin: 7.5 },
  },
]

/** A profile with the fields of a JSON override applied; a broken or non-object override changes nothing. */
export function applyOverride(base: Profile, raw: string | undefined): Profile {
  if (!raw) return base
  try {
    const o = JSON.parse(raw) as unknown
    if (typeof o !== 'object' || o === null || Array.isArray(o)) return base
    const patch = o as Partial<Profile>
    const order = Array.isArray(patch.order)
      ? patch.order.filter((k): k is ConditionKey => CONDITION_KEYS.includes(k as ConditionKey))
      : base.order
    return { ...base, ...patch, id: base.id, order }
  } catch {
    return base
  }
}

const OVERRIDES: Record<string, string | undefined> = {
  family: import.meta.env.VITE_PRESET_FAMILY,
  remote: import.meta.env.VITE_PRESET_REMOTE,
  city: import.meta.env.VITE_PRESET_CITY,
  investor: import.meta.env.VITE_PRESET_INVESTOR,
}

export const PRESETS: Profile[] = BASE.map((p) => applyOverride(p, OVERRIDES[p.id]))

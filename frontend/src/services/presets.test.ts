import { describe, it, expect } from 'vitest'
import { PRESETS, applyOverride } from './presets'
import { profileToPatch, CONDITION_KEYS, type Profile } from './conditionOptions'
import { SERVICE_CATEGORIES } from './walkability/serviceCategories'
import { LANDMARKS } from './cityCore/landmarks'
import { CONDITION_RANGES } from './buildings/conditions'

describe('PRESETS', () => {
  it('has the four profiles in the agreed order', () => {
    expect(PRESETS.map((p) => p.name)).toEqual(['Family', 'Remote worker', 'City life', 'Investor'])
  })

  it('ids and names are unique', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length)
    expect(new Set(PRESETS.map((p) => p.name)).size).toBe(PRESETS.length)
  })

  it.each(PRESETS.map((p) => [p.name, p] as const))('%s: rows are known, unique and inside the slider ranges', (_n, p) => {
    expect(p.order.length).toBeGreaterThan(0)
    expect(new Set(p.order).size).toBe(p.order.length)
    for (const k of p.order) expect(CONDITION_KEYS).toContain(k)
    for (const [key, v] of Object.entries(p.conditions ?? {})) {
      const range = CONDITION_RANGES[key as keyof typeof CONDITION_RANGES]
      expect(v).toBeGreaterThanOrEqual(range.min)
      expect(v).toBeLessThanOrEqual(range.max)
    }
    expect(p.blurb.length).toBeGreaterThan(10)
  })

  it.each(PRESETS.map((p) => [p.name, p] as const))('%s: services and places exist', (_n, p) => {
    const services = SERVICE_CATEGORIES.map((c) => c.id)
    for (const id of p.walkCategories ?? []) expect(services).toContain(id)
    const places = LANDMARKS.map((l) => l.id)
    for (const id of p.landmarkIds ?? []) expect(places).toContain(id)
  })

  it.each(PRESETS.map((p) => [p.name, p] as const))('%s: conditions that are not listed are off', (_n, p) => {
    const patch = profileToPatch(p)
    const on = Object.entries(patch.weights!).filter(([, v]) => v === 1).map(([k]) => k)
    for (const k of on) expect(p.order).toContain(k)
    expect(patch.order).toEqual(p.order.filter((k) => k !== 'localsOpinion' || on.includes('localsOpinion')))
  })

  it('Family avoids risks, Investor does not', () => {
    const risk = (id: string) => profileToPatch(PRESETS.find((p) => p.id === id)!).riskStrengths!
    expect(risk('family').flood).toBeGreaterThan(0)
    expect(risk('investor')).toEqual({ flood: 0, fire: 0, street: 0 })
  })

  it('two profiles differ in what they ask for', () => {
    const a = profileToPatch(PRESETS[0])
    const b = profileToPatch(PRESETS[2])
    expect(a.weights).not.toEqual(b.weights)
  })
})

describe('applyOverride', () => {
  const base: Profile = { id: 'x', name: 'X', blurb: 'A blurb long enough', order: ['noise'], conditions: { noiseMaxDb: 58 } }

  it('merges known fields of a JSON override', () => {
    const p = applyOverride(base, '{"conditions":{"noiseMaxDb":50},"order":["noise","risk"]}')
    expect(p.conditions).toEqual({ noiseMaxDb: 50 })
    expect(p.order).toEqual(['noise', 'risk'])
    expect(p.name).toBe('X')
  })

  it('ignores missing, broken or non-object overrides', () => {
    expect(applyOverride(base, undefined)).toEqual(base)
    expect(applyOverride(base, '{oops')).toEqual(base)
    expect(applyOverride(base, '[1,2]')).toEqual(base)
  })

  it('drops unknown rows and keeps the id fixed', () => {
    const p = applyOverride(base, '{"id":"hack","order":["noise","nope"]}')
    expect(p.id).toBe('x')
    expect(p.order).toEqual(['noise'])
  })
})

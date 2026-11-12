import { describe, it, expect } from 'vitest'
import {
  CENTRE_OPTIONS, LOCALS_OPTIONS, NOISE_OPTIONS, PRICE_OPTIONS, WALK_OPTIONS,
  activeConditions, formatEuroM2, optionFor, parseNumberList, profileToPatch,
  riskLevel, shareUnder, sortedPrices, strengthsFor,
} from './conditionOptions'
import { CONDITION_RANGES, DEFAULT_CONDITIONS } from './buildings/conditions'
import { DEFAULT_COMPOSITE_WEIGHTS } from '../store'
import type { BuildingData } from './buildings/buildingData'

describe('parseNumberList', () => {
  it('reads a comma list', () => expect(parseNumberList('50, 58,65', [1])).toEqual([50, 58, 65]))
  it('falls back on missing, empty or broken input', () => {
    expect(parseNumberList(undefined, [1, 2])).toEqual([1, 2])
    expect(parseNumberList('', [1, 2])).toEqual([1, 2])
    expect(parseNumberList('5,x', [1, 2])).toEqual([1, 2])
  })
})

describe('option sets', () => {
  const sets = {
    noiseMaxDb: NOISE_OPTIONS, walkMaxMin: WALK_OPTIONS, cityCoreMaxMin: CENTRE_OPTIONS,
    priceMaxEurM2: PRICE_OPTIONS, localsMin: LOCALS_OPTIONS,
  } as const

  it.each(Object.entries(sets))('%s: values are unique, ascending and inside the slider range', (key, options) => {
    const values = options.map((o) => o.value)
    expect(new Set(values).size).toBe(values.length)
    expect([...values].sort((a, b) => a - b)).toEqual(values)
    const range = CONDITION_RANGES[key as keyof typeof CONDITION_RANGES]
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(range.min)
      expect(v).toBeLessThanOrEqual(range.max)
    }
  })

  it('names the noise steps in words', () => {
    expect(NOISE_OPTIONS.map((o) => o.label)).toEqual(['a courtyard', 'a calm street', 'normal city noise'])
    expect(NOISE_OPTIONS[1].hint).toBe('58 dB')
  })

  it('optionFor finds a step and returns null for a custom value', () => {
    expect(optionFor(NOISE_OPTIONS, 58)?.label).toBe('a calm street')
    expect(optionFor(NOISE_OPTIONS, 62)).toBeNull()
  })
})

describe('formatEuroM2', () => {
  it('groups thousands with a comma', () => expect(formatEuroM2(3500)).toBe('€3,500/m²'))
  it('handles millions of digits sanely', () => expect(formatEuroM2(12000)).toBe('€12,000/m²'))
})

describe('risk levels', () => {
  it('maps a level to strengths and back', () => {
    for (const level of ['avoid', 'strong', 'off'] as const) {
      expect(riskLevel(strengthsFor(level))).toBe(level)
    }
  })
  it('strong is stronger than avoid; off is zero', () => {
    expect(strengthsFor('strong').flood).toBeGreaterThan(strengthsFor('avoid').flood)
    expect(strengthsFor('off')).toEqual({ flood: 0, fire: 0, street: 0 })
  })
  it('anything else is custom', () => expect(riskLevel({ flood: 5, fire: 8, street: 0 })).toBe('custom'))
})

describe('activeConditions', () => {
  const off = strengthsFor('off')
  it('follows the stored order and appends the rest in the default order', () => {
    const weights = { ...DEFAULT_COMPOSITE_WEIGHTS, noise: 1, poiAccess: 1, cityCore: 1, openPrice: 1 }
    expect(activeConditions(weights, off, ['openPrice', 'noise'])).toEqual(['openPrice', 'noise', 'poiAccess', 'cityCore'])
  })
  it('drops conditions that are off and duplicates', () => {
    const weights = { ...DEFAULT_COMPOSITE_WEIGHTS, noise: 1, poiAccess: 0, cityCore: 0, openPrice: 0 }
    expect(activeConditions(weights, off, ['poiAccess', 'noise', 'noise'])).toEqual(['noise'])
  })
  it('lists risk when any strength is above zero', () => {
    const weights = { ...DEFAULT_COMPOSITE_WEIGHTS, noise: 0, poiAccess: 0, cityCore: 0, openPrice: 0 }
    expect(activeConditions(weights, strengthsFor('avoid'), [])).toEqual(['risk'])
  })
})

describe('profileToPatch', () => {
  it('turns on exactly the conditions of the profile and keeps their order', () => {
    const patch = profileToPatch({ id: 'x', name: 'X', blurb: '', order: ['openPrice', 'noise'] })
    expect(patch.order).toEqual(['openPrice', 'noise'])
    expect(patch.weights).toMatchObject({ openPrice: 1, noise: 1, poiAccess: 0, cityCore: 0, age: 0 })
    expect(patch.riskStrengths).toEqual(strengthsFor('off'))
  })
  it('merges limits over the defaults', () => {
    const patch = profileToPatch({ id: 'x', name: 'X', blurb: '', order: ['noise'], conditions: { noiseMaxDb: 58 } })
    expect(patch.conditions).toEqual({ ...DEFAULT_CONDITIONS, noiseMaxDb: 58 })
  })
  it('turns risks on when the profile lists them', () => {
    const patch = profileToPatch({ id: 'x', name: 'X', blurb: '', order: ['noise', 'risk'], risk: 'strong' })
    expect(patch.riskStrengths).toEqual(strengthsFor('strong'))
  })
  it('uses all services, places and eras unless the profile narrows them', () => {
    const wide = profileToPatch({ id: 'x', name: 'X', blurb: '', order: ['poiAccess'] })
    const narrow = profileToPatch({ id: 'x', name: 'X', blurb: '', order: ['poiAccess'], walkCategories: ['park'] })
    expect(wide.walkCategories!.length).toBeGreaterThan(1)
    expect(narrow.walkCategories).toEqual(['park'])
    expect(wide.landmarkIds!.length).toBe(13)
    expect(wide.eras!.length).toBe(5)
  })
})

describe('budget shares', () => {
  const data = {
    count: 6,
    meta: { areas: [{ price: 2000 }, { price: 3000 }, { price: 5000 }, { price: null }] },
    cols: { area: Float32Array.from([0, 0, 1, 2, 3, NaN]) },
  } as unknown as BuildingData

  it('sorts the prices of the buildings that have one', () => {
    expect(Array.from(sortedPrices(data))).toEqual([2000, 2000, 3000, 5000])
  })
  it('share under a limit is the fraction at or below it, in percent', () => {
    const prices = sortedPrices(data)
    expect(shareUnder(prices, 1000)).toBe(0)
    expect(shareUnder(prices, 2000)).toBe(50)
    expect(shareUnder(prices, 3000)).toBe(75)
    expect(shareUnder(prices, 9000)).toBe(100)
  })
  it('is monotonic and 0 for no data', () => {
    expect(shareUnder(new Float32Array(), 3000)).toBe(0)
    const prices = sortedPrices(data)
    const shares = [1500, 2500, 3500, 4500, 6000].map((v) => shareUnder(prices, v))
    expect([...shares].sort((a, b) => a - b)).toEqual(shares)
  })
})

import { describe, it, expect } from 'vitest'
import { AGE_ERAS, ALL_AGE_ERA_IDS, ageScore, eraOf } from './buildingAge'

describe('building age eras (TODO-047)', () => {
  it('five eras from the default bounds, with names and years', () => {
    expect(ALL_AGE_ERA_IDS).toEqual(['before-1900', '1900-1939', '1940-1979', '1980-2006', '2007-on'])
    expect(AGE_ERAS.map((e) => `${e.name} · ${e.years}`)).toEqual([
      'Historic · before 1900',
      'Modernista & early 20th c. · 1900–1939',
      'Post-war boom · 1940–1979',
      'First building standards · 1980–2006',
      'Current building code · 2007 on',
    ])
    expect(AGE_ERAS.every((e) => e.about.length > 0)).toBe(true)
  })

  it('eraOf: an era starts at its first year', () => {
    expect(eraOf(1899).id).toBe('before-1900')
    expect(eraOf(1900).id).toBe('1900-1939')
    expect(eraOf(1979).id).toBe('1940-1979')
    expect(eraOf(1980).id).toBe('1980-2006')
    expect(eraOf(2025).id).toBe('2007-on')
    expect(eraOf(1000).id).toBe('before-1900')
  })
})

describe('ageScore (TODO-047)', () => {
  const ALL = ALL_AGE_ERA_IDS

  it('100 inside a liked era, 0 far from every liked era', () => {
    expect(ageScore(1965, ALL)).toBe(100)
    expect(ageScore(1965, ['1980-2006'])).toBe(0)
    expect(ageScore(1925, ['1900-1939', '2007-on'])).toBe(100)
  })

  it('fades over the blur years at the edge of a liked era', () => {
    const liked = ['1980-2006']
    expect(ageScore(1979, liked)).toBe(80)
    expect(ageScore(1978, liked)).toBe(60)
    expect(ageScore(1975, liked)).toBe(0)
    expect(ageScore(2007, liked)).toBe(80)
    expect(ageScore(1978, liked, 0)).toBe(0)
  })

  it("Catastro's 1900 (exact year unknown) counts for both neighbouring eras", () => {
    expect(ageScore(1900, ['before-1900'])).toBe(100)
    expect(ageScore(1900, ['1900-1939'])).toBe(100)
    expect(ageScore(1901, ['before-1900'])).toBe(60)
  })

  it('no year → no data', () => {
    expect(ageScore(null, ALL)).toBeNull()
  })
})

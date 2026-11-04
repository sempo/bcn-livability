import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CONDITIONS, atLeast, atMost, localsCondition, minutesShare, noiseAnchor, noiseCondition, priceCondition,
} from './conditions'

const C = DEFAULT_CONDITIONS

describe('conditions in real units (049)', () => {
  it('defaults from env', () => {
    expect(C).toEqual({ noiseMaxDb: 65, priceMaxEurM2: 4000, cityCoreMaxMin: 30, walkMaxMin: 10, localsMin: 7.5 })
  })

  it('atMost / atLeast: 100 within the limit, linear to 0 at the far end', () => {
    expect(atMost(65, 65, 75)).toBe(100)
    expect(atMost(70, 65, 75)).toBe(50)
    expect(atMost(80, 65, 75)).toBe(0)
    expect(atLeast(7.5, 7.5, 6.5)).toBe(100)
    expect(atLeast(7, 7.5, 6.5)).toBe(50)
    expect(atLeast(6, 7.5, 6.5)).toBe(0)
  })

  it('noise: 0 at 10 dB over the limit; price: 0 at 25 % over the budget; unknown → null', () => {
    expect(noiseCondition(62, C)).toBe(100)
    expect(noiseCondition(70, C)).toBe(50)
    expect(noiseCondition(75, C)).toBe(0)
    expect(noiseCondition(null, C)).toBeNull()
    expect(priceCondition(3900, C)).toBe(100)
    expect(priceCondition(4500, C)).toBe(50)
    expect(priceCondition(5000, C)).toBe(0)
    expect(priceCondition(null, C)).toBeNull()
  })

  it("locals: 0 one point under the user's minimum", () => {
    expect(localsCondition(7.8, C)).toBe(100)
    expect(localsCondition(7.0, C)).toBe(50)
    expect(localsCondition(6.4, C)).toBe(0)
  })

  it('minutes: the share of places within the limit, 0 at twice the limit, out of reach counts 0', () => {
    expect(minutesShare([3, 8, 10], 10)).toBe(100)
    expect(minutesShare([5, 15], 10)).toBe(75)
    expect(minutesShare([5, null], 10)).toBe(50)
    expect(minutesShare([25], 10)).toBe(0)
    expect(minutesShare([], 10)).toBe(0)
  })

  it('noise anchors in plain words', () => {
    expect(noiseAnchor(45)).toBe('a quiet courtyard')
    expect(noiseAnchor(55)).toBe('a calm street')
    expect(noiseAnchor(65)).toBe('a busy street')
    expect(noiseAnchor(72)).toBe('a main road')
  })
})

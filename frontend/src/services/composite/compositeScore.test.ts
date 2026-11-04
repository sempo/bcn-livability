import { describe, it, expect } from 'vitest'
import { computeComposite, type ComponentScores, type CompositeWeights } from './compositeScore'

const NONE: ComponentScores = { poiAccess: null, noise: null, cityCore: null, openPrice: null, localsOpinion: null, age: null }
const components = (c: Partial<ComponentScores>): ComponentScores => ({ ...NONE, ...c })

const WALK_NOISE: CompositeWeights = { poiAccess: 1, noise: 1, cityCore: 0, openPrice: 0 }

describe('computeComposite (049: mean over the conditions that are on)', () => {
  it('averages the conditions that are on and ignores the others', () => {
    const r = computeComposite({ components: components({ poiAccess: 100, noise: 50, openPrice: 0 }) }, WALK_NOISE)
    expect(r.score).toBe(75)
    expect(r.hasGap).toBe(false)
  })

  it('a condition that is on without data counts 0 and marks the gap', () => {
    const r = computeComposite({ components: components({ poiAccess: 100, noise: null }) }, WALK_NOISE)
    expect(r.score).toBe(50)
    expect(r.hasGap).toBe(true)
  })

  it('no condition on → 0', () => {
    const r = computeComposite({ components: components({ poiAccess: 100 }) }, { poiAccess: 0, noise: 0, cityCore: 0, openPrice: 0 })
    expect(r.score).toBe(0)
  })

  it("locals' opinion from a small sample counts but is marked like missing data (042)", () => {
    const weights = { ...WALK_NOISE, noise: 0, localsOpinion: 1 }
    const r = computeComposite({ components: components({ poiAccess: 80, localsOpinion: 100 }), localsLowN: true }, weights)
    expect(r.score).toBe(90)
    expect(r.hasGap).toBe(true)
    const off = computeComposite({ components: components({ poiAccess: 80 }), localsLowN: true }, { ...weights, localsOpinion: 0 })
    expect(off.hasGap).toBe(false)
  })

  it('building age counts like any other condition (047)', () => {
    const r = computeComposite({ components: components({ poiAccess: 80, age: 0 }) }, { ...WALK_NOISE, noise: 0, age: 1 })
    expect(r.score).toBe(40)
  })
})

describe('computeComposite — climate risk penalties (036)', () => {
  const WALK_ONLY: CompositeWeights = { poiAccess: 1, noise: 0, cityCore: 0, openPrice: 0 }
  const NO_RISK = { flood: 0, fire: 0, street: 0 }
  const walk80 = components({ poiAccess: 80 })

  it('does not penalise when no strengths are passed', () => {
    const r = computeComposite({ components: walk80, risks: { ...NO_RISK, flood: 1 } }, WALK_ONLY)
    expect(r.score).toBe(80)
    expect(r.penalties).toEqual({ flood: 0, fire: 0, street: 0 })
  })

  it('keeps safe buildings unchanged; missing risks are no risk', () => {
    expect(computeComposite({ components: walk80, risks: NO_RISK }, WALK_ONLY, { flood: 10, fire: 10, street: 0 }).score).toBe(80)
    expect(computeComposite({ components: walk80 }, WALK_ONLY, { flood: 10, fire: 10, street: 0 }).score).toBe(80)
  })

  it('penalises a flooded building and reports the points lost', () => {
    const r = computeComposite({ components: walk80, risks: { ...NO_RISK, flood: 1 } }, WALK_ONLY, { flood: 5, fire: 5, street: 0 })
    expect(r.baseScore).toBe(80)
    expect(r.score).toBe(40)
    expect(r.penalties).toEqual({ flood: 40, fire: 0, street: 0 })
  })

  it('penalises by fire risk and by street flooding (037)', () => {
    expect(computeComposite({ components: walk80, risks: { ...NO_RISK, fire: 0.5 } }, WALK_ONLY, { flood: 5, fire: 10, street: 0 })
      .penalties.fire).toBe(40)
    expect(computeComposite({ components: walk80, risks: { ...NO_RISK, street: 1 } }, WALK_ONLY, { flood: 5, fire: 5, street: 5 })
      .penalties).toEqual({ flood: 0, fire: 0, street: 40 })
  })
})

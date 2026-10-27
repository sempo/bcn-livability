import { describe, it, expect } from 'vitest'
import { fitScoreRange } from './scoreRamp'

describe('fitScoreRange', () => {
  it('spans the lowest to the highest score', () => {
    expect(fitScoreRange([60, 45.5, 70, 80.2], 0, 0)).toEqual([45, 81])
  })

  it('ignores the extreme trimPct% on each side — one outlier does not stretch the scale', () => {
    const scores = [...Array.from({ length: 98 }, (_, i) => 50 + (i * 30) / 97), 5, 99]
    expect(fitScoreRange(scores, 2, 0)).toEqual([50, 80])
    expect(fitScoreRange(scores, 0, 0)).toEqual([5, 99])
  })

  it('widens a narrow range around its middle to minSpan', () => {
    expect(fitScoreRange([70, 71, 72, 73, 74], 0, 20)).toEqual([62, 82])
    expect(fitScoreRange([55], 0, 20)).toEqual([45, 65])
  })

  it('keeps the widened range inside 0–100', () => {
    expect(fitScoreRange([95, 96, 97, 98], 0, 20)).toEqual([80, 100])
    expect(fitScoreRange([1, 2, 3], 0, 20)).toEqual([0, 20])
  })

  it('returns null when no hex is in view', () => {
    expect(fitScoreRange([], 2, 20)).toBeNull()
  })
})

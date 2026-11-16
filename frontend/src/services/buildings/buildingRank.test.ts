import { describe, it, expect } from 'vitest'
import { SCORE_BINS, earnsAward, homeWeight, rankIn, scoreHistograms, buildingRanks } from './buildingRank'
import type { BuildingArea } from './buildingData'

const AREAS: BuildingArea[] = [
  { code: '01', name: 'el Raval', kind: 'barri', price: null },
  { code: '02', name: 'el Gòtic', kind: 'barri', price: null },
  { code: '08015', name: 'Badalona', kind: 'muni', price: null },
]

/** `n` buildings of `area`, all with `score`. */
const many = (area: number, score: number, n: number) => Array.from({ length: n }, () => ({ area, score }))
function cols(rows: { area: number; score: number }[]) {
  return { scores: Uint8Array.from(rows.map((r) => r.score)), areaCol: Float32Array.from(rows.map((r) => r.area)) }
}

describe('scoreHistograms', () => {
  it('counts per area, for Barcelona (barris only) and for everything', () => {
    const { scores, areaCol } = cols([...many(0, 10, 2), ...many(1, 90, 3), ...many(2, 50, 4)])
    const h = scoreHistograms(scores, areaCol, AREAS)
    expect(h.areas[0]).toHaveLength(SCORE_BINS)
    expect(h.areas[0][10]).toBe(2)
    expect(h.areas[1][90]).toBe(3)
    expect(h.areas[2][50]).toBe(4)
    expect(h.barcelona[50]).toBe(0) // Badalona is not Barcelona
    expect(h.barcelona[10] + h.barcelona[90]).toBe(5)
    expect(h.all.reduce((a, b) => a + b, 0)).toBe(9)
  })
  it('skips buildings without an area in the area counts but keeps them in the total', () => {
    const h = scoreHistograms(Uint8Array.from([40, 40]), Float32Array.from([NaN, 0]), AREAS)
    expect(h.areas[0][40]).toBe(1)
    expect(h.barcelona[40]).toBe(1)
    expect(h.all[40]).toBe(2)
  })
})

describe('rankIn', () => {
  const hist = (rows: Record<number, number>) => {
    const h = new Uint32Array(SCORE_BINS)
    for (const [s, n] of Object.entries(rows)) h[Number(s)] = n
    return h
  }

  it('is the share of buildings with a lower score, rounded down', () => {
    const r = rankIn(hist({ 20: 10, 60: 10, 80: 10, 95: 10 }), 80)!
    expect(r.pct).toBe(50)
    expect(r.n).toBe(40)
    expect(r.tied).toBe(false)
  })
  it('rounds down so the line never overstates', () => {
    expect(rankIn(hist({ 10: 2, 20: 1 }), 20)!.pct).toBe(66)
  })
  it('a low building has a low percentage', () => {
    const r = rankIn(hist({ 20: 1, 50: 1, 90: 98 }), 50)!
    expect(r.pct).toBe(1)
  })
  it('a building in the top group of many equal ones says how many fit as well, not "better than"', () => {
    // 36% score below 100, 64% score exactly 100
    const r = rankIn(hist({ 40: 36, 100: 64 }), 100)!
    expect(r.tied).toBe(true)
    expect(r.samePct).toBe(64)
  })
  it('the top group is the maximum score of the scope, not 100', () => {
    const r = rankIn(hist({ 40: 50, 88: 50 }), 88)!
    expect(r.tied).toBe(true)
    expect(r.samePct).toBe(50)
  })
  it('a lone best building is "better than 99%", not a tie', () => {
    const r = rankIn(hist({ 40: 99, 100: 1 }), 100)!
    expect(r.tied).toBe(false)
    expect(r.pct).toBe(99)
  })
  it('a score lower than the maximum is never a tie', () => {
    expect(rankIn(hist({ 70: 5, 100: 5 }), 70)!.tied).toBe(false)
  })
  it('is null for an empty scope', () => {
    expect(rankIn(new Uint32Array(SCORE_BINS), 50)).toBeNull()
  })
})

describe('earnsAward', () => {
  const r = (pct: number, tied = false) => ({ pct, n: 100, tied, samePct: 0 })
  it('is true from the threshold up, and for the top group at any percentage', () => {
    expect(earnsAward(r(70), 70)).toBe(true)
    expect(earnsAward(r(69), 70)).toBe(false)
    expect(earnsAward(r(10, true), 70)).toBe(true)
    expect(earnsAward(r(0), 70)).toBe(false)
  })
})

describe('buildingRanks', () => {
  // el Raval: 60 low (30) and 40 high (80); el Gòtic: 100 high (80); Badalona: 70 at 10 and 30 at 90.
  const { scores, areaCol } = cols([...many(0, 30, 60), ...many(0, 80, 40), ...many(1, 80, 100), ...many(2, 10, 70), ...many(2, 90, 30)])
  const h = scoreHistograms(scores, areaCol, AREAS)

  it('a Barcelona building: barri and the city of Barcelona, each judged alone', () => {
    const r = buildingRanks(h, AREAS, 0, 80, 50, 25)!
    expect(r.local!.name).toBe('el Raval')
    expect(r.local!.kind).toBe('barri')
    expect(r.local!.rank.pct).toBe(60)
    expect(r.wide!.scope).toBe('barcelona')
    expect(r.wide!.rank.n).toBe(200)
    expect(r.wide!.rank.pct).toBe(30)
  })
  it('stands out in the barri but not in the city: only the barri line', () => {
    // score 60 beats 80 of the 110 in el Raval (72%) but 80 of 210 in Barcelona (38%)
    const c = cols([...many(0, 20, 80), ...many(0, 60, 20), ...many(0, 100, 10), ...many(1, 100, 100)])
    const r = buildingRanks(scoreHistograms(c.scores, c.areaCol, AREAS), AREAS, 0, 60, 50, 50)!
    expect(r.local!.rank.pct).toBe(72)
    expect(r.wide).toBeNull()
  })
  it('stands out in the city but not in its barri: only the city line', () => {
    // score 60 beats 30 of the 100 in el Raval (30%) but 130 of 200 in Barcelona (65%)
    const c = cols([...many(0, 20, 30), ...many(0, 60, 30), ...many(0, 100, 40), ...many(1, 10, 100)])
    const r = buildingRanks(scoreHistograms(c.scores, c.areaCol, AREAS), AREAS, 0, 60, 50, 60)!
    expect(r.local).toBeNull()
    expect(r.wide!.rank.pct).toBe(65)
  })
  it('is null when it stands out nowhere', () => {
    expect(buildingRanks(h, AREAS, 0, 30, 50, 70)).toBeNull()
  })
  it('a building outside Barcelona: the municipality and the whole area', () => {
    const r = buildingRanks(h, AREAS, 2, 90, 50, 25)!
    expect(r.local!.name).toBe('Badalona')
    expect(r.local!.kind).toBe('muni')
    expect(r.wide!.scope).toBe('metro')
    expect(r.wide!.rank.n).toBe(300)
  })
  it('hides the barri line below the minimum number of buildings', () => {
    const r = buildingRanks(h, AREAS, 0, 80, 101, 25)!
    expect(r.local).toBeNull()
    expect(r.wide!.rank.n).toBe(200)
  })
  it('is null without an area or a scope', () => {
    expect(buildingRanks(h, AREAS, null, 80)).toBeNull()
    expect(buildingRanks(h, AREAS, 9, 80)).toBeNull()
  })
})

describe('homes, not buildings (TODO-073)', () => {
  it('a building counts as many homes as it has dwellings, at least one', () => {
    expect(homeWeight(undefined, 0)).toBe(1)
    expect(homeWeight(Float32Array.from([12, 0, NaN]), 0)).toBe(12)
    expect(homeWeight(Float32Array.from([12, 0, NaN]), 1)).toBe(1)
    expect(homeWeight(Float32Array.from([12, 0, NaN]), 2)).toBe(1)
  })

  it('one block of 90 flats outweighs nine houses: the rank is a share of homes', () => {
    // el Raval: nine houses at 30, one block of 90 flats at 60. A house at 80 beats 99 of 100 homes either way;
    // a home in the block beats 9% of the homes, not 90% of the buildings.
    const { scores, areaCol } = cols([...many(0, 30, 9), ...many(0, 60, 1), ...many(0, 80, 1)])
    const homes = Float32Array.from([...Array(9).fill(1), 90, 1])
    const h = scoreHistograms(scores, areaCol, AREAS, homes)
    expect(h.areas[0][60]).toBe(90)
    expect(h.buildings.areas[0][60]).toBe(1)
    expect(rankIn(h.areas[0], 60, h.buildings.areas[0])!.pct).toBe(9)
    expect(rankIn(h.areas[0], 60, h.buildings.areas[0])!.n).toBe(100)
  })

  it('one large block at the top is not a tie: a top group needs more than one building', () => {
    const { scores, areaCol } = cols([...many(0, 30, 60), ...many(0, 100, 1)])
    const homes = Float32Array.from([...Array(60).fill(1), 40])
    const h = scoreHistograms(scores, areaCol, AREAS, homes)
    const r = rankIn(h.areas[0], 100, h.buildings.areas[0])!
    expect(r.tied).toBe(false)
    expect(r.pct).toBe(60)
  })

  it('the minimum size of a barri still counts buildings', () => {
    // 10 buildings with 100 homes each: 1,000 homes but only 10 buildings, under a minimum of 50.
    const { scores, areaCol } = cols([...many(0, 20, 9), ...many(0, 90, 1)])
    const h = scoreHistograms(scores, areaCol, AREAS, Float32Array.from(Array(10).fill(100)))
    expect(buildingRanks(h, AREAS, 0, 90, 50, 50)?.local ?? null).toBeNull()
    expect(buildingRanks(h, AREAS, 0, 90, 10, 50)!.local!.rank.pct).toBe(90)
  })
})

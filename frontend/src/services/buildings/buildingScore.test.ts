import { describe, it, expect } from 'vitest'
import { latLngToCell } from 'h3-js'
import { computeComposite } from '../composite/compositeScore'
import { floodRisk } from '../climateRisk/climateRisk'
import type { BarriVibeData } from '../localsOpinion/localsOpinion'
import type { BuildingArea, BuildingData } from './buildingData'
import {
  buildingBundle, buildingRisks, cellMeans, centroidCells, doorWaterSeverity, riverZoneShares, scoreAll, scoreBuilding, walkFromCategories,
  type BuildingSettings,
} from './buildingScore'

const AREAS: BuildingArea[] = [
  { code: '01', name: 'el Raval', kind: 'barri', price: 4000 },
  { code: '08101', name: "L'Hospitalet de Llobregat", kind: 'muni', price: 2500 },
]

/** Building rows as columns (null = no data), like the decoded score blob. */
function makeData(rows: Record<string, (number | null)[]>): BuildingData {
  const count = Object.values(rows)[0].length
  const cols = Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, Float32Array.from(v.map((x) => x ?? NaN))]))
  return {
    meta: {
      count, columns: [], areas: AREAS, price_bounds: { p5: 2000, p95: 6000 },
      categories: ['supermarket', 'school', 'park'], landmarks: ['sagrada', 'placa_cat'],
    },
    count,
    cols,
  }
}

const DATA = makeData({
  walk_supermarket: [90, 40], walk_school: [20, 40], walk_park: [70, null],
  cc_sagrada: [10, 80], cc_placa_cat: [25, null],
  lden_avg: [62.4, null], area: [0, 1],
  river_zone: [null, 100], fire_wui: [0, 1], fire_hazard: [0, 0.4],
  street_t10_cm: [30, null], street_t100_cm: [60, null],
})

const VIBE = { barris: { '01': { satisfAdj: 7.2, lowN: false } } } as unknown as BarriVibeData

const SETTINGS: BuildingSettings = {
  weights: { poiAccess: 6, noise: 7, cityCore: 8, openPrice: 10, localsOpinion: 3 },
  enabledLandmarkIds: ['sagrada', 'placa_cat'],
  enabledCategories: ['supermarket', 'school', 'park'],
  riskStrengths: { flood: 5, fire: 5, street: 5 },
  vibe: VIBE,
}

describe('walkFromCategories', () => {
  it('averages only the categories the user keeps', () => {
    const subs = { supermarket: 90, school: 20, park: null }
    expect(walkFromCategories(subs, ['supermarket', 'school'])).toBe(55)
    expect(walkFromCategories(subs, ['park'])).toBe(0)
    expect(walkFromCategories(subs, [])).toBe(0)
  })
})

describe('building risks', () => {
  it('river zone → the band penalties of feature 036', () => {
    expect(floodRisk(riverZoneShares(10))).toBe(1)
    expect(floodRisk(riverZoneShares(100))).toBeCloseTo(0.6)
    expect(floodRisk(riverZoneShares(500))).toBeCloseTo(0.25)
    expect(floodRisk(riverZoneShares(null))).toBe(0)
  })

  it('water at the door: 0 up to 10 cm, full from 50 cm', () => {
    expect([5, 30, 60, null].map((cm) => doorWaterSeverity(cm))).toEqual([0, 0.5, 1, 0])
  })

  it('street flooding combines the 10- and 100-year rain like the river bands', () => {
    // T10 30 cm → 0.5; T100 60 cm → 1 → 0.5 × 1 + (1 − 0.5) × 0.6
    expect(buildingRisks(DATA, 0).street).toBeCloseTo(0.8)
    expect(buildingRisks(DATA, 1)).toEqual({ flood: expect.closeTo(0.6), fire: expect.closeTo(0.4), street: 0 })
  })
})

describe('scoreBuilding', () => {
  it('is computeComposite on the equivalent bundle', () => {
    const bundle = {
      walk: 60, lden: DATA.cols.lden_avg[0], cityCoreProps: { sagrada: 10, placa_cat: 25 }, saleEurM2: 4000,
      risks: buildingRisks(DATA, 0), locals: { satisfAdj: 7.2, lowN: false },
    }
    const expected = computeComposite(bundle, SETTINGS.weights, SETTINGS.enabledLandmarkIds,
      { p5: 2000, p95: 6000 }, SETTINGS.riskStrengths)
    expect(scoreBuilding(DATA, 0, SETTINGS)).toEqual(expected)
  })

  it("takes price from the barri / municipality and Locals' opinion from Barcelona barris only", () => {
    expect(buildingBundle(DATA, 0, SETTINGS.enabledCategories, VIBE)).toMatchObject({ saleEurM2: 4000, locals: { satisfAdj: 7.2 } })
    expect(buildingBundle(DATA, 1, SETTINGS.enabledCategories, VIBE)).toMatchObject({ saleEurM2: 2500, locals: null })
  })

  it('a user who drops schools gets a different walkability', () => {
    const all = buildingBundle(DATA, 0, ['supermarket', 'school', 'park'], null).walk
    const noSchool = buildingBundle(DATA, 0, ['supermarket', 'park'], null).walk
    expect([all, noSchool]).toEqual([60, 80])
  })
})

describe('scoreAll', () => {
  it('scores every building and flags missing data', () => {
    const { score, gap } = scoreAll(DATA, SETTINGS)
    expect(score[0]).toBe(scoreBuilding(DATA, 0, SETTINGS).score)
    expect([...gap]).toEqual([0, 1]) // building 1 has no noise data and no Locals' opinion (outside Barcelona)
  })
})

describe('Best zones grid (TODO-046)', () => {
  it('puts each centroid in its H3 cell and averages the scores per cell', () => {
    const data = makeData({ lat: [41.39, 41.39001, 41.42], lng: [2.17, 2.17001, 2.2] })
    const cells = centroidCells(data, 9)
    expect(cells[0]).toBe(latLngToCell(41.39, 2.17, 9))
    expect(cells[1]).toBe(cells[0])
    expect(cells[2]).not.toBe(cells[0])
    expect(cellMeans([60, 81, 10], cells)).toEqual(new Map([[cells[0], 70.5], [cells[2], 10]]))
  })
})

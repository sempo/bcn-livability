import { describe, it, expect, vi } from 'vitest'
import { loadBuildingDetail, readDetail } from './buildingDetail'

const { getZxy } = vi.hoisted(() => ({ getZxy: vi.fn() }))
vi.mock('pmtiles', () => ({ PMTiles: vi.fn(function () { return { getZxy } }) }))

/** A decoded tile layer: features with properties and a point geometry. */
function layer(rows: { props: Record<string, unknown>; at?: [number, number] }[]) {
  return {
    length: rows.length,
    feature: (k: number) => ({
      properties: rows[k].props,
      toGeoJSON: () => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: rows[k].at ?? [0, 0] } }),
    }),
  }
}

describe('readDetail (TODO-046)', () => {
  const layers = {
    d: layer([{ props: { i: 3, id: 'A' } }, { props: { i: 7, id: 'B', floors: 5 } }]),
    f: layer([
      { props: { i: 7, side: 'street', dir: 'S', length_m: 20, lden: 70 }, at: [2.1, 41.3] },
      { props: { i: 3, side: 'inner', dir: 'N', length_m: 9, lden: 50 } },
      { props: { i: 7, side: 'inner', dir: 'N', length_m: 20, lden: 52, ln: 44 }, at: [2.2, 41.4] },
    ]),
  }

  it("picks the building's card fields and its facade points", () => {
    const { detail, facades } = readDetail(layers, 0, 0, 7)
    expect(detail).toEqual({ i: 7, id: 'B', floors: 5 })
    expect(facades).toEqual([
      { i: 7, side: 'street', dir: 'S', length_m: 20, lden: 70, lng: 2.1, lat: 41.3 },
      { i: 7, side: 'inner', dir: 'N', length_m: 20, lden: 52, ln: 44, lng: 2.2, lat: 41.4 },
    ])
  })

  it('returns nothing for a building outside the tile or a tile without layers', () => {
    expect(readDetail(layers, 0, 0, 99)).toEqual({ detail: null, facades: [] })
    expect(readDetail({}, 0, 0, 7)).toEqual({ detail: null, facades: [] })
  })
})

describe('loadBuildingDetail', () => {
  it('reads the z14 tile under the centroid once per building; a failed read is retried', async () => {
    getZxy.mockRejectedValueOnce(new Error('network')).mockResolvedValue(undefined)
    await expect(loadBuildingDetail(7, 2.16, 41.39)).rejects.toThrow('network')
    await expect(loadBuildingDetail(7, 2.16, 41.39)).resolves.toEqual({ detail: null, facades: [] })
    await loadBuildingDetail(7, 2.16, 41.39)
    expect(getZxy).toHaveBeenCalledTimes(2)
    expect(getZxy.mock.calls[0][0]).toBe(14)
  })
})

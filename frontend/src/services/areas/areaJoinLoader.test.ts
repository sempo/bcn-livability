import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AreaFeature } from '../areas'

const feature: AreaFeature = {
  type: 'Feature', properties: { id: 'barri-A', name: 'A', kind: 'barri' },
  geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
}
const data = {
  count: 1,
  meta: { areas: [{ code: '01', name: 'A', kind: 'barri', price: 1 }] },
  cols: { area: Float32Array.from([0]), lng: Float32Array.from([0.5]), lat: Float32Array.from([0.5]) },
}
const loadBuildings = vi.fn()
const loadAreas = vi.fn()
vi.mock('../buildings/buildingData', () => ({ loadBuildings: () => loadBuildings() }))
vi.mock('../areas', () => ({ loadAreas: () => loadAreas() }))

import { loadAreaJoin, resetAreaJoinCache } from './areaJoinLoader'

describe('loadAreaJoin', () => {
  beforeEach(() => {
    resetAreaJoinCache()
    loadBuildings.mockReset().mockResolvedValue(data)
    loadAreas.mockReset().mockResolvedValue([feature])
  })

  it('joins the areas of the score data to the polygons', async () => {
    const join = await loadAreaJoin()
    expect(join.get(0)?.properties.id).toBe('barri-A')
  })

  it('loads once', async () => {
    await loadAreaJoin()
    await loadAreaJoin()
    expect(loadBuildings).toHaveBeenCalledTimes(1)
  })

  it('tries again after a failure', async () => {
    loadBuildings.mockRejectedValueOnce(new Error('offline'))
    await expect(loadAreaJoin()).rejects.toThrow('offline')
    expect((await loadAreaJoin()).size).toBe(1)
  })

  it('rejects instead of throwing when loading fails at once', async () => {
    loadBuildings.mockImplementationOnce(() => { throw new TypeError('fetch is not defined') })
    await expect(loadAreaJoin()).rejects.toThrow('fetch is not defined')
  })
})

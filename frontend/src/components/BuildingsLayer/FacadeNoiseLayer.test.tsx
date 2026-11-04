import { describe, it, expect, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { MapContext } from '../Map/MapContext'
import { useStore } from '../../store'

vi.mock('../../services/buildings/buildingData', () => ({
  buildingData: { cols: { lng: Float32Array.from([2.16]), lat: Float32Array.from([41.39]) } },
}))
vi.mock('../../services/buildings/buildingDetail', () => ({
  loadBuildingDetail: vi.fn(() => Promise.resolve({
    detail: null,
    facades: [{ lng: 2.1601, lat: 41.3902, side: 'street', dir: 'SW', length_m: 21, lden: 72, ln: 63 }],
  })),
}))

import { FacadeNoiseLayer, FACADES_LAYER_ID, FACADES_SOURCE_ID } from './FacadeNoiseLayer'

function makeFakeMap() {
  const setData = vi.fn()
  const sources = new Map<string, unknown>()
  const layers = new Map<string, unknown>()
  return {
    setData,
    layers,
    getSource: (id: string) => sources.get(id),
    addSource: (id: string) => { sources.set(id, { setData }) },
    getLayer: (id: string) => layers.get(id),
    addLayer: (l: { id: string }) => { layers.set(l.id, l) },
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
  }
}

describe('FacadeNoiseLayer (TODO-046)', () => {
  it('draws the selected building’s facade points and clears them on deselect', async () => {
    const map = makeFakeMap()
    useStore.setState({ selectedBuilding: 0 })
    const { unmount } = render(<MapContext.Provider value={map as never}><FacadeNoiseLayer /></MapContext.Provider>)
    await act(async () => {})

    expect(map.layers.get(FACADES_LAYER_ID)).toMatchObject({ type: 'circle', source: FACADES_SOURCE_ID, minzoom: 15 })
    expect(map.setData).toHaveBeenLastCalledWith({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { lden: 72, ln: 63, side: 'street', dir: 'SW' },
        geometry: { type: 'Point', coordinates: [2.1601, 41.3902] },
      }],
    })

    await act(async () => { useStore.setState({ selectedBuilding: null }) })
    expect(map.setData).toHaveBeenLastCalledWith({ type: 'FeatureCollection', features: [] })

    unmount()
    expect(map.removeLayer).toHaveBeenCalledWith(FACADES_LAYER_ID)
    expect(map.removeSource).toHaveBeenCalledWith(FACADES_SOURCE_ID)
  })
})

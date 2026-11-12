import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { MapContext } from '../Map/MapContext'
import { useSearchStore } from '../../store/searchStore'
import { SearchLayer } from './SearchLayer'

const marker = { setLngLat: vi.fn().mockReturnThis(), addTo: vi.fn().mockReturnThis(), remove: vi.fn() }
vi.mock('maplibre-gl', () => ({ Marker: vi.fn(function () { return marker }) }))

function fakeMap() {
  const source = { setData: vi.fn() }
  return {
    source,
    addSource: vi.fn(),
    addLayer: vi.fn(),
    getLayer: vi.fn().mockReturnValue(undefined),
    getSource: vi.fn().mockReturnValue(source),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
    fitBounds: vi.fn(),
    flyTo: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    getContainer: () => document.createElement('div'),
    unproject: vi.fn(),
  }
}

function mount(map: ReturnType<typeof fakeMap>) {
  return render(
    <MapContext.Provider value={map as never}>
      <SearchLayer />
    </MapContext.Provider>,
  )
}

const outline = { type: 'FeatureCollection', features: [] } as never

describe('SearchLayer', () => {
  beforeEach(() => {
    useSearchStore.getState().clear()
    vi.clearAllMocks()
  })

  it('adds the outline source and layers once', () => {
    const map = fakeMap()
    mount(map)
    expect(map.addSource).toHaveBeenCalledWith('search-area', expect.objectContaining({ type: 'geojson' }))
    expect(map.addLayer).toHaveBeenCalledTimes(2)
  })

  it('fits the map to a selected area and draws its outline', () => {
    const map = fakeMap()
    mount(map)
    act(() => useSearchStore.getState().selectArea('El Born', [2.17, 41.38, 2.19, 41.39], outline))
    expect(map.fitBounds).toHaveBeenCalledWith([[2.17, 41.38], [2.19, 41.39]], expect.objectContaining({ padding: expect.anything() }))
    expect(map.source.setData).toHaveBeenLastCalledWith(outline)
  })

  it('flies to an address, drops a marker and clears the outline', () => {
    const map = fakeMap()
    mount(map)
    act(() => useSearchStore.getState().selectAddress('Carrer X 1', [2.16, 41.39]))
    expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [2.16, 41.39], zoom: 17 }))
    expect(marker.setLngLat).toHaveBeenCalledWith([2.16, 41.39])
    expect(marker.addTo).toHaveBeenCalledWith(map)
  })

  it('removes the marker and the outline when cleared', () => {
    const map = fakeMap()
    mount(map)
    act(() => useSearchStore.getState().selectAddress('Carrer X 1', [2.16, 41.39]))
    act(() => useSearchStore.getState().clear())
    expect(marker.remove).toHaveBeenCalled()
    expect(map.source.setData).toHaveBeenLastCalledWith({ type: 'FeatureCollection', features: [] })
  })

  it('clears the selection on Escape', () => {
    mount(fakeMap())
    act(() => useSearchStore.getState().selectAddress('A', [1, 1]))
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })) })
    expect(useSearchStore.getState().selection).toBeNull()
  })
})

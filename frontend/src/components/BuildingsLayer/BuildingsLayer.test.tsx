import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { MapContext } from '../Map/MapContext'
import { useStore, DEFAULT_COMPOSITE_WEIGHTS } from '../../store'
import type { BuildingData } from '../../services/buildings/buildingData'

/** Two buildings inside the view (lng 0.2 / 0.8): a quiet one in a Barcelona barri, a loud one in AMB. */
const DATA: BuildingData = {
  meta: {
    count: 2, columns: [], price_bounds: { p5: 2000, p95: 6000 },
    areas: [{ code: '01', name: 'el Raval', kind: 'barri', price: 4000 }, { code: '08101', name: 'Hospitalet', kind: 'muni', price: 2500 }],
    categories: ['supermarket', 'park'], landmarks: ['sagrada'],
  },
  count: 2,
  cols: {
    lng: Float32Array.from([0.2, 0.8]), lat: Float32Array.from([0.5, 0.5]),
    walk_supermarket: Float32Array.from([90, 30]), walk_park: Float32Array.from([80, 20]),
    cc_sagrada: Float32Array.from([10, 70]), lden_avg: Float32Array.from([50, 72]),
    area: Float32Array.from([0, 1]), river_zone: Float32Array.from([NaN, NaN]),
    fire_wui: Float32Array.from([0, 0]), fire_hazard: Float32Array.from([0, 0]),
    street_t10_cm: Float32Array.from([0, NaN]), street_t100_cm: Float32Array.from([0, NaN]),
  },
}

vi.mock('../../services/buildings/buildingData', async (orig) => ({
  ...(await orig<typeof import('../../services/buildings/buildingData')>()),
  loadBuildings: vi.fn(() => Promise.resolve(DATA)),
}))
vi.mock('../../services/localsOpinion/localsOpinion', async (orig) => ({
  ...(await orig<typeof import('../../services/localsOpinion/localsOpinion')>()),
  loadBarriVibe: vi.fn(() => Promise.resolve({ barris: { '01': { satisfAdj: 7.5, lowN: false } } })),
}))

import { BuildingsLayer, SOURCE_ID, DOT_LAYER_ID, FILL_LAYER_ID, GAP_LAYER_ID, HOVER_LAYER_ID } from './BuildingsLayer'

function makeFakeMap() {
  const sources = new Map<string, unknown>()
  const layers = new Map<string, Record<string, unknown>>()
  const states = new Map<number, Record<string, unknown>>()
  return {
    states,
    layers,
    getContainer: () => ({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) }),
    unproject: ([x, y]: [number, number]) => ({ lng: x / 100, lat: 1 - y / 100 }),
    getSource: (id: string) => sources.get(id),
    addSource: vi.fn((id: string, src: unknown) => { sources.set(id, src) }),
    getLayer: (id: string) => layers.get(id),
    addLayer: (l: { id: string }) => { layers.set(l.id, l) },
    setLayoutProperty: vi.fn(),
    setPaintProperty: vi.fn(),
    setFeatureState: vi.fn(({ id }: { id: number }, s: Record<string, unknown>) => {
      states.set(id, { ...states.get(id), ...s })
    }),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    queryRenderedFeatures: vi.fn((): unknown[] => []),
    getCanvas: () => ({ style: {} as Record<string, string> }),
  }
}

type FakeMap = ReturnType<typeof makeFakeMap>

const handler = (map: FakeMap, event: string, layer?: string) =>
  map.on.mock.calls.filter(([e, l]) => e === event && (layer === undefined || l === layer)).at(-1)!.at(-1) as
    (e?: unknown) => void

async function renderLayer(map: FakeMap) {
  render(<MapContext.Provider value={map as never}><BuildingsLayer /></MapContext.Provider>)
  await act(async () => {})
}

describe('BuildingsLayer (TODO-046)', () => {
  beforeEach(() => {
    useStore.setState({
      compositeVisible: true, compositeWeights: DEFAULT_COMPOSITE_WEIGHTS, selectedBuilding: null,
      enabledWalkCategories: ['supermarket', 'park'], enabledLandmarkIds: ['sagrada'],
      compositeRiskStrengths: { flood: 5, fire: 5, street: 5 }, compositeColorRange: [0, 100],
    })
  })

  it('adds the vector source with dots, footprints and outlines', async () => {
    const map = makeFakeMap()
    await renderLayer(map)
    expect(map.addSource).toHaveBeenCalledWith(SOURCE_ID, expect.objectContaining({ type: 'vector' }))
    expect([...map.layers.keys()]).toEqual([DOT_LAYER_ID, FILL_LAYER_ID, GAP_LAYER_ID, HOVER_LAYER_ID])
    expect(map.layers.get(FILL_LAYER_ID)).toMatchObject({ 'source-layer': 'b', filter: ['==', ['geometry-type'], 'Polygon'] })
  })

  it('sets every building score as feature state; the quiet central one scores higher', async () => {
    const map = makeFakeMap()
    await renderLayer(map)
    const [a, b] = [map.states.get(0)!, map.states.get(1)!]
    expect(a.score).toBeGreaterThan(b.score as number)
    expect([a.gap, b.gap]).toEqual([false, false]) // both have noise and price data; Locals' opinion is off
  })

  it('recomputes after a pause when the user changes weights or drops a walkability category', async () => {
    const map = makeFakeMap()
    await renderLayer(map)
    vi.useFakeTimers()
    try {
      const before = map.states.get(0)!.score
      act(() => useStore.setState({ compositeWeights: { ...DEFAULT_COMPOSITE_WEIGHTS, noise: 0, cityCore: 0, openPrice: 0 } }))
      expect(map.states.get(0)!.score).toBe(before) // not yet: waits for the slider to stop
      act(() => { vi.advanceTimersByTime(200) })
      expect(map.states.get(0)!.score).toBe(85)
      const calls = map.setFeatureState.mock.calls.length
      act(() => useStore.getState().setEnabledWalkCategories(['park']))
      act(() => { vi.advanceTimersByTime(200) })
      expect(map.states.get(0)!.score).toBe(80)
      expect(map.setFeatureState.mock.calls.length - calls).toBe(2) // both buildings changed, nothing else
    } finally {
      vi.useRealTimers()
    }
  })

  it('fits the colour scale to the buildings in view', async () => {
    const map = makeFakeMap()
    await renderLayer(map)
    const [lo, hi] = useStore.getState().compositeColorRange
    const scores = [map.states.get(0)!.score as number, map.states.get(1)!.score as number]
    expect(lo).toBeLessThanOrEqual(Math.min(...scores))
    expect(hi).toBeGreaterThanOrEqual(Math.max(...scores))
    expect(map.setPaintProperty).toHaveBeenCalledWith(FILL_LAYER_ID, 'fill-color', expect.anything())
    handler(map, 'moveend')()
    expect(map.setPaintProperty).toHaveBeenCalledWith(DOT_LAYER_ID, 'circle-color', expect.anything())
  })

  it('click selects a building, a second click closes it; hiding the index clears it', async () => {
    const map = makeFakeMap()
    await renderLayer(map)
    const click = handler(map, 'click', FILL_LAYER_ID)
    act(() => click({ features: [{ id: 1 }], point: { x: 0, y: 0 } }))
    expect(useStore.getState().selectedBuilding).toBe(1)
    expect(map.states.get(1)!.selected).toBe(true)
    act(() => click({ features: [{ id: 1 }], point: { x: 0, y: 0 } }))
    expect(useStore.getState().selectedBuilding).toBeNull()
    act(() => useStore.getState().setSelectedBuilding(0))
    act(() => useStore.setState({ compositeVisible: false }))
    expect(useStore.getState().selectedBuilding).toBeNull()
    expect(map.setLayoutProperty).toHaveBeenCalledWith(FILL_LAYER_ID, 'visibility', 'none')
  })
})

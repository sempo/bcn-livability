import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MapContext } from '../Map/MapContext'
import { useStore } from '../../store'
import { DEFAULT_COMPOSITE_WEIGHTS } from '../../store'

vi.mock('../../services/composite/compositeData', () => ({
  loadBundles: vi.fn().mockResolvedValue([
    {
      h3: 'aaa',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
      walk: 80,
      lden: 50,
      saleEurM2: 3500,
      cityCoreProps: {
        h3: 'aaa',
        sagrada: 10, placa_cat: 5, barceloneta: 20, barri_gotic: 15,
        pg_gracia: 8, arc_triomf: 12, montjuic: 18, placa_espanya: 22,
        glories: 25, poblenou: 30, parc_guell: 45, eixample: 0, waterfront: 35,
      },
    },
    {
      // Same cell as 'aaa' but fully inside the ACA T10 river flood zone (036)
      h3: 'flooded',
      geometry: { type: 'Polygon', coordinates: [[[1, 0], [2, 0], [2, 1], [1, 0]]] },
      walk: 80,
      lden: 50,
      saleEurM2: 3500,
      cityCoreProps: {
        h3: 'flooded',
        sagrada: 10, placa_cat: 5, barceloneta: 20, barri_gotic: 15,
        pg_gracia: 8, arc_triomf: 12, montjuic: 18, placa_espanya: 22,
        glories: 25, poblenou: 30, parc_guell: 45, eixample: 0, waterfront: 35,
      },
      climate: { flood_t10: 1, flood_t100: 1, flood_t500: 1, fire_wui: 0, fire_hazard: 0 },
    },
  ]),
  loadOpenPriceMeta: vi.fn().mockResolvedValue({ p5: 2088, p95: 5816 }),
}))

import { CompositeLayer, SOURCE_ID, FILL_LAYER_ID, FILL_B_LAYER_ID, GAP_LAYER_ID, HOVER_LAYER_ID } from './CompositeLayer'
import { CompositeLegend } from './CompositeLegend'
import { buildScoreFillColorForRange, fitScoreRange } from './scoreRamp'

function makeFakeMap() {
  const sources = new Map<string, { data: unknown; setData: ReturnType<typeof vi.fn> }>()
  const layers = new Map<string, unknown>()
  // Visible longitudes; latitudes 0–1. Hex 'aaa' is centred at lng 0.5, 'flooded' at lng 1.5.
  const view = { west: 0, east: 2 }
  return {
    view,
    getContainer: () => ({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) }),
    unproject: ([x, y]: [number, number]) => ({ lng: view.west + (x / 100) * (view.east - view.west), lat: 1 - y / 100 }),
    getSource: (id: string) => sources.get(id),
    addSource: (id: string, src: { data: unknown }) =>
      sources.set(id, { data: src.data, setData: vi.fn((d: unknown) => { sources.get(id)!.data = d }) }),
    getLayer: (id: string) => layers.get(id),
    addLayer: (l: { id: string }) => layers.set(l.id, l),
    setLayoutProperty: vi.fn(),
    setPaintProperty: vi.fn(),
    setFilter: vi.fn(),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    queryRenderedFeatures: vi.fn((): unknown[] => []),
    getCanvas: () => ({ style: {} as Record<string, string> }),
  }
}

type FakeMap = ReturnType<typeof makeFakeMap>

const scoreOf = (map: FakeMap, h3: string) => {
  const fc = map.getSource(SOURCE_ID)!.data as GeoJSON.FeatureCollection
  return fc.features.find((f) => f.properties!.h3 === h3)!.properties!.score as number
}
const moveEnd = (map: FakeMap) => act(() => map.on.mock.calls.find(([e]) => e === 'moveend')![1]())
const colorFor = (range: [number, number]) => buildScoreFillColorForRange(range[0], range[1], 'score')

function renderLayer(map: FakeMap | null) {
  return render(
    <MapContext.Provider value={map as unknown as maplibregl.Map}>
      <CompositeLayer />
    </MapContext.Provider>,
  )
}

describe('CompositeLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useStore.setState({
      compositeVisible: false,
      compositeWeights: DEFAULT_COMPOSITE_WEIGHTS,
      compositeColorRange: [0, 100],
      compositeRiskStrengths: { flood: 5, fire: 5, street: 5 },
    })
  })

  it('renders nothing (null)', () => {
    const { container } = renderLayer(makeFakeMap())
    expect(container.firstChild).toBeNull()
  })

  it('does not load data while layer is off', async () => {
    const { loadBundles } = await import('../../services/composite/compositeData')
    renderLayer(makeFakeMap())
    expect(loadBundles).not.toHaveBeenCalled()
  })

  it('adds fill and gap outline layers when enabled', async () => {
    useStore.setState({ compositeVisible: true })
    const map = makeFakeMap()
    await act(async () => { renderLayer(map) })

    expect(map.getSource(SOURCE_ID)).toBeDefined()
    expect(map.getLayer(FILL_LAYER_ID)).toBeDefined()
    expect(map.getLayer(FILL_B_LAYER_ID)).toBeDefined()
    expect(map.getLayer(GAP_LAYER_ID)).toBeDefined()
  })

  it('shows every hex — no score filter on the fill layers (TODO-032)', async () => {
    useStore.setState({ compositeVisible: true })
    const map = makeFakeMap()
    await act(async () => { renderLayer(map) })
    expect((map.getLayer(FILL_LAYER_ID) as { filter?: unknown }).filter).toBeUndefined()
    expect((map.getLayer(FILL_B_LAYER_ID) as { filter?: unknown }).filter).toBeUndefined()
  })

  it('hides layers when visibility toggled off', async () => {
    useStore.setState({ compositeVisible: true })
    const map = makeFakeMap()
    await act(async () => { renderLayer(map) })

    act(() => useStore.setState({ compositeVisible: false }))
    expect(map.setLayoutProperty).toHaveBeenCalledWith(FILL_LAYER_ID, 'visibility', 'none')
    expect(map.setLayoutProperty).toHaveBeenCalledWith(FILL_B_LAYER_ID, 'visibility', 'none')
    expect(map.setLayoutProperty).toHaveBeenCalledWith(GAP_LAYER_ID, 'visibility', 'none')
  })

  it('applies climate-risk penalties to the scored cells (integration, 036)', async () => {
    useStore.setState({ compositeVisible: true, compositeRiskStrengths: { flood: 5, fire: 5, street: 5 } })
    const map = makeFakeMap()
    await act(async () => { renderLayer(map) })

    type Props = { h3: string; score: number; floodPenalty: number }
    const scoreOf = (h3: string) => {
      const fc = map.getSource(SOURCE_ID)!.data as GeoJSON.FeatureCollection
      return fc.features.find((f) => f.properties!.h3 === h3)!.properties as Props
    }
    const safe = scoreOf('aaa')
    const flooded = scoreOf('flooded')
    expect(safe.floodPenalty).toBe(0)
    expect(flooded.floodPenalty).toBeGreaterThan(0)
    expect(flooded.score).toBe(Math.round(safe.score * 0.5))

    // Strength 0 → penalty disappears
    act(() => useStore.setState({ compositeRiskStrengths: { flood: 0, fire: 5, street: 5 } }))
    expect(scoreOf('flooded').score).toBe(safe.score)
  })

  it('hover outlines the hex (no tooltip); details open on click', async () => {
    useStore.setState({ compositeVisible: true })
    const map = makeFakeMap()
    await act(async () => { renderLayer(map) })
    const handler = (ev: string) => map.on.mock.calls.find(([e, layer]) => e === ev && layer === FILL_LAYER_ID)![2]
    const canvas = map.getCanvas()
    map.getCanvas = () => canvas

    handler('mousemove')({ features: [{ properties: { h3: 'aaa' } }] })
    expect(map.setFilter).toHaveBeenLastCalledWith(HOVER_LAYER_ID, ['==', ['get', 'h3'], 'aaa'])
    expect(canvas.style.cursor).toBe('pointer')
    expect(document.querySelector('.maplibregl-popup')).toBeNull()

    handler('mouseleave')()
    expect(map.setFilter).toHaveBeenLastCalledWith(HOVER_LAYER_ID, ['==', ['get', 'h3'], ''])
    expect(canvas.style.cursor).toBe('')
  })

  it('no hex hover outline over a best zone — the zone highlight wins (038)', async () => {
    useStore.setState({ compositeVisible: true })
    const map = makeFakeMap()
    await act(async () => { renderLayer(map) })
    const onMove = map.on.mock.calls.find(([e, layer]) => e === 'mousemove' && layer === FILL_LAYER_ID)![2]
    const e = { features: [{ properties: { h3: 'aaa' } }], point: { x: 1, y: 1 } }

    map.addLayer({ id: 'best-zones-fill' })
    map.queryRenderedFeatures.mockReturnValue([{}])
    onMove(e)
    expect(map.setFilter).toHaveBeenLastCalledWith(HOVER_LAYER_ID, ['==', ['get', 'h3'], ''])

    map.queryRenderedFeatures.mockReturnValue([])
    onMove(e)
    expect(map.setFilter).toHaveBeenLastCalledWith(HOVER_LAYER_ID, ['==', ['get', 'h3'], 'aaa'])
  })

  it('a click inside a best zone opens the zone popup, not the hex card (038)', async () => {
    useStore.setState({ compositeVisible: true, selectedHexH3: null })
    const map = makeFakeMap()
    await act(async () => { renderLayer(map) })
    const onClick = map.on.mock.calls.find(([ev, layer]) => ev === 'click' && layer === FILL_LAYER_ID)![2]
    const e = { features: [{ properties: { h3: 'aaa' } }], point: { x: 1, y: 1 } }

    map.addLayer({ id: 'best-zones-fill' })
    map.queryRenderedFeatures.mockReturnValue([{}])
    act(() => onClick(e))
    expect(useStore.getState().selectedHexH3).toBeNull()

    map.queryRenderedFeatures.mockReturnValue([])
    act(() => onClick(e))
    expect(useStore.getState().selectedHexH3).toBe('aaa')
  })

  it('rebuilds data when weights change', async () => {
    useStore.setState({ compositeVisible: true })
    const map = makeFakeMap()
    await act(async () => { renderLayer(map) })

    const source = map.getSource(SOURCE_ID)!
    act(() => useStore.setState({ compositeWeights: { poiAccess: 10, noise: 0, cityCore: 0, openPrice: 0, price: 0 } }))
    expect(source.setData).toHaveBeenCalled()
  })

  it('fits the colour scale to the visible hexes and crossfades when the view changes (TODO-032)', async () => {
    useStore.setState({ compositeVisible: true })
    const map = makeFakeMap()
    await act(async () => { renderLayer(map) })
    const whole = fitScoreRange([scoreOf(map, 'aaa'), scoreOf(map, 'flooded')])!
    expect(useStore.getState().compositeColorRange).toEqual(whole)
    expect(map.setPaintProperty).toHaveBeenCalledWith(FILL_LAYER_ID, 'fill-color', colorFor(whole))

    // Zoom in on 'aaa': the hidden layer B gets the new colours and fades in, A fades out.
    map.setPaintProperty.mockClear()
    map.view.east = 1
    moveEnd(map)
    const zoomed = fitScoreRange([scoreOf(map, 'aaa')])!
    expect(zoomed).not.toEqual(whole)
    expect(useStore.getState().compositeColorRange).toEqual(zoomed)
    expect(map.setPaintProperty).toHaveBeenCalledWith(FILL_B_LAYER_ID, 'fill-color', colorFor(zoomed))
    expect(map.setPaintProperty).toHaveBeenCalledWith(FILL_B_LAYER_ID, 'fill-opacity', 0.6)
    expect(map.setPaintProperty).toHaveBeenCalledWith(FILL_LAYER_ID, 'fill-opacity', 0)

    // Back out: the roles swap again.
    map.setPaintProperty.mockClear()
    map.view.east = 2
    moveEnd(map)
    expect(map.setPaintProperty).toHaveBeenCalledWith(FILL_LAYER_ID, 'fill-color', colorFor(whole))
    expect(map.setPaintProperty).toHaveBeenCalledWith(FILL_LAYER_ID, 'fill-opacity', 0.6)
    expect(map.setPaintProperty).toHaveBeenCalledWith(FILL_B_LAYER_ID, 'fill-opacity', 0)
  })

  it('a weight change refits the scale at once — no crossfade (TODO-032)', async () => {
    useStore.setState({ compositeVisible: true })
    const map = makeFakeMap()
    await act(async () => { renderLayer(map) })
    map.setPaintProperty.mockClear()

    act(() => useStore.setState({ compositeWeights: { poiAccess: 10, noise: 0, cityCore: 0, openPrice: 0, price: 0 } }))
    const range = fitScoreRange([scoreOf(map, 'aaa'), scoreOf(map, 'flooded')])!
    expect(useStore.getState().compositeColorRange).toEqual(range)
    expect(map.setPaintProperty).toHaveBeenCalledWith(FILL_LAYER_ID, 'fill-color', colorFor(range))
    expect(map.setPaintProperty).not.toHaveBeenCalledWith(expect.anything(), 'fill-opacity', expect.anything())
  })

  it('keeps the scale when no hex is in view', async () => {
    useStore.setState({ compositeVisible: true })
    const map = makeFakeMap()
    await act(async () => { renderLayer(map) })
    const before = useStore.getState().compositeColorRange
    map.setPaintProperty.mockClear()
    map.view.west = 10
    map.view.east = 12
    moveEnd(map)
    expect(useStore.getState().compositeColorRange).toEqual(before)
    expect(map.setPaintProperty).not.toHaveBeenCalled()
  })

  it('legend follows the visible area (integration, TODO-032)', async () => {
    useStore.setState({ compositeVisible: true })
    const map = makeFakeMap()
    await act(async () => {
      render(
        <MantineProvider>
          <MapContext.Provider value={map as unknown as maplibregl.Map}>
            <CompositeLayer />
          </MapContext.Provider>
          <CompositeLegend />
        </MantineProvider>,
      )
    })
    const [lo, hi] = fitScoreRange([scoreOf(map, 'aaa'), scoreOf(map, 'flooded')])!
    expect(screen.getByText(String(lo))).toBeTruthy()
    expect(screen.getByText(String(hi))).toBeTruthy()

    map.view.east = 1
    moveEnd(map)
    const [zLo, zHi] = fitScoreRange([scoreOf(map, 'aaa')])!
    expect(screen.getByText(String(zLo))).toBeTruthy()
    expect(screen.getByText(String(zHi))).toBeTruthy()
  })
})

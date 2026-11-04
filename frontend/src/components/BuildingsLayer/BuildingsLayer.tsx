import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import type * as maplibregl from 'maplibre-gl'
import { MapContext } from '../Map/MapContext'
import { useStore } from '../../store'
import { loadBuildings, type BuildingData } from '../../services/buildings/buildingData'
import { scoreAll } from '../../services/buildings/buildingScore'
import { loadBarriVibe, type BarriVibeData } from '../../services/localsOpinion/localsOpinion'
import { buildStateColorForRange, fitScoreRange } from './scoreRamp'
import { inBestZone } from '../BestZones/inBestZone'
import { addLayerOrdered } from '../Map/layerOrder'
import { visibleBounds } from '../Map/visibleBounds'
import { features } from '../../features'

// Building-level Livability Index (TODO-046). Tiles carry only geometry and a numeric feature id (= row of the
// score columns): dots up to z13, footprints from z14. Scores are computed in JS and set as feature state.
export const SOURCE_ID = 'buildings'
export const SOURCE_LAYER = 'b'
export const DOT_LAYER_ID = 'buildings-dots'
export const FILL_LAYER_ID = 'buildings-fill'
export const GAP_LAYER_ID = 'buildings-gap-outline'
export const HOVER_LAYER_ID = 'buildings-hover-outline'
const LAYER_IDS = [DOT_LAYER_ID, FILL_LAYER_ID, GAP_LAYER_ID, HOVER_LAYER_ID]
const PMTILES_URL = `pmtiles://${import.meta.env.BASE_URL}data/buildings.pmtiles`
/** Pause after the last settings change before rescoring (scoring all buildings takes ~0.4 s). */
const RESCORE_DELAY_MS = 150

const POINT: maplibregl.FilterSpecification = ['==', ['geometry-type'], 'Point']
const POLYGON: maplibregl.FilterSpecification = ['==', ['geometry-type'], 'Polygon']
const state = (key: string): maplibregl.ExpressionSpecification => ['boolean', ['feature-state', key], false]

interface Loaded { buildings: BuildingData; vibe: BarriVibeData | null }

export function BuildingsLayer() {
  const map = useContext(MapContext)
  const visible = useStore((s) => s.compositeVisible)
  const weights = useStore((s) => s.compositeWeights)
  const enabledLandmarkIds = useStore((s) => s.enabledLandmarkIds)
  const enabledCategories = useStore((s) => s.enabledWalkCategories)
  const riskStrengths = useStore((s) => s.compositeRiskStrengths)
  const ageEras = useStore((s) => s.ageEras)
  const conditions = useStore((s) => s.conditions)
  const selected = useStore((s) => s.selectedBuilding)
  const setSelectedBuilding = useStore((s) => s.setSelectedBuilding)

  const [data, setData] = useState<Loaded | null>(null)
  const scoresRef = useRef<Uint8Array | null>(null)

  // Lazy-load the score columns the first time the index is shown.
  useEffect(() => {
    if (!visible || data) return
    let cancelled = false
    Promise.all([loadBuildings(), features.localsOpinion ? loadBarriVibe() : null])
      .then(([buildings, vibe]) => { if (!cancelled) setData({ buildings, vibe }) })
      .catch((err) => console.error('Building layer data failed to load', err))
    return () => { cancelled = true }
  }, [visible, data])

  /** Fits the colour scale (TODO-032) to the buildings whose centroid is in the visible part of the map. */
  const recolor = useCallback(() => {
    const scores = scoresRef.current
    if (!map || !data || !scores || !map.getLayer(FILL_LAYER_ID)) return
    const [w, s, e, n] = visibleBounds(map)
    const { lng, lat } = data.buildings.cols
    const inView: number[] = []
    for (let i = 0; i < scores.length; i++) {
      if (lng[i] >= w && lng[i] <= e && lat[i] >= s && lat[i] <= n) inView.push(scores[i])
    }
    const range = fitScoreRange(inView)
    if (!range) return
    useStore.getState().setCompositeColorRange(range)
    const color = buildStateColorForRange(range[0], range[1])
    map.setPaintProperty(FILL_LAYER_ID, 'fill-color', color)
    map.setPaintProperty(DOT_LAYER_ID, 'circle-color', color)
  }, [map, data])

  // Source and layers, once the data is there.
  useEffect(() => {
    if (!map || !data || map.getSource(SOURCE_ID)) return
    map.addSource(SOURCE_ID, { type: 'vector', url: PMTILES_URL })
    const layout = { visibility: visible ? 'visible' : 'none' } as const
    const color = buildStateColorForRange(...useStore.getState().compositeColorRange)
    const base = { source: SOURCE_ID, 'source-layer': SOURCE_LAYER, layout }
    addLayerOrdered(map, {
      ...base, id: DOT_LAYER_ID, type: 'circle', filter: POINT,
      paint: {
        'circle-color': color, 'circle-opacity': 0.85,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 1, 13, 2.5],
      },
    }, DOT_LAYER_ID)
    addLayerOrdered(map, {
      ...base, id: FILL_LAYER_ID, type: 'fill', filter: POLYGON,
      paint: { 'fill-color': color, 'fill-opacity': 0.75 },
    }, FILL_LAYER_ID)
    addLayerOrdered(map, {
      ...base, id: GAP_LAYER_ID, type: 'line', filter: POLYGON,
      paint: { 'line-color': '#000', 'line-width': 1.2, 'line-opacity': ['case', state('gap'), 0.7, 0] },
    }, GAP_LAYER_ID)
    addLayerOrdered(map, {
      ...base, id: HOVER_LAYER_ID, type: 'line', filter: POLYGON,
      paint: {
        'line-color': '#ffffff', 'line-width': 2,
        'line-opacity': ['case', ['any', state('hover'), state('selected')], 0.95, 0],
      },
    }, HOVER_LAYER_ID)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, data])

  // Scores of every building → feature state, whenever the user's settings change. The first pass runs at once;
  // later ones wait for a pause (dragging a slider would otherwise rescore 170k buildings per step), and only
  // buildings whose score changed get a new state.
  const gapRef = useRef<Uint8Array | null>(null)
  useEffect(() => {
    if (!map || !data || !map.getSource(SOURCE_ID)) return
    const run = () => {
      const t0 = performance.now()
      const { score, gap } = scoreAll(data.buildings, {
        weights, conditions, enabledLandmarkIds, enabledCategories, riskStrengths, ageEras, vibe: data.vibe,
      })
      const [prevScore, prevGap] = [scoresRef.current, gapRef.current]
      let changed = 0
      for (let i = 0; i < score.length; i++) {
        if (prevScore && prevGap && prevScore[i] === score[i] && prevGap[i] === gap[i]) continue
        map.setFeatureState({ source: SOURCE_ID, sourceLayer: SOURCE_LAYER, id: i }, { score: score[i], gap: gap[i] === 1 })
        changed++
      }
      scoresRef.current = score
      gapRef.current = gap
      useStore.getState().setBuildingScores(score)
      recolor()
      if (import.meta.env.DEV) {
        console.debug(`buildings: ${score.length} scored, ${changed} changed, ${Math.round(performance.now() - t0)} ms`)
      }
    }
    if (!scoresRef.current) {
      run()
      return
    }
    const timer = setTimeout(run, RESCORE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [map, data, weights, conditions, enabledLandmarkIds, enabledCategories, riskStrengths, ageEras, recolor])

  // Refit the colour scale once the map stops moving.
  useEffect(() => {
    if (!map) return
    const onMoveEnd = () => recolor()
    map.on('moveend', onMoveEnd)
    return () => { map.off('moveend', onMoveEnd) }
  }, [map, recolor])

  // Visibility toggle without removing layers.
  useEffect(() => {
    if (!map || !map.getLayer(FILL_LAYER_ID)) return
    for (const id of LAYER_IDS) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
    if (!visible) setSelectedBuilding(null)
  }, [map, visible, data, setSelectedBuilding])

  // White outline on the selected building.
  useEffect(() => {
    if (!map || selected === null || !map.getSource(SOURCE_ID)) return
    const target = { source: SOURCE_ID, sourceLayer: SOURCE_LAYER, id: selected }
    map.setFeatureState(target, { selected: true })
    return () => { if (map.getSource(SOURCE_ID)) map.setFeatureState(target, { selected: false }) }
  }, [map, selected, data])

  // Hover outline + pointer; click opens the building card (feature 038: a best zone owns its clicks).
  useEffect(() => {
    if (!map) return
    let hovered: number | null = null
    const hover = (id: number, on: boolean) =>
      map.setFeatureState({ source: SOURCE_ID, sourceLayer: SOURCE_LAYER, id }, { hover: on })
    const onMove = (e: maplibregl.MapLayerMouseEvent) => {
      const id = e.features?.[0]?.id
      if (typeof id !== 'number') return
      map.getCanvas().style.cursor = 'pointer'
      if (hovered === id) return
      if (hovered !== null) hover(hovered, false)
      hovered = id
      hover(id, true)
    }
    const onLeave = () => {
      map.getCanvas().style.cursor = ''
      if (hovered !== null) hover(hovered, false)
      hovered = null
    }
    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const id = e.features?.[0]?.id
      if (typeof id !== 'number' || inBestZone(map, e)) return
      const st = useStore.getState()
      st.setSelectedBuilding(st.selectedBuilding === id ? null : id)
    }
    for (const layer of [FILL_LAYER_ID, DOT_LAYER_ID]) {
      map.on('mousemove', layer, onMove)
      map.on('mouseleave', layer, onLeave)
      map.on('click', layer, onClick)
    }
    return () => {
      for (const layer of [FILL_LAYER_ID, DOT_LAYER_ID]) {
        map.off('mousemove', layer, onMove)
        map.off('mouseleave', layer, onLeave)
        map.off('click', layer, onClick)
      }
    }
  }, [map])

  // Tear down on unmount.
  useEffect(() => {
    return () => {
      if (!map) return
      for (const id of [...LAYER_IDS].reverse()) if (map.getLayer(id)) map.removeLayer(id)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map])

  return null
}

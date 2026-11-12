import { useEffect, useRef } from 'react'
import type { FeatureCollection } from 'geojson'
import * as maplibregl from 'maplibre-gl'
import { useMap } from '../Map/MapContext'
import { addLayerOrdered } from '../Map/layerOrder'
import { useSearchStore } from '../../store/searchStore'
import { SEARCH_ADDRESS_ZOOM } from '../../services/searchConfig'

export const SEARCH_SOURCE_ID = 'search-area'
const FILL_ID = 'search-area-fill'
const LINE_ID = 'search-area-line'
const COLOR = '#1971c2'
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

/** Leaves room for the filter panel (left) and the building card (right) on desktop. */
function fitPadding(): maplibregl.PaddingOptions {
  const wide = window.innerWidth > 768
  return { top: 60, bottom: 60, left: wide ? 300 : 40, right: 40 }
}

/**
 * Map side of the search box (TODO-044): reacts to the store — fits the map to a picked area and draws
 * its outline, or flies to a picked address and drops a temporary marker. Esc clears it.
 */
export function SearchLayer() {
  const map = useMap()
  const selection = useSearchStore((s) => s.selection)
  const clear = useSearchStore((s) => s.clear)
  const markerRef = useRef<maplibregl.Marker | null>(null)

  useEffect(() => {
    if (!map) return
    map.addSource(SEARCH_SOURCE_ID, { type: 'geojson', data: EMPTY })
    addLayerOrdered(map, {
      id: FILL_ID, type: 'fill', source: SEARCH_SOURCE_ID,
      paint: { 'fill-color': COLOR, 'fill-opacity': 0.06 },
    }, FILL_ID)
    addLayerOrdered(map, {
      id: LINE_ID, type: 'line', source: SEARCH_SOURCE_ID,
      paint: { 'line-color': COLOR, 'line-width': 3 },
    }, LINE_ID)
    return () => {
      try {
        for (const id of [LINE_ID, FILL_ID]) if (map.getLayer(id)) map.removeLayer(id)
        if (map.getSource(SEARCH_SOURCE_ID)) map.removeSource(SEARCH_SOURCE_ID)
      } catch {
        // Map may have been destroyed already
      }
    }
  }, [map])

  useEffect(() => {
    if (!map) return
    const source = map.getSource(SEARCH_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    markerRef.current?.remove()
    markerRef.current = null
    if (!selection) {
      source?.setData(EMPTY)
      return
    }
    if (selection.kind === 'area') {
      source?.setData(selection.outline)
      const [w, s, e, n] = selection.bounds
      map.fitBounds([[w, s], [e, n]], { padding: fitPadding(), maxZoom: 16 })
    } else {
      source?.setData(EMPTY)
      map.flyTo({ center: selection.coords, zoom: SEARCH_ADDRESS_ZOOM })
      markerRef.current = new maplibregl.Marker({ color: COLOR }).setLngLat(selection.coords).addTo(map)
    }
  }, [map, selection])

  useEffect(() => {
    if (!selection) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') clear() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selection, clear])

  return null
}

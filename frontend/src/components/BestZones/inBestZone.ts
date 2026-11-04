import type * as maplibregl from 'maplibre-gl'
import { FILL_LAYER_ID } from './BestZonesLayer'

/** Inside a drawn best zone the zone owns hover and click (feature 038), not the building underneath. */
export function inBestZone(map: maplibregl.Map, e: maplibregl.MapLayerMouseEvent): boolean {
  return !!map.getLayer(FILL_LAYER_ID) &&
    map.queryRenderedFeatures(e.point, { layers: [FILL_LAYER_ID] }).length > 0
}

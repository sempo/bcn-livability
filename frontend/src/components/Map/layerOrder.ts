import type * as maplibregl from 'maplibre-gl'

/**
 * Canonical bottom-to-top z-order for all MapLibre layers in the app.
 * Used by addLayerOrdered to insert each layer in the right position
 * regardless of when it is first added (e.g. lazy-loaded or async layers).
 */
export const LAYER_Z_ORDER: readonly string[] = [
  // Livability Index on buildings (bottom) — TODO-046 (dots at low zoom, footprints from z14)
  'buildings-dots',
  'buildings-fill',
  'buildings-gap-outline',
  'buildings-hover-outline',
  'noise-overlay',
  // Climate-risk view layers — features 036, 037
  'wildfire-hazard-fill',
  'flood-zones-fill',
  'flood-zones-line',
  'street-flooding-fill',
  'wildfire-wui-line',
  // Facade noise circles of the selected building — TODO-046
  'building-facades-circles',
  // Exclusion zones
  'exclusion-fill',
  'exclusion-line',
  // Area view below z13 — TODO-051
  'areas-fill',
  'areas-line',
  'areas-label',
  // Best zones — feature 038
  'best-zones-fill',
  'best-zones-line',
  'best-zones-label',
  // Search result outline — TODO-044
  'search-area-fill',
  'search-area-line',
  // Idealista price overlay
  'idealista-prices-dots',
  'idealista-prices-labels',
  // Isochrone
  'isochrone-mask',
  'isochrone-line',
  'isochrone-label',
  // Transit
  'metro-lines',
  'metro-circles',
  'metro-labels',
  'fgc-line',
  'fgc-circle',
  'fgc-label',
  // POI icons
  'poi-priority',
  'poi-secondary',
  // Pin accuracy halos (top)
  'pin-accuracy-fill',
  'pin-accuracy-line',
]

/**
 * Add a MapLibre layer in its canonical z-position.
 *
 * Finds the first already-existing layer that appears above `anchorId`
 * in LAYER_Z_ORDER and passes it as `before` to map.addLayer().
 * Falls back to appending at top if no higher layer exists yet.
 */
export function addLayerOrdered(
  map: maplibregl.Map,
  layer: maplibregl.LayerSpecification,
  anchorId: string,
): void {
  const idx = LAYER_Z_ORDER.indexOf(anchorId)
  let beforeId: string | undefined
  for (let i = idx + 1; i < LAYER_Z_ORDER.length; i++) {
    if (map.getLayer(LAYER_Z_ORDER[i])) {
      beforeId = LAYER_Z_ORDER[i]
      break
    }
  }
  map.addLayer(layer, beforeId)
}

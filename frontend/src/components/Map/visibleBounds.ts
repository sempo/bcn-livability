import type * as maplibregl from 'maplibre-gl'
import type { Bounds } from '../../services/bestZones'

/**
 * Visible part of the map: the viewport minus the left filter panel and the right hex detail card
 * (when open). Best zones (038) never hide under them; the colour scale (TODO-032) fits to it.
 */
export function visibleBounds(map: maplibregl.Map): Bounds {
  const box = map.getContainer().getBoundingClientRect()
  const mid = box.left + box.width / 2
  let left = 0
  let right = box.width
  const panel = document.querySelector('.top-panel')?.getBoundingClientRect()
  if (panel && panel.right < mid) left = Math.max(0, panel.right - box.left)
  const card = document.querySelector('.hex-detail-overlay')?.getBoundingClientRect()
  if (card && card.left > mid) right = Math.min(box.width, card.left - box.left)
  const corners = [[left, 0], [right, 0], [right, box.height], [left, box.height]]
    .map(([x, y]) => map.unproject([x, y]))
  const lngs = corners.map((c) => c.lng)
  const lats = corners.map((c) => c.lat)
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]
}

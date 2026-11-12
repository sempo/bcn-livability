import bbox from '@turf/bbox'
import type { AreaFeature } from '../areas'
import type { Bounds } from '../bestZones'
import { useSearchStore } from '../../store/searchStore'

/** Fly to an area and outline it: the same selection the search box makes (SearchLayer draws it). */
export function selectAreaFeature(feature: AreaFeature): void {
  useSearchStore.getState().selectArea(
    feature.properties.name,
    bbox(feature) as Bounds,
    { type: 'FeatureCollection', features: [feature] },
  )
}

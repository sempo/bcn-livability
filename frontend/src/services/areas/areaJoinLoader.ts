import { loadAreas, type AreaFeature } from '../areas'
import { loadBuildings } from '../buildings/buildingData'
import { joinAreas } from './areaJoin'

let cache: Promise<Map<number, AreaFeature>> | null = null

/** Area index → polygon, once the building data and the areas have loaded (cached). */
export function loadAreaJoin(): Promise<Map<number, AreaFeature>> {
  if (!cache) {
    try {
      cache = Promise.all([loadBuildings(), loadAreas()])
        .then(([data, features]) => joinAreas(data.meta.areas, data.cols.area, data.cols.lng, data.cols.lat, features))
        .catch((err) => { cache = null; throw err })
    } catch (err) {
      return Promise.reject(err)
    }
  }
  return cache
}

/** Test helper — clears the module-level cache. */
export function resetAreaJoinCache(): void {
  cache = null
}

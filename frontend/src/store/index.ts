import { create } from 'zustand'
import type { MultiPolygon, Polygon } from 'geojson'
import { ALL_LANDMARK_IDS } from '../services/cityCore/landmarks'
import { SERVICE_CATEGORIES } from '../services/walkability/serviceCategories'
import { DEFAULT_RISK_STRENGTHS, type RiskStrengths } from '../services/climateRisk/climateRisk'
import { DEFAULT_TOP_PCT, type Bounds } from '../services/bestZones'
import { ALL_AGE_ERA_IDS } from '../services/buildings/buildingAge'
import { DEFAULT_CONDITIONS, type Conditions } from '../services/buildings/conditions'
import { features } from '../features'

/** Which Livability conditions are on: 1 = on, 0 = off (049). */
export interface CompositeWeights {
  poiAccess: number
  noise: number
  cityCore: number
  openPrice: number
  /** Residents' satisfaction (042); off by default. */
  localsOpinion: number
  /** Building age against the eras the user likes (TODO-047); off by default. */
  age: number
}

export const ALL_WALK_CATEGORY_IDS: readonly string[] = SERVICE_CATEGORIES.map((c) => c.id)

export const DEFAULT_COMPOSITE_WEIGHTS: CompositeWeights = {
  poiAccess: 1,
  noise: 1,
  cityCore: 1,
  openPrice: 1,
  localsOpinion: 0,
  age: 0,
}

export interface AppState {
  workplace: [number, number] | null
  minutes: number
  zoom: number
  mapCenter: [number, number]
  resultPolygon: Polygon | MultiPolygon | null
  noiseLayerVisible: boolean
  mapAttribution: string
  // Best zones — feature 038. Viewport captured by "Draw best zones"; null = no zones.
  bestZonesBounds: Bounds | null
  bestZonesTopPct: number
  /** Best zones only inside the isochrone and outside exclusion zones. */
  bestZonesRestrict: boolean
  // Landmark selection for city core component inside composite — feature 021/022
  enabledLandmarkIds: readonly string[]
  // Idealista price dots layer — feature 019
  idealistaPricesVisible: boolean
  idealistaPriceRange: [number, number]
  idealistaPriceBounds: [number, number] | null
  // Composite Index layer — feature 022
  compositeVisible: boolean
  compositeWeights: CompositeWeights
  /** Colour scale of the map, fitted to the buildings in view (TODO-032); set by BuildingsLayer. */
  compositeColorRange: [number, number]
  /** "Boost contrast for this view" (TODO-050): fit the colour scale to the visible area; off = fixed 0–100. */
  contrastBoost: boolean
  // Climate risk penalties + view layers — feature 036
  compositeRiskStrengths: RiskStrengths
  floodLayerVisible: boolean
  wildfireLayerVisible: boolean
  // Street flooding view layer — feature 037
  streetFloodingLayerVisible: boolean
  streetFloodingReturnPeriod: 't10' | 't100'
  // Building-level index — TODO-046
  /** Walkability categories the user keeps; walkability is recomputed over them. */
  enabledWalkCategories: readonly string[]
  /** Building-age eras the user likes (TODO-047); all by default. */
  ageEras: readonly string[]
  /** What is OK for the user, in real units (049). */
  conditions: Conditions
  /** Row (= feature id) of the clicked building; null = no card. */
  selectedBuilding: number | null
  /** Latest score of every building (by row), set by BuildingsLayer; Best zones average it per cell. */
  buildingScores: Uint8Array | null
  setWorkplace: (wp: [number, number] | null) => void
  setMinutes: (minutes: number) => void
  setZoom: (zoom: number) => void
  setMapCenter: (center: [number, number]) => void
  setResultPolygon: (polygon: Polygon | MultiPolygon | null) => void
  setNoiseLayerVisible: (visible: boolean) => void
  setMapAttribution: (attribution: string) => void
  setBestZonesBounds: (bounds: Bounds | null) => void
  setBestZonesTopPct: (topPct: number) => void
  setBestZonesRestrict: (restrict: boolean) => void
  setEnabledLandmarkIds: (ids: readonly string[]) => void
  setIdealistaPricesVisible: (visible: boolean) => void
  setIdealistaPriceRange: (range: [number, number]) => void
  setIdealistaPriceBounds: (bounds: [number, number]) => void
  setCompositeVisible: (visible: boolean) => void
  setCompositeWeights: (weights: CompositeWeights) => void
  setCompositeColorRange: (range: [number, number]) => void
  setContrastBoost: (on: boolean) => void
  setCompositeRiskStrengths: (strengths: RiskStrengths) => void
  setFloodLayerVisible: (visible: boolean) => void
  setWildfireLayerVisible: (visible: boolean) => void
  setStreetFloodingLayerVisible: (visible: boolean) => void
  setStreetFloodingReturnPeriod: (rp: 't10' | 't100') => void
  setEnabledWalkCategories: (ids: readonly string[]) => void
  setAgeEras: (ids: readonly string[]) => void
  setConditions: (conditions: Conditions) => void
  setSelectedBuilding: (row: number | null) => void
  setBuildingScores: (scores: Uint8Array | null) => void
}

function isValidMinutes(n: number): boolean {
  return Number.isInteger(n) && n >= 15 && n <= 120 && n % 5 === 0
}

export const DEFAULT_CENTER: [number, number] = [2.1734, 41.3851]

export function isochroneCacheKey(workplace: [number, number], minutes: number): string {
  return `bcn_isochrone:${workplace[0].toFixed(5)},${workplace[1].toFixed(5)},${minutes}`
}

function readIsochroneCache(workplace: [number, number], minutes: number): Polygon | MultiPolygon | null {
  try {
    const raw = localStorage.getItem(isochroneCacheKey(workplace, minutes))
    return raw ? (JSON.parse(raw) as Polygon | MultiPolygon) : null
  } catch {
    return null
  }
}

const DEFAULT_ZOOM = 12
const WORKPLACE_KEY = 'bcn_workplace'
const NOISE_LAYER_KEY = 'bcn_noise_layer_visible'
const CITY_CORE_LANDMARKS_KEY = 'bcn_city_core_landmarks'
const COMPOSITE_VISIBLE_KEY = 'bcn_composite_visible'
const COMPOSITE_WEIGHTS_KEY = 'bcn_composite_weights'
const COMPOSITE_RISK_STRENGTHS_KEY = 'bcn_composite_risk_strengths'
const FLOOD_LAYER_KEY = 'bcn_flood_layer_visible'
const WILDFIRE_LAYER_KEY = 'bcn_wildfire_layer_visible'
const STREET_FLOODING_LAYER_KEY = 'bcn_street_flooding_layer_visible'
const BEST_ZONES_TOP_PCT_KEY = 'bcn_best_zones_top_pct'
const BEST_ZONES_RESTRICT_KEY = 'bcn_best_zones_restrict'
const WALK_CATEGORIES_KEY = 'bcn_walk_categories'
const CONTRAST_BOOST_KEY = 'bcn_contrast_boost'
const AGE_ERAS_KEY = 'bcn_age_eras'
const CONDITIONS_KEY = 'bcn_conditions'

function loadConditions(): Conditions {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONDITIONS_KEY) ?? 'null') as Partial<Record<keyof Conditions, unknown>> | null
    const keys = Object.keys(DEFAULT_CONDITIONS) as (keyof Conditions)[]
    return Object.fromEntries(keys.map((k) => {
      const v = parsed?.[k]
      return [k, typeof v === 'number' && Number.isFinite(v) ? v : DEFAULT_CONDITIONS[k]]
    })) as unknown as Conditions
  } catch {
    return DEFAULT_CONDITIONS
  }
}

/** A stored id list, unknown ids dropped; all ids when nothing valid is stored. */
function loadIds(key: string, all: readonly string[]): readonly string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? 'null') as unknown
    const known = Array.isArray(parsed) ? parsed.filter((id) => all.includes(id)) : []
    if (known.length > 0) return known
  } catch { /* ignore */ }
  return all
}

export function readWorkplaceFromStorage(): [number, number] | null {
  try {
    const raw = localStorage.getItem(WORKPLACE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed) && parsed.length === 2 && !isNaN(parsed[0]) && !isNaN(parsed[1])) {
      return [parsed[0] as number, parsed[1] as number]
    }
    return null
  } catch {
    return null
  }
}

export function readUrlParams(): Pick<AppState, 'minutes' | 'zoom' | 'mapCenter'> {
  const params = new URLSearchParams(window.location.search)
  const cx = parseFloat(params.get('cx') ?? '')
  const cy = parseFloat(params.get('cy') ?? '')
  const rawMinutes = parseInt(params.get('minutes') ?? '', 10)
  const rawZoom = parseFloat(params.get('zoom') ?? '')

  return {
    mapCenter: !isNaN(cx) && !isNaN(cy) ? [cx, cy] : DEFAULT_CENTER,
    minutes: isValidMinutes(rawMinutes) ? rawMinutes : 60,
    zoom: !isNaN(rawZoom) && rawZoom >= 1 && rawZoom <= 22 ? rawZoom : DEFAULT_ZOOM,
  }
}

function loadCompositeWeights(): CompositeWeights {
  try {
    const raw = localStorage.getItem(COMPOSITE_WEIGHTS_KEY)
    if (!raw) return DEFAULT_COMPOSITE_WEIGHTS
    const parsed = JSON.parse(raw) as Partial<CompositeWeights>
    // Weights stored before 049 were 1–10: anything above 0 means the condition is on.
    const on = (k: keyof CompositeWeights) => ((parsed[k] ?? DEFAULT_COMPOSITE_WEIGHTS[k]) > 0 ? 1 : 0)
    return {
      poiAccess: on('poiAccess'),
      noise: on('noise'),
      cityCore: on('cityCore'),
      openPrice: on('openPrice'),
      // Flag off: no row to turn it back off, so a stored value must not apply.
      localsOpinion: features.localsOpinion ? on('localsOpinion') : 0,
      age: on('age'),
    }
  } catch {
    return DEFAULT_COMPOSITE_WEIGHTS
  }
}

function loadRiskStrengths(): RiskStrengths {
  try {
    const raw = localStorage.getItem(COMPOSITE_RISK_STRENGTHS_KEY)
    if (!raw) return DEFAULT_RISK_STRENGTHS
    const parsed = JSON.parse(raw) as Partial<RiskStrengths>
    return {
      flood: parsed.flood ?? DEFAULT_RISK_STRENGTHS.flood,
      fire: parsed.fire ?? DEFAULT_RISK_STRENGTHS.fire,
      street: parsed.street ?? DEFAULT_RISK_STRENGTHS.street,
    }
  } catch {
    return DEFAULT_RISK_STRENGTHS
  }
}

function loadBoolKey(key: string, dflt = false): boolean {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? dflt : raw === 'true'
  } catch {
    return dflt
  }
}

export const useStore = create<AppState>((set) => {
  const { minutes, zoom, mapCenter } = readUrlParams()
  const workplace = readWorkplaceFromStorage()
  return {
    workplace,
    minutes,
    zoom,
    mapCenter,
    resultPolygon: workplace ? readIsochroneCache(workplace, minutes) : null,
    noiseLayerVisible: loadBoolKey(NOISE_LAYER_KEY),
    enabledLandmarkIds: (() => {
      try {
        const raw = localStorage.getItem(CITY_CORE_LANDMARKS_KEY)
        if (!raw) return ALL_LANDMARK_IDS
        const parsed = JSON.parse(raw) as unknown
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[]
      } catch { /* ignore */ }
      return ALL_LANDMARK_IDS
    })(),
    setWorkplace: (workplace) => {
      try {
        if (workplace) localStorage.setItem(WORKPLACE_KEY, JSON.stringify(workplace))
        else localStorage.removeItem(WORKPLACE_KEY)
      } catch { /* ignore */ }
      set({ workplace })
    },
    setMinutes: (minutes) => set({ minutes }),
    setZoom: (zoom) => set({ zoom }),
    setMapCenter: (mapCenter) => set({ mapCenter }),
    setResultPolygon: (resultPolygon) => set({ resultPolygon }),
    setNoiseLayerVisible: (visible) => {
      try { localStorage.setItem(NOISE_LAYER_KEY, String(visible)) } catch { /* ignore */ }
      set({ noiseLayerVisible: visible })
    },
    mapAttribution: '',
    setMapAttribution: (mapAttribution) => set({ mapAttribution }),
    bestZonesBounds: null,
    setBestZonesBounds: (bestZonesBounds) => set({ bestZonesBounds }),
    bestZonesTopPct: (() => {
      try {
        const v = Number(localStorage.getItem(BEST_ZONES_TOP_PCT_KEY))
        if (v > 0 && v <= 100) return v
      } catch { /* ignore */ }
      return DEFAULT_TOP_PCT
    })(),
    setBestZonesTopPct: (topPct) => {
      try { localStorage.setItem(BEST_ZONES_TOP_PCT_KEY, String(topPct)) } catch { /* ignore */ }
      set({ bestZonesTopPct: topPct })
    },
    bestZonesRestrict: (() => {
      try { return localStorage.getItem(BEST_ZONES_RESTRICT_KEY) !== 'false' } catch { return true }
    })(),
    setBestZonesRestrict: (restrict) => {
      try { localStorage.setItem(BEST_ZONES_RESTRICT_KEY, String(restrict)) } catch { /* ignore */ }
      set({ bestZonesRestrict: restrict })
    },
    setEnabledLandmarkIds: (ids) => {
      try { localStorage.setItem(CITY_CORE_LANDMARKS_KEY, JSON.stringify(ids)) } catch { /* ignore */ }
      set({ enabledLandmarkIds: ids })
    },
    idealistaPricesVisible: false,
    idealistaPriceRange: [300_000, 1_000_000],
    idealistaPriceBounds: null,
    setIdealistaPricesVisible: (idealistaPricesVisible) => set({ idealistaPricesVisible }),
    setIdealistaPriceRange: (idealistaPriceRange) => set({ idealistaPriceRange }),
    setIdealistaPriceBounds: (idealistaPriceBounds) => set({ idealistaPriceBounds }),
    compositeVisible: loadBoolKey(COMPOSITE_VISIBLE_KEY, true),
    compositeWeights: loadCompositeWeights(),
    compositeColorRange: [0, 100],
    setCompositeVisible: (visible) => {
      try { localStorage.setItem(COMPOSITE_VISIBLE_KEY, String(visible)) } catch { /* ignore */ }
      set({ compositeVisible: visible })
    },
    setCompositeWeights: (weights) => {
      try { localStorage.setItem(COMPOSITE_WEIGHTS_KEY, JSON.stringify(weights)) } catch { /* ignore */ }
      set({ compositeWeights: weights })
    },
    setCompositeColorRange: (compositeColorRange) => set({ compositeColorRange }),
    contrastBoost: loadBoolKey(CONTRAST_BOOST_KEY),
    setContrastBoost: (contrastBoost) => {
      try { localStorage.setItem(CONTRAST_BOOST_KEY, String(contrastBoost)) } catch { /* ignore */ }
      // Off: the scale is the fixed one at once; on: BuildingsLayer fits it to the view.
      set(contrastBoost ? { contrastBoost } : { contrastBoost, compositeColorRange: [0, 100] })
    },
    compositeRiskStrengths: loadRiskStrengths(),
    setCompositeRiskStrengths: (strengths) => {
      try { localStorage.setItem(COMPOSITE_RISK_STRENGTHS_KEY, JSON.stringify(strengths)) } catch { /* ignore */ }
      set({ compositeRiskStrengths: strengths })
    },
    floodLayerVisible: loadBoolKey(FLOOD_LAYER_KEY),
    setFloodLayerVisible: (visible) => {
      try { localStorage.setItem(FLOOD_LAYER_KEY, String(visible)) } catch { /* ignore */ }
      set({ floodLayerVisible: visible })
    },
    wildfireLayerVisible: loadBoolKey(WILDFIRE_LAYER_KEY),
    setWildfireLayerVisible: (visible) => {
      try { localStorage.setItem(WILDFIRE_LAYER_KEY, String(visible)) } catch { /* ignore */ }
      set({ wildfireLayerVisible: visible })
    },
    streetFloodingLayerVisible: loadBoolKey(STREET_FLOODING_LAYER_KEY),
    setStreetFloodingLayerVisible: (visible) => {
      try { localStorage.setItem(STREET_FLOODING_LAYER_KEY, String(visible)) } catch { /* ignore */ }
      set({ streetFloodingLayerVisible: visible })
    },
    streetFloodingReturnPeriod: 't10',
    setStreetFloodingReturnPeriod: (streetFloodingReturnPeriod) => set({ streetFloodingReturnPeriod }),
    enabledWalkCategories: loadIds(WALK_CATEGORIES_KEY, ALL_WALK_CATEGORY_IDS),
    setEnabledWalkCategories: (ids) => {
      try { localStorage.setItem(WALK_CATEGORIES_KEY, JSON.stringify(ids)) } catch { /* ignore */ }
      set({ enabledWalkCategories: ids })
    },
    ageEras: loadIds(AGE_ERAS_KEY, ALL_AGE_ERA_IDS),
    setAgeEras: (ids) => {
      try { localStorage.setItem(AGE_ERAS_KEY, JSON.stringify(ids)) } catch { /* ignore */ }
      set({ ageEras: ids })
    },
    conditions: loadConditions(),
    setConditions: (conditions) => {
      try { localStorage.setItem(CONDITIONS_KEY, JSON.stringify(conditions)) } catch { /* ignore */ }
      set({ conditions })
    },
    selectedBuilding: null,
    setSelectedBuilding: (selectedBuilding) => set({ selectedBuilding }),
    buildingScores: null,
    setBuildingScores: (buildingScores) => set({ buildingScores }),
  }
})

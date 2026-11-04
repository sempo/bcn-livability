/**
 * Building-level Livability Index data (TODO-046, stage 4): score inputs of every residential building,
 * baked by scripts/build_building_tiles.py into public/data/buildings-scores.bin.gz + buildings-meta.json.
 * Row i is the feature id of building i in buildings.pmtiles.
 */

export interface BuildingArea {
  /** Barri code ('01'…'73', Barcelona) or INE municipality code. */
  code: string
  name: string
  kind: 'barri' | 'muni'
  /** INCASOL sale price, €/m²; null = no data. */
  price: number | null
}

interface Column {
  name: string
  type: 'u8' | 'u16' | 'f32'
  scale: number
  offset: number
  /** Raw value meaning "no data"; null for f32 (NaN). */
  sentinel: number | null
}

export interface BuildingsMeta {
  count: number
  columns: Column[]
  areas: BuildingArea[]
  price_bounds: { p5: number; p95: number }
  /** Walkability category ids (walk_<id> columns). */
  categories: string[]
  /** City Core landmark ids (cc_<id> columns). */
  landmarks: string[]
}

export interface BuildingData {
  meta: BuildingsMeta
  count: number
  /** Decoded columns: value / scale, NaN = no data. */
  cols: Record<string, Float32Array>
}

const ARRAYS = { u8: Uint8Array, u16: Uint16Array, f32: Float32Array } as const

/** Typed-array columns of the scores blob → decoded Float32 columns (NaN for the sentinel). */
export function parseColumns(meta: Pick<BuildingsMeta, 'count' | 'columns'>, buf: ArrayBuffer): Record<string, Float32Array> {
  const cols: Record<string, Float32Array> = {}
  for (const c of meta.columns) {
    const raw = new ARRAYS[c.type](buf, c.offset, meta.count)
    const out = new Float32Array(meta.count)
    for (let i = 0; i < meta.count; i++) {
      const v = raw[i]
      out[i] = c.sentinel !== null && v === c.sentinel ? NaN : v / c.scale
    }
    cols[c.name] = out
  }
  return cols
}

/** The blob is gzipped; a server that already decoded it (Content-Encoding) hands over raw bytes. */
export async function gunzipIfNeeded(buf: ArrayBuffer): Promise<ArrayBuffer> {
  const head = new Uint8Array(buf, 0, Math.min(2, buf.byteLength))
  if (head[0] !== 0x1f || head[1] !== 0x8b) return buf
  return new Response(new Response(buf).body!.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
}

/** Value of a decoded column, null when missing. */
export function valueOf(data: BuildingData, name: string, i: number): number | null {
  const v = data.cols[name]?.[i]
  return v === undefined || Number.isNaN(v) ? null : v
}

/** Populated after loadBuildings() resolves — for synchronous card lookups. */
export let buildingData: BuildingData | null = null

let cache: Promise<BuildingData> | null = null

export function loadBuildings(): Promise<BuildingData> {
  if (cache) return cache
  const base = `${import.meta.env.BASE_URL}data/`
  cache = Promise.all([
    fetch(`${base}buildings-meta.json`).then((r) => {
      if (!r.ok) throw new Error(`Failed to load buildings meta: ${r.status}`)
      return r.json() as Promise<BuildingsMeta>
    }),
    fetch(`${base}buildings-scores.bin.gz`).then((r) => {
      if (!r.ok) throw new Error(`Failed to load building scores: ${r.status}`)
      return r.arrayBuffer()
    }).then(gunzipIfNeeded),
  ])
    .then(([meta, buf]) => {
      buildingData = { meta, count: meta.count, cols: parseColumns(meta, buf) }
      return buildingData
    })
    .catch((err) => {
      cache = null
      throw err
    })
  return cache
}

export function resetBuildingsCache(): void {
  cache = null
  buildingData = null
}

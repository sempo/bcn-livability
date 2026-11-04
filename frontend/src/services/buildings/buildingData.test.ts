import { gzipSync } from 'node:zlib'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { gunzipIfNeeded, loadBuildings, parseColumns, resetBuildingsCache, valueOf, type BuildingsMeta } from './buildingData'

/** Two buildings; the second has no data in any column (sentinels). */
function blob(): { meta: Pick<BuildingsMeta, 'count' | 'columns'>; buf: ArrayBuffer } {
  const buf = new ArrayBuffer(16)
  new Float32Array(buf, 0, 2).set([2.17, NaN])
  new Uint16Array(buf, 8, 2).set([624, 65535])
  new Uint8Array(buf, 12, 2).set([87, 255])
  return {
    meta: {
      count: 2,
      columns: [
        { name: 'lng', type: 'f32', scale: 1, offset: 0, sentinel: null },
        { name: 'lden_avg', type: 'u16', scale: 10, offset: 8, sentinel: 65535 },
        { name: 'walk_park', type: 'u8', scale: 1, offset: 12, sentinel: 255 },
      ],
    },
    buf,
  }
}

describe('parseColumns', () => {
  it('decodes scale and sentinels', () => {
    const { meta, buf } = blob()
    const cols = parseColumns(meta, buf)
    expect(cols.lng[0]).toBeCloseTo(2.17, 5)
    expect(cols.lden_avg[0]).toBeCloseTo(62.4, 5)
    expect(cols.walk_park[0]).toBe(87)
    expect([cols.lng[1], cols.lden_avg[1], cols.walk_park[1]].every(Number.isNaN)).toBe(true)
  })

  it('valueOf turns missing values into null', () => {
    const { meta, buf } = blob()
    const data = { meta: { ...meta, areas: [], price_bounds: { p5: 0, p95: 1 }, categories: [], landmarks: [] }, count: 2, cols: parseColumns(meta, buf) }
    expect(valueOf(data, 'walk_park', 0)).toBe(87)
    expect(valueOf(data, 'walk_park', 1)).toBeNull()
    expect(valueOf(data, 'no_such_column', 0)).toBeNull()
  })
})

describe('gunzipIfNeeded', () => {
  it('inflates gzip and passes raw bytes through (server already decoded them)', async () => {
    const raw = new Uint8Array([1, 2, 3, 4])
    const gz = gzipSync(raw)
    const inflated = await gunzipIfNeeded(gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength))
    expect([...new Uint8Array(inflated)]).toEqual([1, 2, 3, 4])
    const same = await gunzipIfNeeded(raw.buffer)
    expect(same).toBe(raw.buffer)
  })
})

describe('loadBuildings', () => {
  afterEach(() => { vi.unstubAllGlobals(); resetBuildingsCache() })

  it('fetches meta and gzipped scores once', async () => {
    const { meta, buf } = blob()
    const gz = gzipSync(new Uint8Array(buf))
    const fetchMock = vi.fn((url: string) => Promise.resolve(url.endsWith('.json')
      ? new Response(JSON.stringify({ ...meta, areas: [], price_bounds: { p5: 1, p95: 2 }, categories: ['park'], landmarks: [] }))
      : new Response(gz)))
    vi.stubGlobal('fetch', fetchMock)
    const data = await loadBuildings()
    await loadBuildings()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(data.count).toBe(2)
    expect(data.cols.walk_park[0]).toBe(87)
  })
})

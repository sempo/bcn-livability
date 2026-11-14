import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AREA_DESCRIPTIONS, areaDescription } from './areaDescriptions'

describe('area descriptions (TODO-064)', () => {
  const areas = JSON.parse(readFileSync('public/data/areas.geojson', 'utf8')) as {
    features: { properties: { id: string; kind: string } }[]
  }
  const barriCodes = areas.features.filter((f) => f.properties.kind === 'barri').map((f) => f.properties.id.slice(-2))

  it('has an English text for every barri', () => {
    expect(barriCodes).toHaveLength(73)
    for (const code of barriCodes) expect(AREA_DESCRIPTIONS[code]?.en, code).toBeTruthy()
  })
  it('has no text for a code that is not a barri', () => {
    const known = new Set(barriCodes)
    for (const code of Object.keys(AREA_DESCRIPTIONS)) expect(known.has(code), code).toBe(true)
  })
  it('keeps every text to one or two sentences', () => {
    for (const [code, t] of Object.entries(AREA_DESCRIPTIONS)) {
      expect(t.en!.length, code).toBeLessThan(260)
      expect((t.en!.match(/\. [A-Z]/g) ?? []).length, code).toBeLessThanOrEqual(2)
    }
  })
  it('falls back to English for another language and to null for a municipality', () => {
    expect(areaDescription('31', 'es')).toBe(AREA_DESCRIPTIONS['31'].en)
    expect(areaDescription('08001')).toBeNull()
  })
})

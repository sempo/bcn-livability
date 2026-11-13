import { describe, expect, it } from 'vitest'
import { PRESETS } from '../presets'
import { URL_DEFAULTS } from '../../store'
import { decodeConfig } from '../urlConfig'
import type { MatchSummary } from '../match/matchSummary'
import {
  areaShareModel, buildingShareModel, MAX_ROWS, profileOf, shareFileName, streetOnly, wrapLines,
} from './shareImageModel'

const summary = (rows: MatchSummary['rows']): MatchSummary => ({
  met: rows.filter((r) => r.status === 'met').length, total: rows.length, rows,
})

const FAMILY = { id: 'family', name: 'Family' }
const quiet = { id: 'noise', label: 'Quiet', status: 'met', text: '52 dB, under your 58' } as const
const services = { id: 'poiAccess', label: 'Everyday services', status: 'partly', text: '4 of 5 within 10 min' } as const
const budget = { id: 'openPrice', label: 'Budget', status: 'missed', text: '€5,594/m², 57% over your €3,571' } as const

describe('streetOnly', () => {
  it('drops the house number', () => {
    expect(streetOnly('Carrer Perla 20')).toBe('Carrer Perla')
    expect(streetOnly('Carrer Diputacio 279B')).toBe('Carrer Diputacio')
    expect(streetOnly('Passeig de Gràcia 12-14')).toBe('Passeig de Gràcia')
  })
  it('keeps the first street of a corner building', () => {
    expect(streetOnly('Carrer Tenerife 59 · Carrer Torre Dulac 14')).toBe('Carrer Tenerife')
  })
  it('keeps a name that has no number, and a street with s/n', () => {
    expect(streetOnly('Plaça Can Baro')).toBe('Plaça Can Baro')
    expect(streetOnly('Carrer Major s/n')).toBe('Carrer Major')
  })
  it('is null for no address', () => {
    expect(streetOnly(null)).toBeNull()
    expect(streetOnly('')).toBeNull()
  })
})

describe('profileOf', () => {
  it('finds the profile of a preset link', () => {
    for (const p of PRESETS) {
      const s = decodeConfig(`preset:${p.id}`, URL_DEFAULTS)!
      expect(profileOf(s, URL_DEFAULTS)?.id).toBe(p.id)
    }
  })
  it('is null once a limit is changed', () => {
    const s = decodeConfig('preset:family;n:50', URL_DEFAULTS)!
    expect(profileOf(s, URL_DEFAULTS)).toBeNull()
  })
  it('is null for the default settings', () => {
    expect(profileOf(URL_DEFAULTS, URL_DEFAULTS)).toBeNull()
  })
})

describe('buildingShareModel', () => {
  const base = {
    address: 'Carrer Tenerife 59 · Carrer Torre Dulac 14',
    area: { name: 'Can Baró', kind: 'barri' as const },
    score: 83, summary: summary([quiet, services, budget]), riskText: null, profile: FAMILY,
  }

  it('puts the street without the number, the barri and the city', () => {
    const m = buildingShareModel(base)
    expect(m.place).toBe('Carrer Tenerife')
    expect(m.subtitle).toBe('Can Baró, Barcelona')
  })
  it('names a municipality without the city', () => {
    expect(buildingShareModel({ ...base, area: { name: 'Badalona', kind: 'muni' } }).subtitle).toBe('Badalona')
  })
  it('says the other profiles in words too, and falls back to the name', () => {
    expect(buildingShareModel({ ...base, profile: { id: 'remote', name: 'Remote worker' } }).forWhom).toBe('For a remote worker')
    expect(buildingShareModel({ ...base, profile: { id: 'custom', name: 'Nomad' } }).forWhom).toBe('For Nomad')
  })
  it('has no subtitle without an area, and falls back to the barri name without an address', () => {
    expect(buildingShareModel({ ...base, area: null }).subtitle).toBeNull()
    expect(buildingShareModel({ ...base, address: null }).place).toBe('Can Baró')
    expect(buildingShareModel({ ...base, address: null, area: null }).place).toBe('Barcelona')
  })
  it('takes the band and colour of the score', () => {
    expect(buildingShareModel({ ...base, score: 92 }).band).toBe('great')
    expect(buildingShareModel({ ...base, score: 83 })).toMatchObject({ band: 'good', bandLabel: 'Good match', bandColor: '#91cf60' })
    expect(buildingShareModel({ ...base, score: 59 }).band).toBe('partial')
    expect(buildingShareModel({ ...base, score: 20 }).band).toBe('poor')
  })
  it('shows the score as a number and no "Meets N of M" line', () => {
    const m = buildingShareModel(base)
    expect(m.value).toBe('83')
    expect(JSON.stringify(m)).not.toMatch(/Meets/i)
  })
  it('writes "For a family" only with a profile', () => {
    expect(buildingShareModel(base).forWhom).toBe('For a family')
    expect(buildingShareModel({ ...base, profile: null }).forWhom).toBeNull()
  })
  it('gives every condition a row with its status and words', () => {
    const m = buildingShareModel(base)
    expect(m.rows).toEqual([
      { status: 'met', text: 'Quiet: 52 dB, under your 58' },
      { status: 'partly', text: 'Everyday services: 4 of 5 within 10 min' },
      { status: 'missed', text: 'Budget: €5,594/m², 57% over your €3,571' },
    ])
  })
  it('puts a risk row last, and keeps it when the rows are cut', () => {
    const many = summary([quiet, services, budget, { ...quiet, id: 'cityCore', label: 'Centre' }, { ...quiet, id: 'age', label: 'Age' }])
    const m = buildingShareModel({ ...base, summary: many, riskText: 'Risk: −13 points — street flooding' })
    expect(m.rows).toHaveLength(MAX_ROWS)
    expect(m.rows[MAX_ROWS - 1]).toEqual({ status: 'risk', text: 'Risk: −13 points — street flooding' })
  })
  it('cuts to the maximum without a risk row', () => {
    const many = summary([quiet, services, budget, quiet, quiet, quiet])
    expect(buildingShareModel({ ...base, summary: many }).rows).toHaveLength(MAX_ROWS)
  })
  it('keeps a "no data" row as a dash', () => {
    const nodata = { id: 'noise', label: 'Quiet', status: 'nodata', text: 'no data' } as const
    expect(buildingShareModel({ ...base, summary: summary([nodata]) }).rows).toEqual([{ status: 'nodata', text: 'Quiet: no data' }])
  })
})

describe('areaShareModel', () => {
  const rank = { name: 'Gràcia', kind: 'barri' as const, shareGood: 62.4, mean: 70, strongest: ['noise', 'poiAccess'] as const }

  it('shows the share of good homes as a percent', () => {
    const m = areaShareModel({ rank: { ...rank, strongest: [...rank.strongest] }, profile: FAMILY })
    expect(m).toMatchObject({ kind: 'area', place: 'Gràcia', subtitle: 'Barcelona', value: '62%', forWhom: 'For a family' })
    expect(m.caption).toBe('of homes are a good match')
  })
  it('colours the plaque by the mean score', () => {
    expect(areaShareModel({ rank: { ...rank, strongest: [] }, profile: null }).bandColor).toBe('#91cf60')
    expect(areaShareModel({ rank: { ...rank, mean: 90, strongest: [] }, profile: null }).bandColor).toBe('#1a9850')
  })
  it('lists what the area is best at as met rows', () => {
    const m = areaShareModel({ rank: { ...rank, strongest: [...rank.strongest] }, profile: null })
    expect(m.rows).toEqual([
      { status: 'met', text: 'Strong on: Quiet' },
      { status: 'met', text: 'Strong on: Everyday services' },
    ])
    expect(m.forWhom).toBeNull()
  })
  it('names a municipality as the metro area', () => {
    expect(areaShareModel({ rank: { ...rank, kind: 'muni', strongest: [] }, profile: null }).subtitle).toBe('Metro area')
  })
})

describe('shareFileName', () => {
  it('is a plain lower-case file name', () => {
    expect(shareFileName('Carrer Tenerife', 'png')).toBe('barcelona-livability-carrer-tenerife.png')
    expect(shareFileName('Vila de Gràcia', 'jpg')).toBe('barcelona-livability-vila-de-gracia.jpg')
    expect(shareFileName('', 'png')).toBe('barcelona-livability.png')
  })
})

describe('wrapLines', () => {
  const width = (s: string) => s.length * 10
  it('breaks at spaces to fit the width', () => {
    expect(wrapLines('aaa bbb ccc ddd', 80, width, 5)).toEqual(['aaa bbb', 'ccc ddd'])
  })
  it('cuts the last line with an ellipsis at the maximum number of lines', () => {
    const lines = wrapLines('aaa bbb ccc ddd eee fff', 70, width, 2)
    expect(lines).toHaveLength(2)
    expect(lines[1].endsWith('…')).toBe(true)
    expect(width(lines[1])).toBeLessThanOrEqual(70)
  })
  it('keeps one long word on its line', () => {
    expect(wrapLines('abcdefghijkl', 50, width, 3)[0]).toContain('abcde')
  })
  it('returns no lines for an empty text', () => {
    expect(wrapLines('', 100, width, 2)).toEqual([])
  })
})

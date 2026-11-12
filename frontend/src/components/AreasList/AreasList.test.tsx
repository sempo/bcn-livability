import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { AreasList } from './AreasList'
import { useStore } from '../../store'
import { useSearchStore } from '../../store/searchStore'
import type { AreaRank } from '../../services/areas/areaRank'
import type { AreaFeature } from '../../services/areas'

const polygon = (name: string): AreaFeature => ({
  type: 'Feature',
  properties: { id: name, name, kind: 'barri' },
  geometry: { type: 'Polygon', coordinates: [[[2, 41], [2.1, 41], [2.1, 41.1], [2, 41.1], [2, 41]]] },
})

let join: Map<number, AreaFeature> | null = null
vi.mock('../../hooks/useAreaJoin', () => ({ useAreaJoin: () => join }))

const rank = (i: number, extra: Partial<AreaRank> = {}): AreaRank => ({
  index: i, code: String(i), name: `Area ${i}`, kind: 'barri', n: 500, mean: 80 - i, shareGood: 90 - i * 3,
  shareGreat: 20, strongest: ['noise', 'openPrice', 'poiAccess'], ranked: true, ...extra,
})
const ranks = Array.from({ length: 12 }, (_, i) => rank(i))

describe('AreasList', () => {
  beforeEach(() => {
    join = new Map(ranks.map((r) => [r.index, polygon(r.name)]))
    useSearchStore.setState({ selection: null })
    useStore.setState({ areaRanks: ranks })
  })

  it('shows the top 10 in rank order with what each area is best at', () => {
    render(<AreasList />)
    const rows = screen.getAllByRole('button', { name: /of homes are a good match/ })
    expect(rows).toHaveLength(10)
    expect(rows[0].getAttribute('aria-label')).toBe('1. Area 0, 90% of homes are a good match')
    expect(screen.getByText('Top 10 of 12 areas, by the share of homes that fit.')).toBeTruthy()
    expect(screen.getAllByText('quiet').length).toBe(10)
    expect(screen.getAllByText('budget').length).toBe(10)
  })

  it('"Show all" lists every ranked area', () => {
    render(<AreasList />)
    fireEvent.click(screen.getByRole('button', { name: 'Show all 12' }))
    expect(screen.getAllByRole('button', { name: /of homes are a good match/ })).toHaveLength(12)
    expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull()
  })

  it('a click flies to the area: it becomes the search selection', () => {
    render(<AreasList />)
    fireEvent.click(screen.getByRole('button', { name: /^2\. Area 1/ }))
    const sel = useSearchStore.getState().selection
    expect(sel?.kind).toBe('area')
    expect(sel?.label).toBe('Area 1')
    if (sel?.kind === 'area') expect(sel.bounds).toEqual([2, 41, 2.1, 41.1])
  })

  it('an area without a polygon cannot be flown to', () => {
    join = new Map(ranks.filter((r) => r.index !== 0).map((r) => [r.index, polygon(r.name)]))
    render(<AreasList />)
    const first = screen.getByRole('button', { name: /^1\. Area 0/ }) as HTMLButtonElement
    expect(first.disabled).toBe(true)
    fireEvent.click(first)
    expect(useSearchStore.getState().selection).toBeNull()
  })

  it('names the areas with too few homes instead of ranking them', () => {
    act(() => useStore.setState({ areaRanks: [rank(0), rank(1, { name: 'Tiny', ranked: false, n: 3 })] }))
    render(<AreasList />)
    expect(screen.getAllByRole('button', { name: /of homes are a good match/ })).toHaveLength(1)
    expect(screen.getByText('Too few homes to rank: Tiny.')).toBeTruthy()
    expect(screen.getByText('All 1 areas, by the share of homes that fit.')).toBeTruthy()
  })

  it('says so before the homes are scored and when nothing can be ranked', () => {
    act(() => useStore.setState({ areaRanks: null }))
    const { rerender } = render(<AreasList />)
    expect(screen.getByText('Scoring the homes…')).toBeTruthy()
    act(() => useStore.setState({ areaRanks: [] }))
    rerender(<AreasList />)
    expect(screen.getByText(/No areas to rank yet/)).toBeTruthy()
  })

  it('works before the polygons have loaded (rows are shown, not clickable)', () => {
    join = null
    render(<AreasList />)
    expect((screen.getAllByRole('button', { name: /of homes/ })[0] as HTMLButtonElement).disabled).toBe(true)
  })

  it('calls an area a municipality when it is one', () => {
    act(() => useStore.setState({ areaRanks: [rank(0, { kind: 'muni', name: 'Badia', strongest: [] })] }))
    render(<AreasList />)
    expect(screen.getByText('municipality')).toBeTruthy()
  })
})

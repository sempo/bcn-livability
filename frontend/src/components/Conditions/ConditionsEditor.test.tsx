import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, fireEvent, act, within } from '@testing-library/react'
import { ConditionsEditor } from './ConditionsEditor'
import { useStore } from '../../store'
import { renderWithMantine, resetStore } from './testUtils'

vi.mock('../../hooks/useBudgetShares', () => ({ useBudgetShares: () => undefined }))

describe('ConditionsEditor', () => {
  beforeEach(resetStore)

  it('lists the conditions that are on, numbered in priority order', () => {
    renderWithMantine(<ConditionsEditor />)
    const rows = screen.getAllByLabelText(/^Priority \d$/)
    expect(rows.map((r) => r.textContent)).toEqual(['1', '2', '3', '4', '5'])
    expect(screen.getByText(/outside my window/)).toBeTruthy()
    expect(screen.getByText(/flood and wildfire risk/)).toBeTruthy()
  })

  it('follows the stored order', () => {
    act(() => useStore.setState({ conditionOrder: ['openPrice', 'noise', 'poiAccess', 'cityCore', 'risk'] }))
    renderWithMantine(<ConditionsEditor />)
    const first = screen.getAllByLabelText(/^Priority \d$/)[0].parentElement!
    expect(within(first).getByText(/flat costs up to/)).toBeTruthy()
  })

  it('× turns a condition off in one update and keeps the others in order', () => {
    renderWithMantine(<ConditionsEditor />)
    let updates = 0
    const unsub = useStore.subscribe(() => { updates++ })
    fireEvent.click(screen.getByRole('button', { name: 'Remove Centre' }))
    unsub()
    expect(updates).toBe(1)
    expect(useStore.getState().compositeWeights.cityCore).toBe(0)
    expect(useStore.getState().conditionOrder).toEqual(['noise', 'poiAccess', 'openPrice', 'risk'])
    expect(screen.queryByText(/The centre|My \d+ places/)).toBeNull()
  })

  it('× on risks sets every strength to zero', () => {
    renderWithMantine(<ConditionsEditor />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Risks' }))
    expect(useStore.getState().compositeRiskStrengths).toEqual({ flood: 0, fire: 0, street: 0 })
  })

  it('a chip adds a condition at the end of the order', () => {
    act(() => useStore.setState({ compositeWeights: { ...useStore.getState().compositeWeights, cityCore: 0 }, conditionOrder: ['noise', 'poiAccess', 'openPrice', 'risk'] }))
    renderWithMantine(<ConditionsEditor />)
    fireEvent.click(screen.getByRole('button', { name: '+ Close to the centre' }))
    expect(useStore.getState().compositeWeights.cityCore).toBe(1)
    expect(useStore.getState().conditionOrder).toEqual(['noise', 'poiAccess', 'openPrice', 'risk', 'cityCore'])
    expect(screen.queryByRole('button', { name: '+ Close to the centre' })).toBeNull()
  })

  it('the risk chip turns on "Avoid"', () => {
    act(() => useStore.setState({ compositeRiskStrengths: { flood: 0, fire: 0, street: 0 }, conditionOrder: ['noise', 'poiAccess', 'cityCore', 'openPrice'] }))
    renderWithMantine(<ConditionsEditor />)
    fireEvent.click(screen.getByRole('button', { name: '+ Avoid risks' }))
    expect(useStore.getState().compositeRiskStrengths).toEqual({ flood: 5, fire: 5, street: 5 })
  })

  it('with nothing on it says so and offers every chip', () => {
    act(() => useStore.setState({
      compositeWeights: { poiAccess: 0, noise: 0, cityCore: 0, openPrice: 0, localsOpinion: 0, age: 0 },
      compositeRiskStrengths: { flood: 0, fire: 0, street: 0 }, conditionOrder: [],
    }))
    renderWithMantine(<ConditionsEditor />)
    expect(screen.getByText(/No conditions yet/)).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^\+ / })).toHaveLength(7)
  })

  it('shows the match bar once the map has scores', () => {
    renderWithMantine(<ConditionsEditor />)
    expect(screen.queryByRole('img', { name: /Homes by match/ })).toBeNull()
    act(() => useStore.setState({ buildingScores: Uint8Array.from([100, 100, 50, 0]) }))
    expect(screen.getByRole('img', { name: 'Homes by match: Great 50%, Good 0%, Partial 25%, Poor 25%' })).toBeTruthy()
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, fireEvent, act } from '@testing-library/react'
import { SentenceRow } from './SentenceRow'
import { useStore } from '../../store'
import { renderWithMantine, resetStore } from './testUtils'

vi.mock('../../hooks/useBudgetShares', () => ({
  useBudgetShares: () => (limit: number) => Math.round(limit / 100),
}))

const pick = (word: string | RegExp, option: string | RegExp) => {
  fireEvent.click(screen.getByRole('button', { name: word }))
  fireEvent.click(screen.getByRole('radio', { name: option }))
}

describe('SentenceRow', () => {
  beforeEach(resetStore)

  it('noise: shows the word for the limit and sets the limit from a step', () => {
    renderWithMantine(<SentenceRow condition="noise" />)
    expect(screen.getByText(/No louder than/).textContent).toBe('No louder than normal city noise outside my window')
    pick('normal city noise', /a calm street/)
    expect(useStore.getState().conditions.noiseMaxDb).toBe(58)
    expect(JSON.parse(localStorage.getItem('bcn_conditions')!).noiseMaxDb).toBe(58)
    expect(screen.getByRole('button', { name: 'a calm street' })).toBeTruthy()
  })

  it('shows an exact number for a value between the steps, and "Custom" is ticked', () => {
    useStore.setState({ conditions: { ...useStore.getState().conditions, noiseMaxDb: 62 } })
    renderWithMantine(<SentenceRow condition="noise" />)
    fireEvent.click(screen.getByRole('button', { name: '62 dB' }))
    expect(screen.getByRole('radio', { name: /Custom/ }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByLabelText('Custom value')).toBeTruthy()
  })

  it('"Custom…" opens a slider that sets any value in the range', () => {
    renderWithMantine(<SentenceRow condition="noise" />)
    fireEvent.click(screen.getByRole('button', { name: 'normal city noise' }))
    fireEvent.click(screen.getByRole('radio', { name: /Custom/ }))
    fireEvent.keyDown(screen.getByLabelText('Custom value'), { key: 'ArrowLeft' })
    expect(useStore.getState().conditions.noiseMaxDb).toBe(64)
    expect(screen.getByRole('button', { name: '64 dB' })).toBeTruthy()
  })

  it('on foot: services word and minutes word', () => {
    renderWithMantine(<SentenceRow condition="poiAccess" />)
    expect(screen.getByRole('button', { name: 'Everyday services' })).toBeTruthy()
    pick('10 min', '5 min')
    expect(useStore.getState().conditions.walkMaxMin).toBe(5)
  })

  it('services: a checklist that keeps at least one service', () => {
    renderWithMantine(<SentenceRow condition="poiAccess" />)
    fireEvent.click(screen.getByRole('button', { name: 'Everyday services' }))
    fireEvent.click(screen.getByLabelText('Park'))
    expect(useStore.getState().enabledWalkCategories).not.toContain('park')
    expect(screen.getByRole('button', { name: /My 9 services/ })).toBeTruthy()
    act(() => useStore.setState({ enabledWalkCategories: ['park'] }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Park' }))
    expect(useStore.getState().enabledWalkCategories).toEqual(['park'])
  })

  it('centre: places word and minutes word', () => {
    renderWithMantine(<SentenceRow condition="cityCore" />)
    expect(screen.getByRole('button', { name: 'The centre' })).toBeTruthy()
    pick('30 min', '15 min')
    expect(useStore.getState().conditions.cityCoreMaxMin).toBe(15)
    act(() => useStore.setState({ enabledLandmarkIds: ['sagrada', 'barceloneta', 'glories'] }))
    expect(screen.getByRole('button', { name: 'My 3 places' })).toBeTruthy()
  })

  it('budget: every step says how many homes it covers', () => {
    renderWithMantine(<SentenceRow condition="openPrice" />)
    fireEvent.click(screen.getByRole('button', { name: '€4,000/m²' }))
    expect(screen.getByRole('radio', { name: /€3,500\/m².*≈ 35% of homes/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: /€2,500\/m²/ }))
    expect(useStore.getState().conditions.priceMaxEurM2).toBe(2500)
  })

  it('locals: sets the satisfaction limit', () => {
    renderWithMantine(<SentenceRow condition="localsOpinion" />)
    expect(screen.getByRole('button', { name: '7.5' })).toBeTruthy()
    pick('7.5', /8\.0/)
    expect(useStore.getState().conditions.localsMin).toBe(8)
  })

  it('eras: any era by default, a checklist of the five eras', () => {
    renderWithMantine(<SentenceRow condition="age" />)
    fireEvent.click(screen.getByRole('button', { name: 'any era' }))
    fireEvent.click(screen.getByLabelText(/Historic/))
    expect(useStore.getState().ageEras).not.toContain('before-1900')
    expect(screen.getByRole('button', { name: '4 eras' })).toBeTruthy()
  })

  it('risk: Avoid / Strongly avoid set all three strengths', () => {
    renderWithMantine(<SentenceRow condition="risk" />)
    expect(screen.getByRole('button', { name: 'Avoid' })).toBeTruthy()
    pick('Avoid', 'Strongly avoid')
    expect(useStore.getState().compositeRiskStrengths).toEqual({ flood: 8, fire: 8, street: 8 })
    expect(screen.getByRole('button', { name: 'Strongly avoid' })).toBeTruthy()
  })

  it('risk: tuned strengths read "Custom"', () => {
    useStore.setState({ compositeRiskStrengths: { flood: 2, fire: 9, street: 0 } })
    renderWithMantine(<SentenceRow condition="risk" />)
    expect(screen.getByRole('button', { name: 'Custom' })).toBeTruthy()
  })
})

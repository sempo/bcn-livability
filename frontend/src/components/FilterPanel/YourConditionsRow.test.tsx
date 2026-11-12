import { describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent, act } from '@testing-library/react'
import { YourConditionsRow } from './YourConditionsRow'
import { useStore } from '../../store'
import { renderWithMantine, resetStore } from '../Conditions/testUtils'

describe('YourConditionsRow', () => {
  beforeEach(() => { resetStore(); useStore.setState({ onboardingOpen: false, onboarded: true }) })

  it('names the conditions in priority order', () => {
    act(() => useStore.setState({ conditionOrder: ['openPrice', 'noise', 'poiAccess', 'cityCore', 'risk'] }))
    renderWithMantine(<YourConditionsRow />)
    expect(screen.getByText('Your conditions')).toBeTruthy()
    expect(screen.getByText('Budget · Quiet · On foot · Centre · Risks')).toBeTruthy()
  })

  it('"Change" opens the onboarding again', () => {
    renderWithMantine(<YourConditionsRow />)
    fireEvent.click(screen.getByRole('button', { name: 'Change' }))
    expect(useStore.getState().onboardingOpen).toBe(true)
    expect(useStore.getState().onboarded).toBe(true)
  })

  it('says "none" when no condition is on', () => {
    act(() => useStore.setState({
      compositeWeights: { poiAccess: 0, noise: 0, cityCore: 0, openPrice: 0, localsOpinion: 0, age: 0 },
      compositeRiskStrengths: { flood: 0, fire: 0, street: 0 },
    }))
    renderWithMantine(<YourConditionsRow />)
    expect(screen.getByText('none')).toBeTruthy()
  })
})

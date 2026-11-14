import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { OnboardingPanel } from './OnboardingPanel'
import { useStore } from '../../store'
import { PRESETS, profileName } from '../../services/presets'
import { renderWithMantine, resetStore } from '../Conditions/testUtils'

vi.mock('../../hooks/useBudgetShares', () => ({ useBudgetShares: () => undefined }))

describe('OnboardingPanel', () => {
  beforeEach(resetStore)

  it('first screen: the four profiles, build your own and skip', () => {
    renderWithMantine(<OnboardingPanel />)
    expect(screen.getByRole('heading', { name: 'Where in Barcelona would you like to live?' })).toBeTruthy()
    for (const p of PRESETS) expect(screen.getByRole('button', { name: new RegExp(`^${profileName(p)}`) })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Build your own' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Just show me the map' })).toBeTruthy()
  })

  it('a profile fills the sentence and applies its settings once', () => {
    renderWithMantine(<OnboardingPanel />)
    let updates = 0
    const unsub = useStore.subscribe(() => { updates++ })
    fireEvent.click(screen.getByRole('button', { name: /^Family/ }))
    unsub()
    expect(updates).toBe(1)
    const st = useStore.getState()
    expect(st.conditions.noiseMaxDb).toBe(58)
    expect(st.conditions.priceMaxEurM2).toBe(3571.43) // a 70 m² flat up to €250,000
    expect(screen.getByRole('button', { name: '€250,000' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '70 m²' })).toBeTruthy()
    expect(st.compositeWeights.cityCore).toBe(0)
    expect(st.conditionOrder).toEqual(['noise', 'poiAccess', 'openPrice', 'risk'])
    expect(screen.getByText('Family profile')).toBeTruthy()
    expect(screen.getByText(/outside my window/)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /Where in Barcelona/ })).toBeNull()
  })

  it('build your own starts with quiet, on foot and budget at the defaults', () => {
    renderWithMantine(<OnboardingPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Build your own' }))
    const st = useStore.getState()
    expect(st.conditionOrder).toEqual(['noise', 'poiAccess', 'openPrice'])
    expect(st.compositeWeights).toMatchObject({ noise: 1, poiAccess: 1, openPrice: 1, cityCore: 0 })
    expect(st.compositeRiskStrengths).toEqual({ flood: 0, fire: 0, street: 0 })
    expect(screen.queryByText(/ profile$/)).toBeNull()
  })

  it('"Show me the map" finishes the onboarding and keeps the settings', () => {
    renderWithMantine(<OnboardingPanel />)
    fireEvent.click(screen.getByRole('button', { name: /^City life/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Show me the map' }))
    expect(useStore.getState().onboardingOpen).toBe(false)
    expect(localStorage.getItem('bcn_onboarded')).toBe('true')
    expect(useStore.getState().conditions.cityCoreMaxMin).toBe(15)
  })

  it('"Just show me the map" keeps the defaults and finishes', () => {
    renderWithMantine(<OnboardingPanel />)
    const before = useStore.getState().conditions
    fireEvent.click(screen.getByRole('button', { name: 'Just show me the map' }))
    expect(useStore.getState().conditions).toBe(before)
    expect(useStore.getState().onboardingOpen).toBe(false)
    expect(localStorage.getItem('bcn_onboarded')).toBe('true')
  })

  it('Back returns to the profiles', () => {
    renderWithMantine(<OnboardingPanel />)
    fireEvent.click(screen.getByRole('button', { name: /^Investor/ }))
    fireEvent.click(screen.getByRole('button', { name: '‹ Back' }))
    expect(screen.getByRole('heading', { name: /Where in Barcelona/ })).toBeTruthy()
  })

  it('two taps reach the map from a profile', () => {
    renderWithMantine(<OnboardingPanel />)
    fireEvent.click(screen.getByRole('button', { name: /^Remote worker/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Show me the map' }))
    expect(useStore.getState().onboardingOpen).toBe(false)
  })

  it('profiles differ in what they switch on', () => {
    renderWithMantine(<OnboardingPanel />)
    fireEvent.click(screen.getByRole('button', { name: /^Family/ }))
    const family = useStore.getState().compositeWeights
    fireEvent.click(screen.getByRole('button', { name: '‹ Back' }))
    fireEvent.click(screen.getByRole('button', { name: /^City life/ }))
    expect(useStore.getState().compositeWeights).not.toEqual(family)
  })
})

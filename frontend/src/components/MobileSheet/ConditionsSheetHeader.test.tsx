import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ConditionsSheetHeader } from './ConditionsSheetHeader'
import { useStore } from '../../store'
import { useSheetStore } from '../../store/sheetStore'

const WEIGHTS = { poiAccess: 1, noise: 1, cityCore: 0, openPrice: 1 }

describe('ConditionsSheetHeader', () => {
  beforeEach(() => {
    useStore.setState({ compositeWeights: WEIGHTS, compositeRiskStrengths: { flood: 0, fire: 0, street: 0 } })
    useSheetStore.setState({ position: 'peek', tab: 'settings', pickedArea: null, restore: null, mapInset: 0 })
  })

  it('lists the conditions that are on at peek', () => {
    render(<ConditionsSheetHeader />)
    expect(screen.getByText('Quiet · On foot · Budget')).toBeInTheDocument()
    expect(screen.getByText('Swipe up to change them')).toBeInTheDocument()
  })

  it('invites to add a condition when none is on', () => {
    useStore.setState({ compositeWeights: { poiAccess: 0, noise: 0, cityCore: 0, openPrice: 0 } })
    render(<ConditionsSheetHeader />)
    expect(screen.getByText('No conditions yet')).toBeInTheDocument()
    expect(screen.getByText('Swipe up to add one')).toBeInTheDocument()
  })

  it('becomes a title with the conditions under it once the sheet is open', () => {
    useSheetStore.setState({ position: 'half' })
    render(<ConditionsSheetHeader />)
    expect(screen.getByText('Your conditions')).toBeInTheDocument()
    expect(screen.getByText('Quiet · On foot · Budget')).toBeInTheDocument()
  })

  it('names the areas tab', () => {
    useSheetStore.setState({ tab: 'areas' })
    render(<ConditionsSheetHeader />)
    expect(screen.getByText('Your areas')).toBeInTheDocument()
  })

  it('shows a picked area at peek and goes back to the list', () => {
    useSheetStore.setState({ tab: 'areas', pickedArea: { name: 'Verdun', share: 100 } })
    render(<ConditionsSheetHeader />)
    expect(screen.getByText('Verdun')).toBeInTheDocument()
    expect(screen.getByText('100% of homes are a good match')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to the list' }))
    expect(useSheetStore.getState()).toMatchObject({ position: 'half', tab: 'areas', pickedArea: null })
  })

  it('follows the conditions as they change', () => {
    render(<ConditionsSheetHeader />)
    act(() => useStore.setState({ compositeRiskStrengths: { flood: 5, fire: 0, street: 0 } }))
    expect(screen.getByText('Quiet · On foot · Budget · Risks')).toBeInTheDocument()
  })
})

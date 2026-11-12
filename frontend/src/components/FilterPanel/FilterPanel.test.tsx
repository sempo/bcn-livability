import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { FilterPanel } from './FilterPanel'

vi.mock('../../store', () => ({
  useStore: vi.fn(() => ({
    minutes: 30,
    setMinutes: vi.fn(),
    noiseLayerVisible: false,
    setNoiseLayerVisible: vi.fn(),
  })),
}))

vi.mock('../NoiseLayer/NoiseLegend', () => ({
  NoiseLegend: () => <div data-testid="noise-legend" />,
}))

vi.mock('../IdealistaPricesLayer/IdealistaPricesControls', () => ({
  IdealistaPricesControls: () => <div data-testid="idealista-prices-controls" />,
}))

vi.mock('./ClimateLayerControls', () => ({
  ClimateLayerControls: () => <div data-testid="climate-layer-controls" />,
}))

vi.mock('../AreasList/AreasList', () => ({
  AreasList: () => <div data-testid="areas-list" />,
}))

vi.mock('./YourConditionsRow', () => ({
  YourConditionsRow: () => <div data-testid="your-conditions" />,
}))

vi.mock('./CompositeControls', () => ({
  CompositeControls: () => <div data-testid="composite-controls" />,
}))

vi.mock('@mantine/core', async () => {
  const actual = await vi.importActual<typeof import('@mantine/core')>('@mantine/core')
  return {
    ...actual,
    Modal: ({ opened, onClose, children }: { opened: boolean; onClose: () => void; children: React.ReactNode }) =>
      opened ? (
        <div role="dialog">
          <button aria-label="Close" onClick={onClose} />
          {children}
        </div>
      ) : null,
  }
})

describe('FilterPanel', () => {
  it('renders commute heading and info button', () => {
    render(<MantineProvider><FilterPanel /></MantineProvider>)
    expect(screen.getByText('Commute from work')).toBeTruthy()
    expect(screen.getByLabelText('About the commute zone')).toBeTruthy()
  })

  it('opens the isochrone info modal on info button click', () => {
    render(<MantineProvider><FilterPanel /></MantineProvider>)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByLabelText('About the commute zone'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('What the zone shows')).toBeTruthy()
  })

  it('closes the modal via onClose', () => {
    render(<MantineProvider><FilterPanel /></MantineProvider>)
    fireEvent.click(screen.getByLabelText('About the commute zone'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Close'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders noise areas switch', () => {
    render(<MantineProvider><FilterPanel /></MantineProvider>)
    expect(screen.getByLabelText('Noise areas')).toBeTruthy()
  })

  it('renders the climate-risk layer toggles', () => {
    render(<MantineProvider><FilterPanel /></MantineProvider>)
    expect(screen.getByTestId('climate-layer-controls')).toBeTruthy()
  })

  it('has a "Your areas" tab that swaps the settings for the ranked list and back (TODO-051)', () => {
    render(<MantineProvider><FilterPanel /></MantineProvider>)
    expect(screen.queryByTestId('areas-list')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Your areas' }))
    expect(screen.getByTestId('areas-list')).toBeTruthy()
    expect(screen.queryByLabelText('Noise areas')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Settings' }))
    expect(screen.getByLabelText('Noise areas')).toBeTruthy()
    expect(screen.queryByTestId('areas-list')).toBeNull()
  })
})

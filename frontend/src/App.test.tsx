import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import App from './App'
import { useStore } from './store'

vi.mock('@mantine/core', async () => {
  const actual = await vi.importActual<typeof import('@mantine/core')>('@mantine/core')
  return {
    ...actual,
    Drawer: ({
      opened,
      children,
      title,
      onClose,
    }: {
      opened: boolean
      children: React.ReactNode
      title: string
      onClose: () => void
    }) =>
      opened ? (
        <div role="dialog" aria-label={title}>
          <button onClick={onClose}>close</button>
          {children}
        </div>
      ) : null,
  }
})

vi.mock('maplibre-gl', () => ({
  setWorkerUrl: vi.fn(),
  Map: vi.fn(function () {
    return { addControl: vi.fn(), on: vi.fn(), remove: vi.fn() }
  }),
  NavigationControl: vi.fn(function () { return {} }),
  AttributionControl: vi.fn(function () { return {} }),
  Marker: vi.fn(function () {
    return { setLngLat: vi.fn().mockReturnThis(), addTo: vi.fn().mockReturnThis(), remove: vi.fn() }
  }),
}))

vi.mock('./hooks/useIsochrone', () => ({
  useIsochrone: vi.fn().mockReturnValue({ isLoading: false }),
}))

function renderApp() {
  return render(
    <MantineProvider>
      <App />
    </MantineProvider>,
  )
}

describe('App (integration)', () => {
  beforeEach(() => {
    useStore.setState({
      workplace: [2.1687, 41.3874],
      minutes: 60,
      resultPolygon: null,
      onboardingOpen: false,
      onboarded: true,
    })
    vi.spyOn(window.history, 'replaceState')
  })

  it('renders without crashing', () => {
    expect(() => renderApp()).not.toThrow()
  })

  it('renders the map container', () => {
    const { container } = renderApp()
    expect(container.querySelector('[style*="width: 100%"]')).toBeTruthy()
  })

  it('renders the filter panel with title', () => {
    renderApp()
    expect(screen.getByText('Commute from work')).toBeInTheDocument()
  })

  it('renders the search box', () => {
    renderApp()
    expect(screen.getByPlaceholderText('Search a neighbourhood or address')).toBeInTheDocument()
  })

  it('renders the travel time slider label', () => {
    renderApp()
    expect(screen.getByText(/Travel time by public transport/)).toBeInTheDocument()
  })

  it('syncs default state to URL on mount', () => {
    renderApp()
    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      expect.stringContaining('minutes=60'),
    )
  })
})

describe('App (integration) - first visit (TODO-031)', () => {
  beforeEach(() => {
    localStorage.clear()
    useStore.setState({
      workplace: [2.1687, 41.3874], minutes: 60, resultPolygon: null,
      onboardingOpen: true, onboarded: false,
    })
  })

  it('shows the onboarding instead of the filter panel, with the search box still there', () => {
    renderApp()
    expect(screen.getByRole('heading', { name: 'Where in Barcelona would you like to live?' })).toBeInTheDocument()
    expect(screen.queryByText('Commute from work')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search a neighbourhood or address')).toBeInTheDocument()
  })

  it('a profile and "Show me the map" lead to the filter panel with "Your conditions"', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: /^Family/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Show me the map' }))
    expect(screen.queryByRole('heading', { name: /Where in Barcelona/ })).not.toBeInTheDocument()
    expect(screen.getByText('Commute from work')).toBeInTheDocument()
    expect(screen.getByText('Your conditions')).toBeInTheDocument()
    expect(screen.getByText('Quiet · On foot · Budget · Risks')).toBeInTheDocument()
  })

  it('"Change" brings the onboarding back', () => {
    useStore.setState({ onboardingOpen: false, onboarded: true })
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Change' }))
    expect(screen.getByRole('heading', { name: /Where in Barcelona/ })).toBeInTheDocument()
  })

  it('does not show for a returning visitor', () => {
    useStore.setState({ onboardingOpen: false, onboarded: false })
    renderApp()
    expect(screen.queryByRole('heading', { name: /Where in Barcelona/ })).not.toBeInTheDocument()
  })
})

describe('App (integration) - mobile', () => {
  beforeEach(() => {
    useStore.setState({
      workplace: [2.1687, 41.3874],
      minutes: 60,
      resultPolygon: null,
      onboardingOpen: false,
      onboarded: true,
    })
    vi.spyOn(window.history, 'replaceState')
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('max-width'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('opens drawer when filter button is clicked', () => {
    renderApp()
    const toggleBtn = screen.getByRole('button', { name: /open filters/i })
    fireEvent.click(toggleBtn)
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument()
  })

  it('closes drawer via close button', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: /open filters/i }))
    const closeBtn = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeBtn)
    expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument()
  })

  it('first visit: the onboarding is a sheet over the map and the filter button waits', () => {
    useStore.setState({ onboardingOpen: true, onboarded: false })
    const { container } = renderApp()
    expect(container.querySelector('.onboarding-sheet')).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Where in Barcelona/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /open filters/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Just show me the map' }))
    expect(container.querySelector('.onboarding-sheet')).toBeNull()
    expect(screen.getByRole('button', { name: /open filters/i })).toBeInTheDocument()
  })
})

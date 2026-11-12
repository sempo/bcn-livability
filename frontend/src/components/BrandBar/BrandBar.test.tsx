import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrandBar } from './BrandBar'
import { useSearchStore } from '../../store/searchStore'

describe('BrandBar', () => {
  it('renders the time2map mark and the "Barcelona livability map" h1', () => {
    render(<BrandBar />)
    expect(screen.getByAltText('time2map')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Barcelona livability map' }),
    ).toBeInTheDocument()
  })

  it('links the mark to time2map.com', () => {
    render(<BrandBar />)
    const link = screen.getByRole('link', { name: /time2map/i })
    expect(link).toHaveAttribute('href', 'https://time2map.com')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('has a search button to the right of the title that toggles the search field', () => {
    useSearchStore.setState({ open: false })
    render(<BrandBar />)
    const button = screen.getByRole('button', { name: 'Search an area or address' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(button)
    expect(useSearchStore.getState().open).toBe(true)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(button)
    expect(useSearchStore.getState().open).toBe(false)
  })
})

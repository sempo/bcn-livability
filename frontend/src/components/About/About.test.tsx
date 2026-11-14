import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MapCredit } from './MapCredit'
import { AboutDialog, CONTACT } from './AboutDialog'
import { BrandBar } from '../BrandBar/BrandBar'
import { useAboutStore } from '../../store/aboutStore'
import { DATA_SOURCES, visibleSources } from '../../services/dataSources'
import { features } from '../../features'

vi.mock('../../services/buildings/buildingData', () => ({
  loadBuildingsMeta: () => Promise.resolve({ generated: '2026-11-04', sources: { catastro: '2026-05-21' } }),
}))

const wrap = (ui: React.ReactElement) => render(<MantineProvider>{ui}</MantineProvider>)

describe('MapCredit', () => {
  it('names ICGC, OpenStreetMap contributors and the Catastro, each linked to its source', () => {
    render(<MapCredit />)
    expect(screen.getByRole('link', { name: '© ICGC' })).toHaveAttribute('href', expect.stringContaining('icgc.cat'))
    expect(screen.getByRole('link', { name: '© OpenStreetMap contributors' }))
      .toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
    expect(screen.getByRole('link', { name: '© Dirección General del Catastro' })).toBeInTheDocument()
  })

  it('opens the data sources dialog', () => {
    useAboutStore.setState({ open: false })
    render(<MapCredit />)
    fireEvent.click(screen.getByRole('button', { name: 'Data sources' }))
    expect(useAboutStore.getState().open).toBe(true)
  })
})

describe('AboutDialog', () => {
  beforeEach(() => useAboutStore.setState({ open: true }))

  it('lists every source in use with its licence, and the contact', async () => {
    wrap(<AboutDialog />)
    const dialog = await screen.findByRole('dialog')
    const expected = visibleSources({ facadePhoto: features.facadePhoto, commercialUse: features.commercialUse })
    for (const s of expected) {
      const row = dialog.querySelector(`[data-source="${s.id}"]`) as HTMLElement
      expect(row, s.id).not.toBeNull()
      expect(row).toHaveTextContent(s.licence.name)
    }
    expect(within(dialog).getByRole('link', { name: CONTACT.email })).toHaveAttribute('href', `mailto:${CONTACT.email}`)
    expect(dialog).toHaveTextContent(CONTACT.name)
  })

  it('shows the fetch date of a source, and says the data is not official or endorsed', async () => {
    wrap(<AboutDialog />)
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(/2026-05-21/)).toBeInTheDocument()
    expect(dialog).toHaveTextContent(/not affiliated with, and not endorsed by/)
    expect(dialog).toHaveTextContent(/not official cadastral information/i)
    expect(dialog).toHaveTextContent(/ODbL 1\.0/)
  })

  it('says that street flooding has no licence', async () => {
    wrap(<AboutDialog />)
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent(/no licence stated/i)
  })

  it('has a row for each registry source in the test build', () => {
    expect(DATA_SOURCES.length).toBeGreaterThan(10)
  })
})

describe('BrandBar menu', () => {
  it('holds Share, About and the languages behind one button, and closes on Escape', () => {
    render(<BrandBar />)
    expect(screen.queryByRole('button', { name: 'Share this map' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.getByRole('button', { name: 'Share this map' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Español' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('button', { name: 'Share this map' })).toBeNull()
  })

  it('About is always one tap away and opens the dialog', () => {
    useAboutStore.setState({ open: false })
    render(<BrandBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'About and data sources' }))
    expect(useAboutStore.getState().open).toBe(true)
  })
})

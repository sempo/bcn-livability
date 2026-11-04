import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { useStore, DEFAULT_COMPOSITE_WEIGHTS } from '../../store'
import type { BuildingData } from '../../services/buildings/buildingData'
import type { BuildingDetailResult } from '../../services/buildings/buildingDetail'

/** Building 0: Eixample block in el Raval's barri, water at the door. Building 1: student residence outside BCN (SICA). */
const DATA: BuildingData = {
  meta: {
    count: 2, columns: [], price_bounds: { p5: 2000, p95: 6000 },
    areas: [{ code: '01', name: 'el Raval', kind: 'barri', price: 4200 }, { code: '08015', name: 'Badalona', kind: 'muni', price: 2500 }],
    categories: ['supermarket', 'park'], landmarks: ['sagrada'],
  },
  count: 2,
  cols: {
    lng: Float32Array.from([2.16, 2.24]), lat: Float32Array.from([41.39, 41.45]),
    walk_supermarket: Float32Array.from([90, 30]), walk_park: Float32Array.from([80, 20]),
    cc_sagrada: Float32Array.from([12, 45]), lden_avg: Float32Array.from([64, 60]),
    area: Float32Array.from([0, 1]), river_zone: Float32Array.from([500, NaN]),
    fire_wui: Float32Array.from([0, 0]), fire_hazard: Float32Array.from([0, 0]),
    street_t10_cm: Float32Array.from([12, NaN]), street_t100_cm: Float32Array.from([35, NaN]),
  },
}

const DETAILS: BuildingDetailResult[] = [
  {
    detail: {
      i: 0, id: '0123456DF2802C', address: 'CL ARAGO 255; RB CATALUNYA 30', use: '1_residential',
      dwellings: 24, units: 30, floors: 7, floors_below: 1, year_built: 1890, year_renov: 1995, area_m2: 3200,
      noise_src: 'bcn_raster_2022', lden_avg: 64.2, ln_avg: 56, lden_street: 71.4, ln_street: 63,
      lden_inner: 52, ln_inner: 44, lden_max: 72, lden_min: 50,
      river_zone: 500, street_t10_cm: 12, street_t100_cm: 35, min_supermarket: 3,
    },
    facades: [
      { lng: 2.16, lat: 41.39, side: 'inner', dir: 'NE', length_m: 18, lden: 52, ln: 44 },
      { lng: 2.16, lat: 41.39, side: 'street', dir: 'SW', length_m: 21, lden: 72, ln: 63 },
    ],
  },
  {
    detail: { i: 1, id: '9999999DF3899A', use: '4_3_publicServices', student: 1, noise_src: 'sica_2022', lden_avg: 60 },
    facades: [],
  },
]

vi.mock('../../services/buildings/buildingData', async (orig) => ({
  ...(await orig<typeof import('../../services/buildings/buildingData')>()),
  get buildingData() { return DATA },
}))
vi.mock('../../services/buildings/buildingDetail', () => ({
  loadBuildingDetail: vi.fn((i: number) => Promise.resolve(DETAILS[i])),
}))
vi.mock('../../services/buildings/catastroUnits', async (orig) => ({
  ...(await orig<typeof import('../../services/buildings/catastroUnits')>()),
  loadCatastroUnits: vi.fn(() => Promise.resolve([
    { floor: '-1', use: 'Almacen-Estacionamiento' }, { floor: '00', use: 'Residencial' },
  ])),
}))
vi.mock('../../services/localsOpinion/localsOpinion', async (orig) => {
  const problems = {
    insecurity: 43.7, cleanliness: 10.4, noise: 8.4, housing: 3.1, tourism: 2.8,
    incivility: 5.4, drugs_squats: 8.3, maintenance: 1.5, parking: 0.3, traffic: 0.1,
  }
  return {
    ...(await orig<typeof import('../../services/localsOpinion/localsOpinion')>()),
    barriVibeData: {
      years: '2022–2026',
      city: { satisf: 7.85, stay: 54.7, problems },
      barris: { '01': { name: 'el Raval', n: 770, lowN: false, satisf: 6.55, satisfAdj: 6.55, stay: 35.6, delta: -0.6, problems } },
    },
  }
})

import { BuildingCard } from './BuildingCard'

async function renderCard(i: number | null) {
  useStore.setState({ selectedBuilding: i })
  const view = render(<MantineProvider><BuildingCard /></MantineProvider>)
  await act(async () => {})
  return view
}

describe('BuildingCard (TODO-046)', () => {
  beforeEach(() => {
    useStore.setState({
      compositeWeights: DEFAULT_COMPOSITE_WEIGHTS, enabledWalkCategories: ['supermarket', 'park'],
      enabledLandmarkIds: ['sagrada'], compositeRiskStrengths: { flood: 5, fire: 5, street: 5 },
      compositeColorRange: [0, 100],
    })
  })

  it('renders nothing without a selected building', async () => {
    await renderCard(null)
    expect(screen.queryByText('Livability')).not.toBeInTheDocument()
  })

  it('shows the address, Catastro facts, photo and link', async () => {
    await renderCard(0)
    expect(screen.getByText('Carrer Arago 255 · Rambla Catalunya 30')).toBeInTheDocument()
    expect(screen.getByText('Residential')).toBeInTheDocument()
    expect(screen.getByText('24 · 6 other premises')).toBeInTheDocument()
    expect(screen.getByText('7 + 1 below ground')).toBeInTheDocument()
    expect(screen.getByText('parking / storage')).toBeInTheDocument() // what is below ground, from Catastro units
    expect(screen.getByText('1890 · renovated 1995')).toBeInTheDocument()
    expect(screen.getByRole('img').getAttribute('src')).toContain('ReferenciaCatastral=0123456DF2802C')
    expect(screen.getByText('Photo © Dirección General del Catastro')).toBeInTheDocument()
    expect(screen.getByText(/Open in Catastro/).getAttribute('href')).toContain('rc1=0123456&rc2=DF2802C')
  })

  it('shows facade noise by side and direction, walking minutes', async () => {
    await renderCard(0)
    expect(screen.getByText('Street side: 71 dB · night 63')).toBeInTheDocument()
    expect(screen.getByText('Courtyard side: 52 dB · night 44')).toBeInTheDocument()
    expect(screen.getByText(/Street · faces SW · 21 m — 72 dB/)).toBeInTheDocument()
    expect(screen.getByText('3 min')).toBeInTheDocument()
    expect(screen.getByText('none nearby')).toBeInTheDocument() // park: no minutes in the detail
  })

  it('warns about ground floors and explains the water at the door', async () => {
    await renderCard(0)
    expect(screen.getByText(/Careful if you are looking at a ground-floor flat.*1 floor below ground/)).toBeInTheDocument()
    expect(screen.getByText(/12 cm in a 10-year rain, 35 cm in a 100-year rain/)).toBeInTheDocument()
    expect(screen.getByText(/500-year river flood zone/)).toBeInTheDocument()
  })

  it('labels price and Locals’ opinion as barri-level', async () => {
    await renderCard(0)
    expect(screen.getByText('Barri-level')).toBeInTheDocument()
    expect(document.body.textContent).toMatch(/4[.,]200 €\/m²/)
    expect(screen.getByText('What locals say')).toBeInTheDocument()
  })

  it('student residence outside Barcelona: SICA note, municipality level', async () => {
    await renderCard(1)
    expect(screen.getByText('Student residence')).toBeInTheDocument()
    expect(screen.getByText(/Different official model \(SICA 2022/)).toBeInTheDocument()
    expect(screen.getByText('Municipality-level')).toBeInTheDocument()
    expect(screen.getByText('Not available outside Barcelona city')).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    await renderCard(0)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useStore.getState().selectedBuilding).toBeNull()
  })
})

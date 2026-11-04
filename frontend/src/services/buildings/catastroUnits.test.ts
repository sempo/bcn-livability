import { describe, it, expect, vi } from 'vitest'
import { belowGroundUses, loadCatastroUnits, parseUnits } from './catastroUnits'

const unit = (pt: string, luso: string) => ({ dt: { locs: { lous: { lourb: { loint: { pt, pu: '01' } } } } }, debi: { luso } })
const piece = (pt: string | undefined, lcd: string) => ({ lcd, dt: { lourb: { loint: pt ? { pt } : {} } } })

describe('Catastro units (TODO-046)', () => {
  it('reads a building of several properties: use per property', () => {
    const units = parseUnits({ consulta_dnprcResult: { lrcdnp: { rcdnp: [
      unit('-2', 'Almacen-Estacionamiento'), unit('-1', 'Almacen-Estacionamiento'), unit('00', 'Residencial'),
    ] } } })
    expect(units).toEqual([
      { floor: '-2', use: 'Almacen-Estacionamiento' }, { floor: '-1', use: 'Almacen-Estacionamiento' },
      { floor: '00', use: 'Residencial' },
    ])
    expect(belowGroundUses(units)).toEqual(['parking / storage'])
  })

  it('reads a single property: use per built piece', () => {
    const units = parseUnits({ consulta_dnprcResult: { bico: { lcons: [
      piece('-1', 'APARCAMIENTO'), piece('SS', 'VIVIENDA'), piece('ST', 'ALMACEN'), piece('-2', 'ELEMENTOS COMUNES'),
      piece('00', 'COMERCIO'), piece(undefined, 'ELEMENTOS COMUNES'),
    ] } } })
    expect(belowGroundUses(units)).toEqual(['parking', 'dwellings', 'storage'])
  })

  it('unknown uses pass through in lower case; nothing below ground → empty', () => {
    expect(belowGroundUses([{ floor: '-1', use: 'Deportivo' }])).toEqual(['deportivo'])
    expect(belowGroundUses([{ floor: '01', use: 'Residencial' }])).toEqual([])
    expect(parseUnits({ consulta_dnprcResult: { control: { cuerr: 1 } } })).toEqual([])
  })
})

describe('loadCatastroUnits', () => {
  it('fetches once per reference and retries after a failure', async () => {
    const ok = { consulta_dnprcResult: { lrcdnp: { rcdnp: [{ dt: { locs: { lous: { lourb: { loint: { pt: '-1' } } } } }, debi: { luso: 'Residencial' } }] } } }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(ok) })
    vi.stubGlobal('fetch', fetchMock)
    await expect(loadCatastroUnits('7207523DF2870G')).rejects.toThrow('Catastro DNPRC 503')
    await expect(loadCatastroUnits('7207523DF2870G')).resolves.toEqual([{ floor: '-1', use: 'Residencial' }])
    await loadCatastroUnits('7207523DF2870G')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toContain('Consulta_DNPRC?RefCat=7207523DF2870G')
    vi.unstubAllGlobals()
  })
})

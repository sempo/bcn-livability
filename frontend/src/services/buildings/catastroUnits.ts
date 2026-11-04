/**
 * What is on each floor of a building, from Catastro's open DNPRC service (TODO-046). INSPIRE only counts the
 * floors below ground; this tells a car park from flats. One call per card; the service is CORS-open.
 */
const DNPRC_URL = 'https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/Consulta_DNPRC'

export interface CatastroUnit {
  /** Catastro floor code: '-1', '00', '01', 'SS' (semi-basement), 'AT' (attic)… */
  floor: string
  use: string
}

interface Dnprc {
  consulta_dnprcResult?: {
    /** Several properties: one use per property. */
    lrcdnp?: { rcdnp?: { dt?: { locs?: { lous?: { lourb?: { loint?: { pt?: string } } } } }; debi?: { luso?: string } }[] }
    /** A single property: one use per built piece. */
    bico?: { lcons?: { lcd?: string; dt?: { lourb?: { loint?: { pt?: string } } } }[] }
    [key: string]: unknown
  }
}

export function parseUnits(json: Dnprc): CatastroUnit[] {
  const r = json.consulta_dnprcResult
  const many = r?.lrcdnp?.rcdnp?.map((u) => ({ floor: u.dt?.locs?.lous?.lourb?.loint?.pt ?? '', use: u.debi?.luso ?? '' }))
  return many ?? r?.bico?.lcons?.map((c) => ({ floor: c.dt?.lourb?.loint?.pt ?? '', use: c.lcd ?? '' })) ?? []
}

// Property uses ('Almacen-Estacionamiento' is one class: Catastro does not split parking from storage rooms)
// and built-piece uses (upper case).
const USE: Record<string, string> = {
  'Almacen-Estacionamiento': 'parking / storage', APARCAMIENTO: 'parking', ALMACEN: 'storage',
  Residencial: 'dwellings', VIVIENDA: 'dwellings', Comercial: 'shops', COMERCIO: 'shops',
  Oficinas: 'offices', OFICINAS: 'offices', 'Ocio y Hosteleria': 'bars / hotels', Industrial: 'industrial',
}
const BELOW_GROUND = /^-|^S[ST]$/

/** Distinct uses of the floors below ground, common areas left out. */
export function belowGroundUses(units: CatastroUnit[]): string[] {
  return [...new Set(units
    .filter((u) => BELOW_GROUND.test(u.floor) && u.use && u.use !== 'ELEMENTOS COMUNES')
    .map((u) => USE[u.use] ?? u.use.toLowerCase()))]
}

const cache = new Map<string, Promise<CatastroUnit[]>>()

export function loadCatastroUnits(ref: string): Promise<CatastroUnit[]> {
  let p = cache.get(ref)
  if (!p) {
    p = fetch(`${DNPRC_URL}?RefCat=${encodeURIComponent(ref)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Catastro DNPRC ${r.status}`)
        return r.json() as Promise<Dnprc>
      })
      .then(parseUnits)
    p.catch(() => cache.delete(ref))
    cache.set(ref, p)
  }
  return p
}

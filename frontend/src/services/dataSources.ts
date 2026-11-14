/**
 * Registry of every data source the app uses (TODO-066, docs/DATA_LICENSES.md). The map credit, the "Data sources"
 * modal, the legends and the cards read their credits from here, so a source is named in one place only.
 *
 * Names of publishers, datasets and licences are proper names: they are not translated. What we changed in the data
 * is a sentence and lives in `locales/<lang>/legal.json` under `sources.<id>.changed`.
 */

export interface SourceLicence {
  name: string
  /** Absent only where there is no licence to link (street flooding). */
  url?: string
}

export interface DataSource {
  id: string
  publisher: string
  dataset: string
  licence: SourceLicence
  /** Where the data comes from (publisher's page). */
  url: string
  /** A fixed edition or year of the dataset. Falls back to the fetch date from `buildings-meta.json`. */
  edition?: string
  /** Baked into the building files: dated by the date they were built when no fetch date is known. */
  inBuildingFiles?: boolean
  /** True when `locales/<lang>/legal.json` has `sources.<id>.changed`: we transform the data. */
  changed?: boolean
  /** Layer components (`*Layer.tsx`) that show it, for the attribution test. */
  layers: string[]
  /** `needs-terms`: not safe for a commercial launch without extra terms (docs/DATA_LICENSES.md). */
  commercial?: 'ok' | 'needs-terms'
  /** Shown only while the feature behind it is on. */
  feature?: 'facadePhoto'
  /** Switched off when `VITE_COMMERCIAL_USE=true`. */
  offInCommercial?: boolean
}

const CC_BY = { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' }
const ODBL = { name: 'ODbL 1.0', url: 'https://opendatacommons.org/licenses/odbl/1-0/' }
const GENCAT = {
  name: 'Llicència oberta d’ús d’informació – Catalunya',
  url: 'https://web.gencat.cat/ca/generalitat/dades-indicadors/dades-obertes/llicencies',
}

export const DATA_SOURCES: readonly DataSource[] = [
  {
    id: 'catastro',
    inBuildingFiles: true,
    publisher: 'Dirección General del Catastro',
    dataset: 'INSPIRE Buildings, Addresses, Cadastral Parcels',
    licence: { name: 'CC BY 4.0 (DG Catastro)', url: 'https://www.idee.es/csw-codsi-idee/srv/api/records/ES_SDGC_BU' },
    url: 'https://www.catastro.hacienda.gob.es/webinspire/index.html',
    changed: true, layers: ['BuildingsLayer'], commercial: 'needs-terms',
  },
  {
    id: 'catastro-photo',
    publisher: 'Dirección General del Catastro',
    dataset: 'Facade photo (Sede Electrónica del Catastro)',
    licence: { name: 'No stated terms' },
    url: 'https://www.sedecatastro.gob.es/', layers: [], feature: 'facadePhoto', commercial: 'needs-terms',
  },
  {
    id: 'noise-bcn',
    publisher: 'Ajuntament de Barcelona',
    dataset: 'Strategic Noise Map (Mapa estratègic de soroll)',
    licence: CC_BY, url: 'https://opendata-ajuntament.barcelona.cat/data/en/dataset/isofones-mapa-estrategic-soroll',
    edition: '2022', changed: true, layers: ['NoiseLayer'], commercial: 'ok',
  },
  {
    id: 'noise-sica',
    publisher: 'MITECO, Sistema de Información sobre Contaminación Acústica (SICA)',
    dataset: 'Strategic noise maps, 4th round (outside Barcelona)',
    licence: CC_BY, url: 'https://sicaweb.cedex.es/',
    edition: '2022', changed: true, layers: [], commercial: 'ok',
  },
  {
    id: 'esm',
    publisher: 'Ajuntament de Barcelona, Oficina Municipal de Dades',
    dataset: 'Enquesta de Serveis Municipals (residents’ survey)',
    licence: CC_BY, url: 'https://opendata-ajuntament.barcelona.cat/data/en/dataset/esm-bcn-evo',
    edition: '2022–2026', changed: true, layers: [], commercial: 'ok',
  },
  {
    id: 'prices',
    inBuildingFiles: true,
    publisher: 'Generalitat de Catalunya, Agència de l’Habitatge de Catalunya / INCASOL',
    dataset: 'Sale prices per m² (preus de venda)',
    licence: GENCAT, url: 'https://habitatge.gencat.cat/ca/dades/',
    changed: true, layers: [], commercial: 'ok',
  },
  {
    id: 'flood-aca',
    inBuildingFiles: true,
    publisher: 'Generalitat de Catalunya, Agència Catalana de l’Aigua',
    dataset: 'River flood zones T10 / T100 / T500',
    licence: GENCAT, url: 'https://aca.gencat.cat/ca/inici/',
    changed: true, layers: ['FloodZonesLayer'], commercial: 'ok',
  },
  {
    id: 'wildfire',
    publisher: 'Generalitat de Catalunya, Departament d’Agricultura; Protecció Civil de Catalunya',
    dataset: 'Basic wildfire hazard map 2024; wildland-urban interface zones',
    licence: GENCAT, url: 'https://agricultura.gencat.cat/ca/ambits/medi-natural/incendis-forestals/',
    edition: '2024', changed: true, layers: ['WildfireLayer'], commercial: 'ok',
  },
  {
    id: 'street-flooding',
    inBuildingFiles: true,
    publisher: 'Ajuntament de Barcelona, BCASA / Aquatec (RESCCUE project)',
    dataset: 'Street flooding depth in heavy rain, Atles de resiliència',
    licence: { name: 'No licence stated (all rights reserved)' },
    url: 'https://coneixement-eu.bcn.cat/widget/atles-resiliencia/en_index_resccue_inun_urbana.html',
    changed: true, layers: ['StreetFloodingLayer'], commercial: 'needs-terms', offInCommercial: true,
  },
  {
    id: 'osm',
    inBuildingFiles: true,
    publisher: 'OpenStreetMap contributors',
    dataset: 'Walking network, shops, services, parks, places',
    licence: ODBL, url: 'https://www.openstreetmap.org/copyright',
    changed: true, layers: ['PoiLayer', 'WalkabilityLayer'], commercial: 'ok',
  },
  {
    id: 'icgc',
    publisher: 'Institut Cartogràfic i Geològic de Catalunya (ICGC)',
    dataset: 'ContextMaps base map; municipality outlines',
    licence: CC_BY, url: 'https://www.icgc.cat/en/Tools-and-viewers/Viewers/ContextMaps', layers: [], commercial: 'ok',
  },
  {
    id: 'openmaptiles',
    publisher: 'OpenMapTiles, OpenFreeMap',
    dataset: 'Base map outside Catalonia and fallback base map',
    licence: ODBL, url: 'https://openfreemap.org/', layers: [], commercial: 'ok',
  },
  {
    id: 'mapterhorn',
    publisher: 'Mapterhorn (Copernicus GLO-30, CNIG MDT)',
    dataset: 'Terrain and hillshade',
    licence: { name: 'Copernicus; CC BY 4.0 scne.es (CNIG)', url: 'https://download.mapterhorn.com/attribution.json' },
    url: 'https://mapterhorn.com/', layers: [], commercial: 'needs-terms',
  },
  {
    id: 'areas',
    publisher: 'Ajuntament de Barcelona (CartoBCN); ICGC',
    dataset: 'Districts, barris and municipality outlines',
    licence: CC_BY, url: 'https://opendata-ajuntament.barcelona.cat/data/en/dataset/20170706-districtes-barris',
    layers: ['AreasLayer'], commercial: 'ok',
  },
  {
    id: 'tmb',
    publisher: 'Transports Metropolitans de Barcelona (TMB)',
    dataset: 'Metro lines and stations',
    licence: { name: 'TMB open-data licence (free, non-exclusive; cite source and update date)', url: 'https://developer.tmb.cat/docs/terms-conditions' },
    url: 'https://developer.tmb.cat/', edition: 'live from the TMB API', layers: ['MetroLayer'], commercial: 'ok',
  },
  {
    id: 'fgc',
    publisher: 'Ferrocarrils de la Generalitat de Catalunya (FGC)',
    dataset: 'Lines and stations (GTFS)',
    licence: { name: 'Licence not stated' },
    url: 'https://www.fgc.cat/en/', layers: ['FgcLayer'], commercial: 'needs-terms', offInCommercial: true,
  },
  {
    id: 'geoapify',
    publisher: 'Geoapify',
    dataset: 'Address search and autocomplete (data © OpenStreetMap contributors)',
    licence: { name: 'Geoapify Free plan terms', url: 'https://www.geoapify.com/terms-and-conditions/' },
    url: 'https://www.geoapify.com/', layers: [], commercial: 'needs-terms',
  },
]

export const COMMERCIAL_REVIEW_IDS = DATA_SOURCES.filter((s) => s.commercial === 'needs-terms').map((s) => s.id)

export function sourceById(id: string): DataSource | undefined {
  return DATA_SOURCES.find((s) => s.id === id)
}

export { MAP_CREDIT } from './mapCredit'

export interface SourceDates {
  generated?: string
  /** Fetch date per source id, written by the pipeline scripts. */
  sources?: Record<string, string>
}

/** Edition of the dataset, else the date the pipeline fetched it, else (if baked into the building files) their build date. */
export function sourceDate(source: DataSource, meta: SourceDates | undefined): string | undefined {
  return source.edition ?? meta?.sources?.[source.id] ?? (source.inBuildingFiles ? meta?.generated : undefined)
}

export interface SourceFlags {
  facadePhoto: boolean
  commercialUse: boolean
}

/** Sources that are in use in this build: switched-off features and, in commercial mode, risky layers drop out. */
export function visibleSources(flags: SourceFlags): DataSource[] {
  return DATA_SOURCES.filter((s) => {
    if (s.feature === 'facadePhoto' && !flags.facadePhoto) return false
    if (s.offInCommercial && flags.commercialUse) return false
    return true
  })
}

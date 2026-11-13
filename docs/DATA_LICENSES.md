# Data sources and licences

Checked against the code and the publishers' terms on 2026-11-12. If the code adds or drops a source, update this file.
This is a technical review, not legal advice. Items marked **verify** were not confirmed from a primary source; the
two "high" risks below are worth a short consultation with a Spanish IP / open-data lawyer before any paid or
B2B use.

## 1. Summary

**Most of the map can be used in a commercial product.** The core data (Catastro buildings, Barcelona noise
maps, the residents' survey, Generalitat prices and climate layers, ICGC base map, OpenStreetMap) is published
under open licences: CC BY 4.0, the Generalitat open-information licence, or ODbL. All of them allow commercial
use. All of them **require attribution**, and some add more conditions: don't alter the meaning, state the update
date, don't imply endorsement, and share-alike for OSM.

**What is wrong today:**

| # | Problem | Risk | Fix |
|---|---|---|---|
| 1 | **Attribution is missing for most sources.** `attributionControl: false` in `Map.tsx`; the panel shows only the base-map credit. The `attribution` strings of the noise, flood, wildfire, street-flooding and POI sources are never rendered. Catastro (the buildings layer itself), OSM-derived walkability, the ESM survey, SICA noise, area boundaries, TMB, FGC and Mapterhorn terrain are not credited anywhere visible. On mobile the panel is in a drawer, so the map has no visible credit at all. | **High** (cheap to fix) | Data-sources line on the map + "Data sources" modal (section 6) |
| 2 | **Street flooding (RESCCUE, Atles de resiliència)** has no licence. It is fetched from the Ajuntament's CARTO account with a read key taken from the public viewer. The product owner accepted the risk in 037. | **High** | Ask the Ajuntament for permission, or for publication on Open Data BCN; until then, consider switching the layer and the penalty off for commercial use |
| 3 | **OSM share-alike (ODbL).** `barcelona_poi.pmtiles` is an OSM extract, so it is a derivative database. The `min_*` / `cc_*` columns in `buildings-scores.bin.gz` are computed from OSM and are probably one too. Both are public files, but nothing says they are under ODbL. | **Medium** | Declare those files (the OSM-derived part) as ODbL, link the licence, offer the data on request (section 5.3) |
| 4 | **TMB metro layer.** The app calls the TMB API from the browser with keys built into the public bundle. TMB grants its data licence per application, on approval; the terms could not be read without a login. | **Medium** | Read the terms in the developer portal; confirm that public web use and a static copy (TODO-055) are allowed; credit TMB |
| 5 | **FGC lines and stations** (`fgc-*.geojson`, from FGC GTFS). The licence is not stated on the portal; its "terms" link leads to the website's legal notice, which forbids commercial reuse of *web content*. The datasets on datos.gob.es point to the Generalitat licences page. | **Medium** (verify) | Confirm the GTFS licence with FGC, or draw the lines from OSM |
| 6 | **Municipality outlines** in `areas.geojson` come from Opendatasoft `georef-spain-municipio`. Licence not confirmed. | **Low** | Use the ICGC municipalities (CC BY 4.0) that `fetch_incasol_sale_catalonia.py` already downloads |
| 7 | **Catastro facade photo** (flag off): hotlinked, no stated terms. | Low while off | Keep off until Catastro confirms |
| 8 | **Idealista scrape** (`idealista_prices.geojson`, flag off, gitignored). Scraping breaks Idealista's terms, and its listings are a protected database (EU sui generis right). | **High if published**, none while local | Never ship it; keep it out of git and production |

**Fines, concretely.** Spain's reuse law (Ley 37/2007, art. 11) fines reuse of **State** information (here:
Catastro, MITECO/SICA, CNIG): €1,000–10,000 for not citing the source, not giving the update date, or slight
alteration; €10,001–50,000 for reuse without a required licence or a serious breach; €50,001–100,000 for
distorting the meaning. A ban on reuse for 1–5 years can be added. For the Generalitat, the Ajuntament, OSM and
private providers the realistic consequence is **losing the licence** (with it, the right to use the data) and a
civil claim (copyright or database right). We found no separate fine regime for them. Under CC BY 4.0 the rights
come back automatically if the breach is cured within 30 days of discovery. So **fixing attribution quickly**
(item 1) removes most of the exposure.

## 2. Licences in play

| Licence | Who uses it here | Commercial | Main conditions |
|---|---|---|---|
| **CC BY 4.0** | Catastro INSPIRE (metadata), Open Data BCN, ICGC, SICA (metadata), CNIG terrain | yes | credit the source; link the licence; say if you changed it; no implied endorsement |
| **Llicència oberta d'ús d'informació – Catalunya** (Generalitat default) | ACA, Agricultura (wildfire), INCASOL / habitatge, probably FGC | yes (not restricted) | cite "Generalitat de Catalunya. Departament de …"; **give the date of the last update**; don't alter or distort; no Generalitat logos; no sublicensing |
| **Open Data BCN terms** (CC BY 4.0 + art. 8 of Ley 37/2007) | noise, ESM survey, barris | yes | "Source of the data: Barcelona City Council"; identify changes; no suggestion of Council support |
| **Catastro INSPIRE licence v1.0 (2016)** | buildings, addresses, parcels | yes, **for transformed information only** | see 5.1 |
| **ODbL 1.0** | OpenStreetMap (POI, walking network, basemap outside Catalonia, OpenFreeMap) | yes | "© OpenStreetMap contributors", visible on the map; a public derivative database must be offered under ODbL |
| **No licence** | RESCCUE street flooding, Catastro facade photo | — | all rights reserved by default |
| **Service terms** | TMB API, Geoapify, Catastro web services (SEC), OpenFreeMap, Mapterhorn | per service | keys, rate limits, attribution |

## 3. Inventory

### 3.1 Public product: files we build and serve (`frontend/public/`)

| File | Content | Source (script) | Publisher, licence | Conditions met? |
|---|---|---|---|---|
| `data/buildings.pmtiles`, `buildings-detail.pmtiles`, `buildings-scores.bin.gz`, `buildings-positions.bin.gz`, `buildings-meta.json` | ~174k residential buildings: footprints, cadastral ref, address, use, dwellings, floors, year built / renovated, area, condition | Catastro INSPIRE ATOM, province 08: BU, AD, CP (`prepare_buildings.py`, `fetch_exposure_sources.py`) | Dirección General del Catastro. CODSI metadata (2026-05): **CC BY 4.0 "DG Catastro"**, high-value dataset. The linked licence PDF v1.0 (2016) is stricter (5.1) | ✗ no credit for the buildings layer; the card only credits the (flagged) photo |
| same files: `lden_avg`, card noise fields, facade points | noise at the facade | Barcelona: Open Data BCN `rasters-mapa-estrategic-soroll` 2022 (+ 2017 facades for validation). Other municipalities: SICA / MITECO, 4th round (2022) agglomeration maps | Barcelona: **CC BY 4.0** (confirmed in CKAN). SICA: **CC BY 4.0** in the INSPIRE metadata of the 3rd round; 4th round **verify** | ✗ not credited (only the noise view layer's legend credits Open Data BCN) |
| same files: `min_<category>`, `cc_<landmark>` | walking minutes to services and City Core places | OpenStreetMap, Geofabrik / BBBike extract (`building_access.py`) | **ODbL 1.0** | ✗ no OSM credit for this use; not declared ODbL (5.3) |
| same files: student residences | filter only | OSM | ODbL | as above |
| same files: `river_zone` | ACA flood zones T10 / T100 / T500 | `sig.gencat.cat/ows/AIGUA/wfs` (`fetch_climate_risk.py`) | ACA, Generalitat. The WFS states no constraints, so the Generalitat default licence applies (**verify** per layer) | partial: credited in the view layer's legend only, no update date |
| same files: `street_t10_cm`, `street_t100_cm` | water depth at the door | RESCCUE via CARTO `urbisadmin` (`fetch_climate_risk.py`) | Ajuntament de Barcelona / BCASA / Aquatec, **no licence** | ✗ (5.2) |
| same files: `fire_hazard`, `fire_wui` | wildfire hazard 2024, WUI zones | Generalitat, Agricultura (`PERILLBASICINCENDI.zip`); Protecció Civil via ICGC geoservei | Generalitat default licence; ICGC CC BY 4.0 | partial (legend of the view layer) |
| `buildings-meta.json` → `areas[].price` | INCASOL sale price €/m² per barri / municipality | `habitatge.gencat.cat` XLSX (`fetch_incasol_sale_prices.py`, `fetch_incasol_sale_catalonia.py`) | Generalitat (Agència de l'Habitatge / INCASOL), Generalitat default licence (**verify**: the site's own legal notice was not reachable) | partial: "Generalitat official data", no year |
| `data/barri-vibe.json` | residents' satisfaction, intention to stay, top problems per barri | Open Data BCN `esm-bcn-evo` (`build_neighbourhood_vibe.py`) | Ajuntament de Barcelona, Oficina Municipal de Dades. **CC BY 4.0** (confirmed in CKAN); anonymised microdata | ✗ no "Source: Barcelona City Council"; our shrinkage changes the values and is not labelled as such |
| `data/noise.pmtiles` | Lden isophones 2022 | Open Data BCN `isofones-mapa-estrategic-soroll` (`prepare-noise-data.sh`) | **CC BY 4.0** | ✓ in the legend; ✗ on the map |
| `data/flood-zones.pmtiles`, `wildfire.pmtiles` | view layers | as `river_zone`, `fire_*` | as above | legend ✓, map ✗, update date ✗ |
| `data/street-flooding.pmtiles` | view layer | RESCCUE | **no licence** | legend says "No explicit open-data license" |
| `data/areas.geojson` | districts, barris, AMB municipalities | barris / districtes: `martgnz/bcn-geodata` (MIT repo; data from Ajuntament / CartoBCN, CC BY). Municipalities: Opendatasoft `georef-spain-municipio` | CC BY via the Ajuntament; Opendatasoft **verify** | ✗ |
| `data/landmark-geometries.json` | not used by the app | Nominatim / Overpass, i.e. OSM | ODbL | delete it (see ARCHITECTURE "Known leftovers") |
| `barcelona_poi.pmtiles` | POI icons; walkability of pins | OSM PBF (`extract_poi.py`) | **ODbL** | ✗ (5.3) |
| `fgc-lines.geojson`, `fgc-stations.geojson` | FGC lines and stations | FGC GTFS `fgc.cat/google/google_transit.zip` | FGC; licence not stated (**verify**) | ✗ |
| `basemap/icgc-standard.json` | our copy of ICGC's style `icgc_mapa_estandard_general` (TODO-058), byte for byte as ICGC serves it; the tiles, fonts and icons still come from ICGC | `npm run update:basemap` (`scripts/update-basemap-style.mjs`) | ICGC, **CC BY 4.0**: redistribution allowed with credit; unchanged, so nothing to mark as modified | ✓ the credit is in the style's `sources` and shown in the panel; ✗ on mobile (item 1); the Mapterhorn terrain source has no credit (3.2) |
| `data/area-start.json` (written by `npm run build` into `dist/`, not in git) | the area view of a first visit: area → polygon, and the area ranks for the default settings (TODO-058) | computed from the building files and `areas.geojson` (`scripts/build-area-start.mjs`) | derived from all the score inputs: same terms as the building files (Catastro, noise, prices, climate) and ODbL for the OSM-derived part, as `min_*` / `cc_*` above | as the building files |
| `og-image.jpg` | screenshot of the map | ours (contains ICGC / OSM cartography) | — | low: add a small credit when it is regenerated |

### 3.2 Public product: services the browser calls

| Service | Use | Terms | Status |
|---|---|---|---|
| ICGC ContextMaps / Mapa Base: tiles, glyphs, sprites, terrain | base map | **CC BY 4.0**; outside Catalonia © OpenMapTiles © OpenStreetMap (ODbL). No key, no stated limits | ✓ credit shown in the panel (desktop); ✗ not visible on mobile |
| Mapterhorn `tiles.mapterhorn.com` (source `terrainMapZen` of the ICGC style) | terrain / hillshade | tiles from Copernicus GLO-30 and CNIG MDT ("CC-BY 4.0 scne.es"); code BSD-3; no stated terms for the endpoint | ✗ the style has no credit for it |
| OpenFreeMap (fallback) | base map | commercial use allowed, no limits, no SLA; OSM / OpenMapTiles credit required | ✓ credit from its style |
| TMB API `api.tmb.cat/v1/transit` | metro lines and stations | per-application licence granted by TMB on approval; secondary sources say: cite TMB, don't alter. Keys are in the public bundle | **verify** in the developer portal |
| Catastro OVC `Consulta_DNPRC` | uses of the floors below ground, one call per card | SEC conditions: no bulk or automated use, per-IP limits (blocks of ~10 days). One call per user click is interactive use | ✓ keep it per click; never prefetch or bulk-download it (TODO-055) |
| Catastro OVC facade photo | card photo (flag off) | no stated terms | keep off |
| Catastro Sede, Google Maps, Idealista | links only | links are fine; name Idealista only to describe the link | ✓ |
| Geoapify geocoding / autocomplete | search box addresses (no key in production now), pins (flag) | Free plan: commercial use "with some limitations" in production; **"Geoapify attribution is mandatory"** on the Free plan, plus OSM attribution | add the credit before the key goes to production |

### 3.3 Pipeline only (not shipped)

| Data | Status |
|---|---|
| Inside Airbnb snapshot 2026-09-17 (CC BY 4.0) | research only; not in `barri-vibe.json`. Contains host names (personal data): keep it local |
| INE indices, INCASOL / Generalitat rental | fetched, not used by the app |
| Heat layers of the Atles de resiliència (Open Data BCN, CC BY 4.0) | fetched, not used |
| ICGC municipalities 1:100 000 (CC BY 4.0) | used to join prices; a better source for `areas.geojson` (item 6) |

### 3.4 Personal mode (flags off in production)

| Data | Terms |
|---|---|
| OTP2 with TMB GTFS (TMB licence), FGC GTFS, Rodalies GTFS (Mobility Database mirror of Renfe data, Renfe open-data terms, **verify**), OSM | runs locally only; if it is ever deployed (TODO-059), the TMB and Renfe terms apply to the routing results |
| Idealista HAR scrape → `idealista_prices.geojson` | against Idealista's terms; personal research only; never publish |
| Idealista HTML parser, screenshot → Claude Vision | the user's own page or screenshot; Anthropic receives the image; fine for personal use |

## 4. Personal data

None of the public files hold personal data. Catastro INSPIRE excludes owners and values (protected data).
The ESM microdata is anonymised and only barri aggregates are shipped. Airbnb host names stay local. The pins,
exclusion zones and settings live in the user's localStorage.

## 5. Notes on the hard cases

### 5.1 Catastro

- **Which licence applies.** The INSPIRE metadata (CODSI record `ES_SDGC_BU`, dated 2026-05-21) says "No
  conditions apply" and "CC BY 4.0 DG Catastro", and tags the data as an EU high-value dataset. Regulation
  2023/138 requires CC BY 4.0 or more permissive terms for that category. The Catastro INSPIRE page still
  links the 2016 licence (v1.0). That licence allows public and **commercial** use only of information that
  has been **transformed**: the original information may not be redistributed as is.
- **Our position.** We filter (residential only), join, aggregate, reproject and recombine the data into scores,
  so it is transformed under either reading. The card still shows per-building attributes almost verbatim
  (address, use, dwellings, floors, year). That is fine under CC BY 4.0, and arguably transformed under the 2016
  text.
- **What the 2016 licence also asks:**
  - don't alter or distort the information;
  - **don't present our product as "cartografía catastral" or "información catastral"**, or anything that could
    be taken for Catastro's own service;
  - the data has no official value.

  So: credit "© Dirección General del Catastro", and add "not official cadastral information" next to the
  Catastro facts in the card.
- **Fines.** Catastro is a State body, so Ley 37/2007 art. 11 applies (section 1).
- **Web services.** DNPRC is allowed per user click; bulk or automated use gets the IP blocked. For an offline copy
  (TODO-055), use the bulk downloads (INSPIRE, or the alphanumeric CAT files from the Sede under its download
  licence), not DNPRC.

### 5.2 RESCCUE street flooding

- The data is not on Open Data BCN, and the Atles viewer states no licence. Other Atles datasets are on Open Data
  BCN under CC BY 4.0 (noise risk, climate refuges), but the flood model is not.
- It is downloaded from `urbisadmin.carto.com` with a read key found in the viewer's config. That is a public key,
  not a bypass. Still, it is an undocumented channel, and the data stays "all rights reserved" by default.
- BCASA (Barcelona Cicle de l'Aigua) is a municipal company, and Aquatec is a private firm (Suez group). Rights
  may sit with either of them.
- **Recommendation.** Write to the Ajuntament (Oficina Municipal de Dades / Open Data BCN, or the Resiliència
  Urbana department) and ask for the T10 / T100 depth layers on Open Data BCN under CC BY 4.0, or for written
  permission. Until then, the product owner's acceptance in 037 stands. For a paid or B2B product, switch off the
  street-flooding layer and its penalty.

### 5.3 OpenStreetMap and ODbL

- **Attribution:** "© OpenStreetMap contributors", linked to `openstreetmap.org/copyright`, visible on the map
  without interaction. It may collapse after 5 s or on the first map move. Today it appears only inside the
  ICGC credit ("Mapa resta del món"), and only in the desktop panel.
- `barcelona_poi.pmtiles` is a straight OSM extract that anyone can download from the site, so it is a derivative
  database "publicly used". It must be under ODbL, and say so.
- The walking-minute columns are computed from the OSM network and POIs and are published per building. The
  OSMF guidelines don't settle whether such computed values are a Produced Work or a Derivative Database. The
  safe and cheap option is to treat the OSM-derived columns as ODbL:
  - say so in the "Data sources" modal;
  - add a short `DATA_LICENSE` note next to the files;
  - be ready to send the OSM-derived columns as a CSV on request.

  The Catastro and other columns stay under their own terms; the file is a collective database. Don't relicense
  the Generalitat or Catastro data under ODbL: the Generalitat licence forbids sublicensing.

### 5.4 TMB

- The licence comes with the developer account ("condicions generals de contractació"). TMB grants a
  non-exclusive licence on approval, covering the static GTFS and the real-time services.
- Before going further:
  - read the conditions in the developer portal and save a copy in `local-docs/`;
  - check that public web apps, keys in the browser bundle, and a static copy of the lines and stations
    (TODO-055) are allowed;
  - check the required credit wording (secondary sources: cite TMB and the update date, don't alter the data).
- If a static copy is not allowed, draw the metro lines from OSM instead.

## 6. Proposed attribution

**On the map** (MapLibre `AttributionControl`, `compact: true`, bottom right, visible on mobile too). Turn the
control back on and let it collect the `attribution` strings of every source. Add a source-less credit for the
buildings data:

> © ICGC · © OpenStreetMap contributors · © Dirección General del Catastro · Data: Ajuntament de Barcelona,
> Generalitat de Catalunya, MITECO · [Data sources](#)

**"Data sources" modal** (link from the attribution, the panel footer and the info modal). One row per source:
publisher, dataset, year or update date, licence with a link, and "modified by time2map" where we transform it.

- Buildings: © Dirección General del Catastro, INSPIRE Buildings and Addresses, update `<date>`, CC BY 4.0.
  Selected and combined by time2map; not official cadastral information.
- Noise: Ajuntament de Barcelona, Strategic Noise Map 2022, CC BY 4.0 (Source of the data: Barcelona City
  Council). Outside Barcelona: MITECO, SICA 4th round (2022), CC BY 4.0. Aggregated per facade by time2map.
- Residents' opinion: Ajuntament de Barcelona, Enquesta de Serveis Municipals 2022–2026, CC BY 4.0. Small samples
  adjusted towards the gran barri by time2map.
- Sale prices: Generalitat de Catalunya, Departament de Territori, Habitatge i Transició Ecològica / INCASOL,
  sales and prices `<year>`.
- River flood zones: Generalitat de Catalunya, Agència Catalana de l'Aigua, downloaded `<date>`.
- Wildfire: Generalitat de Catalunya, Departament d'Agricultura, basic wildfire hazard map 2024; Protecció Civil
  de Catalunya, WUI zones (ICGC geoservei), CC BY 4.0.
- Street flooding: RESCCUE project (BCASA / Aquatec), Atles de resiliència, Ajuntament de Barcelona. Used with
  `<permission / pending>`.
- Walking times, services, POI: © OpenStreetMap contributors, ODbL 1.0. Derived data available under ODbL on
  request.
- Base map: © ICGC, CC BY 4.0; © OpenMapTiles © OpenStreetMap contributors. Terrain: Mapterhorn (Copernicus
  GLO-30, © CNIG "scne.es" CC BY 4.0).
- Areas: Ajuntament de Barcelona (CartoBCN), CC BY 4.0; municipalities © ICGC, CC BY 4.0.
- Transit: TMB (`<terms wording>`); FGC (`<licence>`).
- Not affiliated with or endorsed by any of these bodies.

The update dates should come from the pipeline: write a `sources` block with fetch dates into
`buildings-meta.json`, so the modal never goes stale.

## 7. Action plan

1. **Attribution.** Section 6: map control, "Data sources" modal, update dates from the pipeline,
   "not official cadastral information" in the card. Covers items 1, 3 (attribution part) and the Catastro and
   Generalitat conditions. A small feature (TODO).
2. **ODbL notice** for `barcelona_poi.pmtiles` and the OSM-derived columns (5.3).
3. **RESCCUE:** send the request to the Ajuntament; decide what to do with the layer for commercial use.
4. **TMB:** read and archive the portal terms; decide on the static copy in TODO-055.
5. **FGC:** confirm the GTFS licence, or switch to OSM.
6. **`areas.geojson`:** take the municipalities from ICGC instead of Opendatasoft.
7. **Geoapify:** add "Powered by Geoapify" before the search key reaches production; check the Free-plan
   production limits.
8. Delete `landmark-geometries.json`; keep the Idealista scrape out of git and production.

## 8. Not verified

- Licence of the SICA 4th-round downloads (the 3rd-round metadata says CC BY 4.0).
- Per-layer licence of the ACA WFS (the service declares no constraints).
- Legal notice of `habitatge.gencat.cat` (INCASOL statistics).
- FGC GTFS licence; Renfe / Rodalies GTFS terms.
- TMB developer-portal conditions (they need a login).
- Opendatasoft `georef-spain-municipio` licence and source.
- Whether the Catastro 2016 licence PDF is still meant to apply next to the CC BY 4.0 metadata.

## 9. References

- Catastro INSPIRE: https://www.catastro.hacienda.gob.es/webinspire/index.html, licence v1.0 (2016):
  https://www.catastro.hacienda.gob.es/webinspire/documentos/Licencia.pdf; metadata (CC BY 4.0, HVD):
  https://www.idee.es/csw-codsi-idee/srv/api/records/ES_SDGC_BU
- Catastro SEC conditions of use: https://www.catastro.hacienda.gob.es/ayuda/condicionesuso.htm
- Ley 37/2007, art. 11 (sanctions): https://www.boe.es/buscar/act.php?id=BOE-A-2007-19814
- Open Data BCN terms: https://opendata-ajuntament.barcelona.cat/en/node/52; datasets `esm-bcn-evo`,
  `rasters-mapa-estrategic-soroll` (CKAN `package_show`, licence CC-BY-4.0)
- Generalitat licences: https://web.gencat.cat/ca/generalitat/dades-indicadors/dades-obertes/llicencies;
  legal notice: https://tramits.gencat.cat/ca/ajuda/avis_legal/
- ICGC ContextMaps (CC BY 4.0): https://www.icgc.cat/en/Tools-and-viewers/Viewers/ContextMaps
- OSM attribution guidelines: https://osmfoundation.org/wiki/Licence/Attribution_Guidelines; Produced Work
  guideline: https://wiki.openstreetmap.org/wiki/Open_Data_License/Produced_Work_-_Guideline
- OpenFreeMap: https://openfreemap.org/
- Mapterhorn sources: https://download.mapterhorn.com/attribution.json
- Geoapify terms: https://www.geoapify.com/terms-and-conditions/
- SICA / MER metadata (CC BY 4.0): https://inspire-geoportal.ec.europa.eu/srv/api/records/7cd6405b-9586-45be-9f5a-78bf0919a250
- Atles de resiliència, RESCCUE: https://coneixement-eu.bcn.cat/widget/atles-resiliencia/en_index_resccue_inun_urbana.html
- `martgnz/bcn-geodata`: https://github.com/martgnz/bcn-geodata

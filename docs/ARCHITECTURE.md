# Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (React SPA)                          │
│                                                                     │
│  ┌──────────┐  ┌─────────────────────────────────────────────────┐ │
│  │ Zustand  │  │                    UI Components                 │ │
│  │  store   │  │  ┌──────────┐ ┌──────────┐ ┌─────────────────┐ │ │
│  │          │  │  │   Map    │ │ Isochrone│ │  PropertyPins   │ │ │
│  │workplace │◄─┤  │ (MapLibre│ │  Layer   │ │  (markers,      │ │ │
│  │ minutes  │  │  │  GL JS)  │ │          │ │   compare,      │ │ │
│  │ polygon  │  │  └────┬─────┘ └────┬─────┘ │   lightbox)     │ │ │
│  │  pins    │  │  ┌────▼─────┐ ┌────▼─────┐ └────────┬────────┘ │ │
│  │noiseLayer│  │  │ Filter   │ │  Noise   │          │          │ │
│  │composite │  │  │  Panel   │ │  Layer   │          │          │ │
│  │Visible   │  │  └──────────┘ └──────────┘          │          │ │
│  │prices    │  └───────────────────────────────────────────────┘ │ │
│  │Visible   │                           │                 │       │ │
│  │selected  │  ┌────────────────────────────────────────┐       │ │
│  └────┬─────┘  │                   Hooks                 │       │ │
│       │        │  useIsochrone ──► OTP2 + localStorage   │       │ │
│       │        │  usePinAnalytics ──► OTP2 + noise       │◄──────┘ │
│       │        │  useBestZones ──► buildings → zones     │         │
│       │        │  useScreenshotDrop ──► Vision + Geocode │         │
│       │        │  useSplitPane ──► resizable compare pane│         │
│       │        │  useUrlState ──► URL sync               │         │
│       │        └────────────────────────────────────────┘         │
│                                                                     │
│  ┌─────────────────────── Services ──────────────────────────────┐ │
│  │  otp.ts           geocoding.ts      vision/                   │ │
│  │  analytics.ts     noise/            (Anthropic Vision)        │ │
│  │  (travel score +  walkability/      idealista.ts              │ │
│  │   composite)      cityCore/         bestZones.ts              │ │
│  │                   composite/        idealista/                 │ │
│  │                   buildings/        parser/                    │ │
│  └───────┬────────────────┬──────────────┬──────────────────────┘ │
└──────────┼────────────────┼──────────────┼────────────────────────┘
           │                │              │
           ▼                ▼              ▼
  ┌────────────────┐ ┌────────────┐ ┌──────────────────┐
  │ OpenTripPlanner│ │ Nominatim  │ │  Anthropic API   │
  │ 2 (localhost:  │ │ (OSM,      │ │  Claude Vision   │
  │ 8080, Docker)  │ │ public)    │ │  (claude-haiku)  │
  └────────────────┘ └────────────┘ └──────────────────┘
           │
  ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐
  │  OpenFreeMap   │  │  TMB API          │  │  noise.pmtiles  │
  │  (map tiles)   │  │  (metro lines +  │  │  (static file,  │
  │                │  │   stations)       │  │   Range reqs)   │
  └────────────────┘  └──────────────────┘  └─────────────────┘
```

## Repository layout

```
bcn-property-finder/
├── frontend/        # React SPA
├── backend/         # OTP2 via Docker Compose (isochrone/routing engine)
│   └── otp/data/    # GTFS + OSM graph files for OTP
├── data/            # Static datasets (Barcelona open data, gitignored raw)
│   ├── noise/       # Strategic noise maps: BCN isophones + 2022 rasters + 2017 facades; sica/ = SICA END zips (gitignored)
│   ├── buildings/   # Catastro zips, buildings.gpkg, blocks.gpkg, exposure.gpkg (noise/flood/fire), access.gpkg (walk/City Core) (TODO-046)
│   └── areas/       # Raw district/barri/municipality downloads (gitignored)
├── scripts/
│   ├── prepare-noise-data.sh        # GPKG → GeoJSON → PMTiles pipeline
│   ├── prepare-areas-data.sh        # districtes+barris+AMB municipis → areas.geojson
│   ├── prepare_buildings.py         # Catastro INSPIRE → residential buildings + entrances → data/buildings/buildings.gpkg (TODO-046)
│   ├── fetch_exposure_sources.py    # BCN noise rasters + 2017 facades, SICA agglomeration maps, Catastro blocks (TODO-046)
│   ├── building_exposure.py         # noise per facade (side × direction), river zone, water at the door, wildfire → data/buildings/exposure.gpkg (TODO-046)
│   ├── building_access.py           # walkability + City Core on the OSM walking network (pandana), from each entrance → data/buildings/access.gpkg (TODO-046)
│   ├── build_building_tiles.py      # non-residential filter + areas → buildings.pmtiles, buildings-detail.pmtiles, buildings-scores.bin.gz, buildings-meta.json (TODO-046)
│   ├── climate_risk.py              # hazard helpers for building_exposure + river flood / wildfire / street flooding view-layer pmtiles (036, 037)
│   ├── fetch_climate_risk.py        # downloads climate-risk sources → data/climate-risk/ (gitignored)
│   ├── build_neighbourhood_vibe.py  # ESM residents' survey (+ Inside Airbnb research) per barri → public/data/barri-vibe.json (042)
│   ├── prepare-landmark-geometries.py # landmark point/polygon extraction
│   ├── extract_poi.py               # OSM PBF → barcelona_poi.pmtiles (walkability POIs)
│   ├── fgc-gtfs-to-geojson.mjs      # FGC GTFS → fgc-lines/fgc-stations.geojson
│   ├── fetch_bcn_rental_barri.py    # BCN open data rental stats by barri
│   ├── fetch_catalonia_rental.py    # Generalitat rental price data
│   ├── fetch_incasol_sale_catalonia.py  # INCASOL sale prices (Catalonia)
│   ├── fetch_incasol_sale_prices.py # INCASOL sale prices by barri / districte
│   ├── fetch_ine_indices.py         # INE housing price indices
│   ├── build_price_geopackage.py    # joins price sources → price GPKG
│   ├── har_to_geojson.py            # Idealista HAR capture → GeoJSON price dots
│   └── _amb_muni_url.py             # builds the AMB municipalities export URL
└── docs/
```

The built `frontend/public/data/areas.geojson` (118 features, ~150 KB) is committed.

## Frontend (`frontend/src/`)

```
src/
├── components/
│   ├── Map/             # MapLibre canvas; drag-to-move workplace marker, click-to-place pins
│   │   ├── MapContext.ts        # React context exposing the MapLibre map instance
│   │   ├── MapContextMenu.tsx   # right-click context menu (set workplace, add pin)
│   │   ├── layerOrder.ts        # canonical z-order for all MapLibre layers
│   │   ├── visibleBounds.ts     # viewport minus side panels — best zones + colour scale fit to it
│   │   └── googleMapsUrl.ts     # builds Google Maps URL for a coordinate
│   ├── IsochroneLayer/  # GeoJSON fill + outer mask layer
│   ├── NoiseLayer/      # PMTiles vector fill layer (Lden) + legend + info modal
│   ├── FloodZonesLayer/ # ACA river flood zones T10/T100/T500 (PMTiles) + legend + info modal
│   ├── StreetFloodingLayer/ # RESCCUE street-flooding depth classes, T10/T100 switch (PMTiles) + legend + info modal
│   ├── WildfireLayer/   # wildfire hazard 2024 classes + WUI outline (PMTiles) + legend + info modal
│   ├── WalkabilityLayer/  # walking-time markers of the selected pin's nearest services
│   ├── BuildingsLayer/    # Livability Index per building (TODO-046): dots z≤13, footprints z≥14, colour from feature state
│   │   ├── FacadeNoiseLayer.tsx # noise circles at the facades of the selected building (z≥15)
│   │   ├── CompositeLegend.tsx  # colour scale legend of the index
│   │   └── scoreRamp.ts         # RdYlGn colour ramp; fitScoreRange (scale fitted to the view, TODO-032)
│   ├── BuildingCard/      # click card of a building (TODO-046): Catastro facts, photo, noise by facade, barri-level block
│   │   └── cardParts.tsx / cardColors.ts / cardText.ts / buildingCardText.ts  # card blocks, colours, texts
│   ├── MetroLayer/      # TMB metro lines + station dots (API: api.tmb.cat)
│   ├── FgcLayer/        # FGC suburban rail lines + stations (static GeoJSON)
│   ├── PoiLayer/        # POI dots from barcelona_poi.pmtiles
│   ├── LandmarksLayer/  # city-core landmark markers (Sagrada Família, Passeig de Gràcia, etc.)
│   ├── IdealistaPricesLayer/ # Idealista scraped price dots on the map
│   │   └── priceColors.ts       # price → colour ramp
│   ├── FilterPanel/     # travel time slider + layer toggles + composite/exclusion controls
│   │   ├── CompositeControls.tsx  # index toggle, conditions in real units (049), services / landmarks / eras gears, risk strengths
│   │   └── ExclusionControls.tsx  # exclusion zone picker + draw mode buttons
│   ├── BestZones/       # floating "Draw best zones" bar + zones on the map (feature 038)
│   │   ├── BestZonesLayer.tsx     # zone outlines + click → Idealista link popup
│   │   └── BaseUrlInput.tsx       # Idealista base URL input + validation
│   ├── ExclusionLayer/  # red fill + outline for no-go zones
│   ├── ExclusionDraw/   # terra-draw integration (polygon / freehand)
│   └── PropertyPins/    # apartment pins: map markers, comparison table, photo lightbox
│       ├── PinLayer.tsx          # map markers for all pins
│       ├── PinAccuracyLayer.tsx  # circle showing geocode accuracy radius
│       ├── ComparePane.tsx       # resizable side panel (uses useSplitPane)
│       ├── CompareGrid.tsx       # sortable comparison table
│       ├── AddPinButton.tsx      # floating button to add pin at map centre
│       ├── ScreenshotDropZone.tsx # drag-drop target for screenshot parsing
│       ├── PhotoLightbox.tsx     # full-screen photo viewer
│       └── compareHighlight.ts  # logic for highlighted / sorted column
├── hooks/
│   ├── useIsochrone.ts       # fetches isochrone from OTP2; caches in localStorage
│   ├── usePinAnalytics.ts    # walk/cycle/drive/transit times + noise Lden per pin
│   ├── useBestZones.ts       # building scores averaged per res-9 H3 cell + captured viewport → best zones + Idealista URLs
│   ├── useScreenshotDrop.ts  # screenshot drop → Vision parse → geocode → pin
│   ├── useSplitPane.ts       # resizable split-pane width + collapse state
│   ├── useEffectiveArea.ts   # isochrone − exclusion zones (isochrone mask)
│   └── useUrlState.ts        # syncs Zustand store ↔ URL search params
├── store/
│   ├── index.ts                  # Zustand: workplace, minutes, resultPolygon,
│   │                             #   noiseLayerVisible, compositeVisible,
│   │                             #   compositeWeights, idealistaPricesVisible,
│   │                             #   idealistaPriceRange, selectedBuilding, buildingScores, …
│   ├── pinsStore.ts              # Zustand: apartment pins, localStorage persistence
│   ├── exclusionsStore.ts        # Zustand: no-go zones + drawingMode, localStorage
│   └── idealistaBaseUrlStore.ts  # Zustand: custom Idealista base URL, localStorage
├── types/
│   ├── pins.ts              # PropertyPin, PinAnalytics (incl. noiseLden, noiseScore)
│   ├── exclusions.ts        # ExclusionZone (drawn | area)
│   └── IdealistaProperty.ts # scraped Idealista price-dot record
└── services/
    ├── otp.ts           # OTP2 client: isochrone + point-to-point routing (all modes)
    ├── geocoding.ts     # Nominatim geocoder; multi-query fallback + ES→CA translation
    ├── analytics.ts     # travelIndex + per-pin compositeScore (travel × noise × walkability)
    ├── imageUtils.ts    # image compression + base64 helpers
    ├── idealista.ts     # GeoJSON → Google Encoded Polyline → Idealista URL; base URL parse
    ├── bestZones.ts     # res-9 H3 cell scores → up to 3 simple zones (smoothing, percentile, components)
    ├── buildings/
    │   ├── buildingData.ts     # loads buildings-meta.json + buildings-scores.bin.gz → decoded columns per building (TODO-046)
    │   ├── buildingScore.ts    # building inputs → computeComposite (walk over the user's categories, area price, door water, age)
    │   ├── buildingAge.ts      # building-age eras + ageScore (year built vs the eras the user likes, 047)
    │   ├── conditions.ts       # conditions in real units (049): limits, fall-offs, atMost / atLeast, minutesShare
    │   ├── buildingDetail.ts   # card fields + facade groups of one building from buildings-detail.pmtiles (z14)
    │   ├── address.ts          # Catastro address → readable; Catastro page and facade photo URLs
    │   └── catastroUnits.ts    # Catastro DNPRC (open, per click): what the floors below ground are (parking / storage / dwellings)
    ├── exclusions.ts    # subtractExclusions (turf union+difference), isPointInExclusions
    ├── areas.ts         # loads areas.geojson; grouped picker options; geometry lookup
    ├── noise/
    │   ├── noiseData.ts        # PMTiles tile fetch at z=14 + point-in-polygon → Lden
    │   ├── noiseScore.ts       # noiseScore(lden) = clamp(0,100,(75−lden)/30×100)
    │   ├── noisePalette.ts     # official noise-map colours as a MapLibre step expression
    │   └── pmtilesProtocol.ts  # registers pmtiles:// protocol with MapLibre (once at startup)
    ├── walkability/
    │   ├── walkabilityScore.ts  # distance-decay + per-category saturation over nearby POIs
    │   ├── pmtilesPoi.ts        # reads barcelona_poi.pmtiles; STRtree-style radius lookup
    │   ├── serviceCategories.ts # POI category definitions + saturation caps
    │   └── walkabilityTypes.ts  # shared types for walkability computation
    ├── cityCore/
    │   └── landmarks.ts      # landmark definitions (id, name, ALL_LANDMARK_IDS)
    ├── composite/
    │   └── compositeScore.ts # computeComposite: weighted index of one building + climate-risk penalties
    ├── climateRisk/
    │   └── climateRisk.ts    # floodRisk / fireRisk / streetFloodRisk (0–1) + applyRiskPenalties (036, 037)
    ├── localsOpinion/
    │   └── localsOpinion.ts  # loads barri-vibe.json; localsOpinionScore (satisfaction → 0–100), topProblems (042)
    ├── idealista/
    │   └── idealistaRawData.ts # loads Idealista price-dot GeoJSON (scraped via HAR)
    ├── parser/
    │   └── IdealistaHTMLParser.ts # parses Idealista listing HTML → structured fields
    └── vision/
        ├── visionService.ts      # provider-agnostic entry point
        ├── anthropicProvider.ts  # Claude Vision via Anthropic API
        └── types.ts              # ParsedListing type
```

## Noise layer

**Data**: Barcelona Strategic Noise Map 2022, `Total_Lden` — road traffic + railways + industry + leisure/entertainment. Source: [Open Data BCN](https://opendata-ajuntament.barcelona.cat/data/en/dataset/isofones-mapa-estrategic-soroll).

**Pipeline** (`scripts/prepare-noise-data.sh`):
1. Download `2022_Isofones_Total_Lden_BCN.gpkg` (~274 MB)
2. `ogr2ogr` → GeoJSON with numeric `lden` midpoints from `Rang` string field
3. `tippecanoe` → `frontend/public/data/noise.pmtiles` (z10–z16, ~34 MB)

**Client**:
- MapLibre reads `noise.pmtiles` via `pmtiles://` protocol (HTTP Range requests — only visible tiles fetched)
- Scoring: fetch z=14 tile for pin coords → decode MVT → point-in-polygon → `lden` midpoint
- Score formula: `clamp(0, 100, round((75 − lden) / 30 × 100))`

**Per-pin composite score**: `round((travelIndex × W_travel + noiseScore × W_noise + walkScore × W_walk) / sum(weights))`. Weights from ENV (`VITE_COMPOSITE_WEIGHT_TRAVEL`, `VITE_COMPOSITE_WEIGHT_NOISE`, `VITE_COMPOSITE_WEIGHT_WALKABILITY`). If noise or walkability data is unavailable, falls back gracefully.

## Walkability (feature 010)

Nearby services by distance-decay + per-category saturation (`services/walkability`): for a pin, computed live
from `barcelona_poi.pmtiles` (`WalkabilityLayer` shows the selected pin's walking times); for the Livability
Index, precomputed per building on the walking network (`scripts/building_access.py`, TODO-046).
ENV: `VITE_WALK_DECAY_M` (default 400 m), `VITE_WALK_RMAX_M` (default 1500 m); the pipeline reads
`WALK_DECAY_M` / `WALK_RMAX_M` with the same defaults.

## Livability Index on buildings (features 022, TODO-046)

Every residential building (Catastro, BCN + AMB) coloured by a weighted index: walkability (POI access), noise,
City Core proximity, open sale price, and residents' satisfaction (`VITE_FEATURE_LOCALS_OPINION`). All factors
are workplace-independent and precomputed offline; weights are applied in the browser. The H3 hex version was
removed on 2026-11-04 (TODO-046 step 6).

- **Pipeline**: `prepare_buildings.py` → `building_exposure.py` (noise per facade, river zone, water at the
  door, wildfire) → `building_access.py` (walkability + City Core on the walking network) →
  `build_building_tiles.py` (non-residential filter, barri / municipality, tiles + score columns). See
  `docs/features/046-building-level-index.md`.
- **Data**: `buildings.pmtiles` (geometry, feature id = row), `buildings-scores.bin.gz` + `buildings-meta.json`
  (score inputs per building, area table with price and barri code), `buildings-detail.pmtiles` (card fields +
  facade noise points, z14), `barri-vibe.json` (per-barri survey fields, 042).
- **Conditions** (049): each component is a condition in real units, what is OK for the user. A building that meets it scores 100, falling linearly to 0 over the fall-off (`services/buildings/conditions.ts`, ENV `VITE_COND_*`):
  1. `poiAccess` — chosen services within N min walk (`min_<category>` columns): share within reach, 0 at 2× the limit
  2. `noise` — the facade-length-weighted Lden of the building (`lden_avg`) up to N dB; 0 at +10 dB
  3. `cityCore` — chosen places within N min walk (`cc_<landmark>` columns): share within reach
  4. `openPrice` — INCASOL sale €/m² of the barri (Barcelona) or municipality up to the budget; 0 at +25 %
  5. `localsOpinion` (042, flag) — residents' satisfaction (small samples shrunk towards the gran barri) at least N / 10; 0 one point below. Barcelona city only; small-sample barris get the gap outline. Off by default.
  6. `age` (047) — year built (`year_built` column) against the eras the user likes: 100 in a liked era, 0 elsewhere, fading over `VITE_AGE_ERA_BLUR_YEARS`. Off by default.
- **Score**: `computeComposite(inputs, onOff, riskStrengths)` (inputs from `services/buildings/buildingScore.ts`) → mean over the conditions that are on (missing data = 0, gap outline), then climate-risk penalties.
- **Climate-risk penalties (036, 037)**: `score = base × (1 − sFlood/10 · floodRisk) × (1 − sFire/10 · fireRisk) × (1 − sStreet/10 · streetFloodRisk)` — safe buildings keep their score. River zone the footprint touches, WUI × forest hazard, and water depth at the door (Barcelona only) come from `building_exposure.py`; risks and penalties are computed in `services/climateRisk`. ENV: `VITE_FLOOD_PENALTY_T10/T100/T500`, `VITE_RISK_STRENGTH_FLOOD/FIRE/STREET`, `VITE_STREET_FLOOD_MIN_CM/MAX_CM`.
- **Client**: `BuildingsLayer` scores every building and sets the score as MapLibre feature state (rescoring debounced); `BuildingCard` reads the clicked building from `buildings-detail.pmtiles` (+ Catastro photo and floor uses); `FacadeNoiseLayer` draws its facade noise. `FilterPanel/CompositeControls` hosts the layer toggle, the conditions (slider in real units + a sentence such as "Up to 65 dB is OK for me"), walkability services, landmark and era gears, risk strengths (in words). `FilterPanel/ClimateLayerControls` toggles the River flood zones / Street flooding / Wildfire hazard view layers (`scripts/climate_risk.py`).
- **State**: `compositeVisible`, `compositeWeights`, `compositeColorRange` (colour scale of the buildings in view, set by `BuildingsLayer`), `compositeRiskStrengths`, `floodLayerVisible`, `wildfireLayerVisible`, `streetFloodingLayerVisible`, `streetFloodingReturnPeriod`, `enabledLandmarkIds`, `enabledWalkCategories`, `ageEras`, `conditions`, `selectedBuilding`, `buildingScores` in Zustand store (`compositeWeights` = which conditions are on).

## Idealista Prices layer (feature 019)

Scraped Idealista listing price dots overlaid on the map as a supplementary reference layer.

- **Data**: captured via HAR (`scripts/har_to_geojson.py`) → `frontend/public/data/idealista-raw.geojson`. Each feature: `{ price, priceByArea }`.
- **Client**: `IdealistaPricesLayer` renders dots coloured by EUR/m² (`priceColors.ts`). The data file is gitignored (local dev only), so the layer is not deployed.
- **State**: `idealistaPricesVisible`, `idealistaPriceRange`, `idealistaPriceBounds` in Zustand store.

## Transit layers (feature 020)

- **MetroLayer**: TMB REST API (`api.tmb.cat/v1/transit`) — metro lines + station dots. Requires `VITE_TMB_APP_ID` / `VITE_TMB_APP_KEY`.
- **FgcLayer**: static `fgc-lines.geojson` / `fgc-stations.geojson` in `frontend/public/` (built by `scripts/fgc-gtfs-to-geojson.mjs` from FGC GTFS).

## Exclusion ("no-go") zones

Statically subtracted from the exported area (feature 015). Zones are defined by **drawing**
(terra-draw: polygon / freehand) or **picking** a district / barri / metro municipality, and
persist in `localStorage` (`bcn_exclusion_zones`) independent of workplace/isochrone.

- **Data**: `frontend/public/data/areas.geojson` — BCN districtes + barris ([martgnz/bcn-geodata](https://github.com/martgnz/bcn-geodata)) + AMB municipalities ([opendatasoft georef-spain-municipio](https://public.opendatasoft.com)). Built by `scripts/prepare-areas-data.sh`.
- **Effective area** (`useEffectiveArea`): `subtractExclusions(isochrone, zones)` = `@turf/difference` over `@turf/union`. Used by the isochrone mask.
- **Export**: the isochrone-based Idealista export was removed in feature 038 (geometry too complex for Idealista's `shape`). Idealista links now come from **best zones** — see `docs/features/038-best-zones.md`.
- **Pins**: `isPointInExclusions` flags pins inside a zone — "excluded" badge in the compare grid + dimmed map marker (kept, not removed).
- **Deps**: `terra-draw`, `terra-draw-maplibre-gl-adapter`, `@turf/difference`, `@turf/union`.

## Scoring weights (ENV)

All scoring weights are in `.env.local` (see `.env.local.example`):

| Variable | Default | Purpose |
|---|---|---|
| `VITE_WEIGHT_WALK` | 4 | Travel sub-index: walking |
| `VITE_WEIGHT_PT` | 3 | Travel sub-index: public transport |
| `VITE_WEIGHT_CYCLE` | 2 | Travel sub-index: cycling |
| `VITE_WEIGHT_CAR` | 1 | Travel sub-index: driving |
| `VITE_TRAVEL_CAP_MINUTES` | 60 | Minutes beyond which mode score = 0 |
| `VITE_COMPOSITE_WEIGHT_TRAVEL` | 5 | Per-pin composite: travel index weight |
| `VITE_COMPOSITE_WEIGHT_NOISE` | 2 | Per-pin composite: noise score weight |
| `VITE_COMPOSITE_WEIGHT_WALKABILITY` | 3 | Per-pin composite: walkability weight |
| `VITE_WALK_DECAY_M` | 400 | Walkability distance-decay constant (metres) |
| `VITE_WALK_RMAX_M` | 1500 | Walkability hard cutoff radius (metres) |

Composite Index layer weights (per-cell, not per-pin) are stored in Zustand (`compositeWeights`) with defaults `{ poiAccess: 6, noise: 7, cityCore: 8, openPrice: 10, localsOpinion: 0 }` and adjusted via UI sliders in `CompositeControls`.

## UI

**Mantine** (`@mantine/core` + `@mantine/hooks`) — components (Button, Slider, Switch, Modal, Drawer, Table) and CSS variables for theming. Mobile-first: filter panel is a bottom `Drawer` on mobile, floating card on desktop (`≥ 768px`). The compare pane is a resizable side panel (desktop) or bottom sheet (mobile), managed by `useSplitPane`.

## External services

| Service | Purpose | Notes |
|---|---|---|
| OpenTripPlanner 2 | Isochrone + all routing modes (walk, bike, car, transit) | Self-hosted via Docker, port 8080 |
| Anthropic API | Screenshot → structured listing data (price, area, address, URL) | Model: `claude-haiku-4-5` (env `VITE_ANTHROPIC_MODEL`) |
| Nominatim (OSM) | Address geocoding for screenshot-parsed addresses | Public endpoint; multi-query fallback with ES→CA translation |
| OpenFreeMap | Vector map tiles | No API key needed |
| TMB API | Metro lines + station data | Requires `VITE_TMB_APP_ID` / `VITE_TMB_APP_KEY` from developer.tmb.cat |
| Idealista | Property search target | URL only |
| Catastro OVC (ovc.catastro.meh.es) | Building card (TODO-046): facade photo, DNPRC units per floor | Open, no key; called per click; photo behind `VITE_FEATURE_FACADE_PHOTO` |

## Backend

**OpenTripPlanner 2** runs locally via Docker Compose (`backend/docker-compose.yml`). It serves the OTP REST API on `http://localhost:8080` and handles isochrone requests for all transport modes (walk, bike, car, public transit).

Graph data (GTFS + OSM) lives in `backend/otp/data/` and is loaded at container startup.

## Screenshot → Pin flow

```
User drops screenshot
        │
        ▼
  compressImage + fileToBase64 (parallel)
        │
        ▼
  Anthropic Claude Vision
  → { price, area, address, addressIsApproximate, url }
        │
        ├──► updatePin: price, area, url, comment (address), photo
        │
        ▼
  geocoding.ts (if address present)
  1. Full address + "Barcelona"
  2. Street-only + "Barcelona"
  3. Catalan-translated street + "Barcelona"
        │
        ├── success → updatePin: { coordinates }
        └── fail    → keep fallback coords (workplace or map center)
        │
        ▼
  calcAnalytics(finalCoords, workplace)
  → OTP2 routing × 4 modes  → travelIndex
  → noise PMTiles lookup     → noiseLden, noiseScore
  → walkability PMTiles      → walkabilityScore
  → compositeScore (travel + noise + walkability)
  → updatePinAnalytics
```

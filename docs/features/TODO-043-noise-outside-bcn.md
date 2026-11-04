# TODO-043 — Noise level outside Barcelona city

**Note (2026-11-04):** the hexes were removed in TODO-046; where this file says hex / cell, read building.

**Status:** Partly done via TODO-046 stage 2 (2026-11-03): Option 1 found full official maps for 14 AMB
municipalities (84% of dwellings, together with Barcelona). They are used per building. **Still open for the
other 21 municipalities** (16% of dwellings), which have only corridor maps. For those, do not implement until
an approach is chosen (Option 3 or hybrid) and estimated.

## Option 1 results (2026-11-03)

**Source: SICA (MITECO), 4th round (2022), original END deliveries:**
<https://sicaweb.miteco.gob.es/datos-geoespaciales/4a-fase/>. One zip per agglomeration or infrastructure, with
GeoPackages in the EU END reporting schema (DF4_8):

- `NoiseContours_{source}InAgglomeration_{Lden|Lday|Levening|Lnight}`: MultiPolygon, EPSG:3035;
- `category` holds the band: `Lden5559`, `LdenGreaterThan75` (also spelt `LdenThan75`), `LdenLowerThan40`,
  `Lnight6064`, …;
- `source = allSources` sums roads, railways and industry (≈ Barcelona's "Total");
- 5 dB bands from 40 (Lden) and from below 40 (Lnight), all four periods. The lowest band differs by period
  (checklist item 5);
- also `NoiseIsophone_*` lines and exposure tables (not used);
- some deliveries are invalid geometry → `make_valid(method="structure")`;
- the server does not send its intermediate certificate (see `scripts/fetch_exposure_sources.py`).

| Delivery | Municipalities |
|---|---|
| Aglomeració de l'Hospitalet | L'Hospitalet |
| Aglomeració del Baix Llobregat I | Cornellà, Esplugues, Sant Feliu, Sant Joan Despí, Sant Just Desvern |
| Aglomeració del Baix Llobregat II | Gavà, Sant Boi, Viladecans |
| Barcelonès | Badalona, Sant Adrià de Besòs, Santa Coloma de Gramenet |
| Aglomeració del Vallès Occidental I | Barberà del Vallès, Badia del Vallès |

**Corridor maps only** (Carreteras del Estado, Generalitat, Diputació, ADIF, FGC, FMB, El Prat airport) for Sant
Cugat, Castelldefels, El Prat, Cerdanyola, Ripollet, Montcada, Molins de Rei, Sant Vicenç dels Horts, Sant Andreu de
la Barca, Corbera, Montgat, Castellbisbal, Pallejà, Cervelló, Tiana, Santa Coloma de Cervelló, Begues, Torrelles,
El Papiol, Sant Climent, La Palma de Cervelló. Inside a corridor map the town's own streets are a uniform
"< 40 dB" (seen in Sant Cugat), so these maps are not used.

**Comparability:** at the Barcelona border, SICA reads 4–9 dB louder on streets and 6–17 dB louder in courtyards
than the Barcelona map (numbers in TODO-046 stage 2). The product owner decided to use it as is, with a note in
the card.

## Problem

Noise (feature 009, area average from 026) comes from the Barcelona city strategic noise map
(`2022_Isofones_Total_Lden_BCN.gpkg`). The map stops at the city boundary:

- 679 of 2635 grid cells (26%) have `lden`.
- 1956 cells (74%, all of AMB outside Barcelona) have `lden = null`. Their composite index is computed without noise.

So a quiet street in Sant Cugat and a flat next to the C-31 in Badalona look the same on noise.

## Goal

Give every residential grid cell an `lden` value, and mark where the value comes from:
`lden_src: 'official' | 'model' | null`, same pattern as `sale_src`.

## Options

### Option 1 — Official strategic noise maps from other sources

EU Directive 2002/49/EC (END) requires strategic noise maps for:
- agglomerations above 100k inhabitants,
- major roads (> 3M vehicles/yr),
- major railways (> 30k trains/yr),
- major airports (> 50k movements/yr).

If a source uses the same format as Barcelona's map (vector isophone polygons with a Lden band field), it can
plug into the existing `load_noise()` / `rang_to_lden()` pipeline with little work.

**Pros:** official data, no modelling error.
**Cons:** patchwork coverage. Most AMB municipalities (Sant Cugat, Castelldefels, Cornellà, Sant Boi, …) are
under 100k and have no obligation to publish a map.

#### Sources to check

| Source | What it covers | Where to look |
|---|---|---|
| L'Hospitalet de Llobregat | Agglomeration (> 100k) | Municipal open data / MES page |
| Badalona | Agglomeration (> 100k) | Municipal open data / MES page |
| Santa Coloma de Gramenet | Agglomeration (> 100k) | Municipal open data / MES page |
| Other AMB municipalities (Cornellà, Sant Boi, Sant Cugat, Castelldefels, El Prat, …) | Voluntary maps, if any | Municipal sites, AMB open data |
| MITECO SICA (sicaweb.cedex.es) | State roads (A-2, B-23, …), ADIF railways, El Prat airport | SICA downloads, round 4 (2022) |
| Generalitat de Catalunya | Generalitat road network (C-31, C-32, C-58, …) | Territori / ICGC / Dades obertes |
| AENA | El Prat airport noise contours (Gavà, Castelldefels, El Prat) | AENA environment pages |
| EEA (END reporting) | Possibly all of the above in one harmonised format | EEA Datahub / Reportnet. Check whether round 4 geometries for Spain are published |

#### Checklist for each source

Compare with the Barcelona dataset: vector GPKG, isophone MultiPolygons, field `Rang` = `"55 - 60 dB(A)"`,
Lden Total, 5 dB bands from `< 40` to `>= 80`, round 4 (2022).

1. **Availability.** Is there an open download, and under what licence? A WMS viewer or a PDF only does not count.
2. **File format.** Vector (GPKG / SHP / GeoJSON) works with `ogr2ogr` as is. Raster (GeoTIFF / ASC) needs a
   separate raster-sampling path. Facade receiver points or isolines need conversion.
3. **Indicator.** Is Lden available directly? If only Ld / Le / Ln are published, Lden can be derived with the
   formula from 009, but only when all three cover the same geometry.
4. **Noise sources.** Total (road + rail + industry + leisure, like Barcelona) or road traffic only? A road-only
   map reads quieter than Barcelona's Total, so the two are not directly comparable. Per-source maps can be
   summed: `10·log10(Σ 10^(L/10))`.
5. **Lowest band.** Many END maps start at Lden 55 dB because that is all the EEA requires. Outside the polygons,
   "quiet (< 55)" must be told apart from "no data". Today `lden_at()` returns `None` for both.
6. **Coverage.** Does the map cover the whole municipality, or only corridors along major roads and railways
   (SICA, Generalitat)? Outside a corridor the value is unknown, not quiet.
7. **Band labels.** Does `rang_to_lden()` parse the labels as they are? Note the field name, the
   language (ca / es), and formats such as `55-59`, `≥75` or numeric min/max columns.
8. **CRS.** ETRS89 / UTM 31N (EPSG:25831) is fine. Older Catalan data in ED50 (EPSG:23031) needs a correct datum
   transform, otherwise the polygons shift by about 100 m.
9. **Year / round.** Round 4 (2022) is comparable with Barcelona. Round 3 (2017) or older is less so.
10. **Assessment height.** The END standard is 4 m. Check that it matches.
11. **Overlaps.** Where a municipal map overlaps a SICA or Generalitat corridor, how do we combine them?
    Options: take the max, or sum the energy only when the maps cover different sources.

**Decision rule:** if a source is vector isophone polygons with Lden Total (or summable per-source maps), covers
the whole municipality, and uses labels `rang_to_lden()` can parse, integrate it right away. That means turning
`NOISE_GPKG` / `NOISE_LAYER` into a list of `(path, layer, field)` entries. Other sources go to Option 3 or are
dropped.

### Option 2 — Physical model CNOSSOS-EU (NoiseModelling)

Open-source implementation of the official EU method (Université Gustave Eiffel). It computes sound
propagation from roads, including building shielding, and can take OSM input.

**Pros:** physically grounded, the official EU method.
**Cons:**
- Heavy: Java / H2GIS, and a full AMB run takes hours.
- Traffic flow per street is still guessed from the OSM road class, and that guess limits accuracy.
- A new toolchain in the build.

### Option 3 — Regression model trained on Barcelona

- **Training data:** Barcelona sample points we already compute (679 cells × 49 child points ≈ 33k labelled points).
- **Features**, all from `backend/otp/data/barcelona.osm.pbf`:
  - distance to the nearest road of each class (motorway / trunk / primary / secondary / tertiary / residential);
  - road length density per class within 50 / 150 / 300 m;
  - distance to the nearest railway;
  - building footprint density (shielding: inner blocks are quiet, facades are loud);
  - density of bars and nightlife (the Total map includes leisure noise).
- **Model:** gradient boosting. Predict at the child-point level, then average per cell, same as `lden_avg()`.
- **Validation:**
  - leave-one-district-out over the 10 Barcelona districts;
  - external check against L'Hospitalet or Badalona official maps, if Option 1 finds them.

**Pros:**
- Fits inside `prepare-livability-grid.py` with no new infrastructure.
- Error can be measured.
- Works for any city with OSM, so it unblocks noise for TODO-033 (multi-city).

**Cons / limits:**
- Learns Barcelona's traffic. A `primary` road in a suburb may be quieter than one in Barcelona, so expect a
  larger error outside the city.
- Cannot learn aircraft noise (not in the Barcelona data). Overlay AENA contours for El Prat / Gavà /
  Castelldefels if that matters.
- `scikit-learn` in the system Python is an x86_64 build and does not load on this Mac (arm64). Needs a venv.

### Hybrid

Option 1 where a compatible official map exists, Option 3 everywhere else. `lden_src` tells the two apart.

## Before implementation (required)

1. Run the Option 1 checklist for every source in the table. Record the findings in this file.
2. Optionally, run an Option 3 feasibility prototype in a scratch venv, with no changes to the project. Report
   MAE in dB per held-out district.
3. Decide on the approach: 1, 3, hybrid, or 2.
4. Agree on the maximum acceptable model error before `model` values are shown to users.
5. Estimate the effort for the chosen approach. Fill in the table below.

| Approach | Effort | Notes |
|---|---|---|
| Option 1 — per compatible source | TBD | Depends on the checklist results |
| Option 2 — NoiseModelling | TBD | |
| Option 3 — regression model | TBD | Depends on prototype accuracy |

## Open questions

- UI: how to mark modelled values in `HexDetailCard`, the table, and tooltips (e.g. "Estimated").
- Should the composite give model values a lower weight than official ones?
- Map overlay (`noise.pmtiles`): keep it Barcelona-only and official, or add a cell-level overlay for modelled values?
- How do we treat "below the lowest band" vs "no data" once several sources are mixed (see checklist item 5)?

## Related

- 009 — Noise level layer & score
- 026 — Noise score: area average vs centroid
- TODO-033 — Multi-city (noise availability varies by city)

# TODO-051 — Ranked list of areas ("Your areas") and area view at low zoom

**Status:** Planned, not started. Depends on 050 (match bands). Part of the mass-market UX track.

## Problem

The only output of the public map is colour on buildings and up to five best zones. People who don't know
Barcelona cannot read 174k dots at zoom 12 and have no list to start from. Every comparable product (Teleport,
NYT quiz, Nomad List, Rightmove) answers with a **ranked list** next to the map. At the city zoom the dots
are also visually noisy: an area summary reads better there, and the building detail from z14 stays.

## Decision

- A **ranked list of areas** (73 barris + the AMB municipalities) computed from the building scores already in
  the store: for each area, the share of its buildings in the "Great" + "Good" bands and the mean score.
- At **zoom < 13** the map shows the areas (choropleth from the same aggregation) instead of the dots; from
  z13 the buildings as now. This is a display aggregation, not a scoring unit: an area has no score of its own
  in the card (DEPRECATED-027 stays deprecated).
- The list is a panel, not a page: top 10 by default, "Show all", click → fly to the area and outline it.

## User story

*As someone relocating, I want a short list of the areas that fit my answers, so I know where to start
looking, and then zoom in to see the buildings.*

## Spec

**Ranking** (`services/areas/areaRank.ts`, pure): for every building row, `area` column → area id. Per area:
`n`, `mean`, `shareGood` (score ≥ good band), `shareGreat`. Rank by `shareGood`, tie by `mean`. Areas with
fewer than `VITE_AREA_MIN_BUILDINGS` (default 50) are listed at the end as "too few homes to rank".

**List item**: rank, area name, kind (barri · district / municipality), `shareGood` as "62 % of homes are a
good match", a mini bar, and the three strongest conditions as chips ("quiet", "on foot", "budget") — the
conditions where the area's mean component is highest (needs per-component means: computed in the same pass).

**Area view (z < 13)**: `areas.geojson` (already in `public/data/`, used by the exclusion picker) as a fill layer coloured by the area's
mean score with the 050 bands; label = name. Hover shows "62 % good match · 1,240 homes". Click = same as the
list click. The building dots are hidden below z13; the fill is hidden from z13.

**Where the list lives**: desktop — a tab in the top-left panel ("Map settings" / "Your areas"); mobile — a
second bottom-sheet snap under the map ("Your areas (10)"). The list updates with the settings (same debounce
as rescoring).

## Implementation

- **Join key.** `buildings-meta.json` areas use the city barri code (`'01'`–`'73'`) and the INE municipality
  code (`'08015'`); `areas.geojson` ids are `barri-<district><nn>` and `muni-<slug>`. Extend
  `scripts/prepare-areas-data.sh` to carry `code` (city barri number from bcn-geodata) and `ine` (from the
  opendatasoft export) in the properties, and join on those; never on names.

- `services/areas/areaRank.ts`: `rankAreas(scores, components, areaCol, areas, bands) → AreaRank[]`.
  Components per building are not stored today (only the final score): extend `scoreAll` to also return a
  `Uint8Array` per component when `withComponents` is on (6 × 174k bytes, fine).
- Store: `areaRanks: AreaRank[] | null`, set by `BuildingsLayer` after each rescoring.
- `components/AreasList/AreasList.tsx`, `AreaRow.tsx`; `components/AreasLayer/AreasLayer.tsx` (fill +
  labels, z < 13, uses `areas.geojson` + `areaRanks`; `layerOrder.ts` gets `areas-fill`, `areas-label`, and
  the stale `barrio-boundaries-*` ids are removed).
- `FilterPanel.tsx`: Mantine `Tabs` (Settings / Your areas). Mobile: `App.tsx` adds a sheet.
- Fly-to: `map.fitBounds(bbox(area))` + temporary outline (`areas-selected-line`).
- ENV: `VITE_AREA_MIN_BUILDINGS=50`, `VITE_AREA_VIEW_MAX_ZOOM=13`.

## Tests

- `areaRank.test.ts`: aggregation, ranking order, ties, small areas last, chips = top 3 components.
- `buildingScore.test.ts`: `scoreAll(withComponents)` returns per-component arrays consistent with
  `scoreBuilding`.
- `AreasList.test.tsx`: renders top 10, "Show all", click calls the fly-to handler with the area id.
- `AreasLayer.test.tsx` (with `fakeVectorMap`): layer added with the band colours; visibility flips at z13.
- Performance: one aggregation pass over 174k rows ≤ 30 ms (assert in a test with a timing budget).

## Definition of Done

Per `CLAUDE.md`. Manual: with the "Family" preset the list shows plausible barris; clicking one zooms to it;
zooming out past z13 shows the area fill.

## Open questions

- Municipalities and barris in one list, or two sections? Proposed: one list, kind as a chip.
- Should the list respect the best-zones restriction (commute zone) when those flags are on? Proposed: yes.

# TODO-058 — Frontend performance budget: scoring in a worker, code splitting, lazy data, cache headers

**Status:** Planned, not started. Scale track; after 054 (cache headers need nginx on our server).

## Problem

Press traffic is mostly mobile. Today `scoreAll` runs 174k buildings on the main thread (~0.2–0.4 s on a
laptop, likely 1–2 s on a cheap phone), on load and after each settings change; the UI freezes meanwhile.
The bundle includes MapLibre, Mantine, turf (buffer, simplify, union, difference), h3-js and the pins/
screenshot code paths (dead-code eliminated only partly). `buildings-scores.bin.gz` (1.8 MB) is fetched before
anything is coloured. No measurement exists: no bundle report, no Lighthouse run.

## Decision

- **Measure first**: `rollup-plugin-visualizer` report and Lighthouse (mobile, slow 4G) recorded in
  `local-docs/architecture/07-perf-baseline.md`. Budgets after that, proposed: JS ≤ 450 KB gzip initial,
  first map paint ≤ 2.5 s on slow 4G, rescoring off the main thread.
- **Scoring in a Web Worker**: `scoreAll` moves to `workers/score.worker.ts`; the worker owns the decoded
  columns; the main thread sends settings and receives `{ score, gap }` as transferable `Uint8Array`s. 051's
  per-component arrays and area ranking run in the same worker.
- **Code splitting**: dynamic `import()` for best zones (h3 + turf), the exclusion drawing (terra-draw), pins
  and the building card; flagged-off features must not be in the public chunk graph (check the report).
- **Data**: `buildings-scores.bin.gz` fetched with `fetchpriority=high` right at startup (not on first
  layer show); `buildings-meta.json` inlined into the HTML at build or preloaded; the PMTiles header
  prefetched.
- **Cache headers** (054): hashed asset names already from Vite → `immutable`; `index.html` `no-cache`;
  data under versioned paths `immutable`.
- **Low-end check**: one real cheap Android phone (or Chrome CPU 4× throttle) in the DoD.

## Spec

- `frontend/src/workers/score.worker.ts` + `services/buildings/scoreClient.ts` (`init(data)`,
  `score(settings) → Promise<{score, gap, components?}>`), Vite worker import (`?worker`). Fallback to the
  main thread when `Worker` is unavailable (tests, jsdom).
- `BuildingsLayer`: uses `scoreClient`; the 150 ms debounce stays; `useBestZones` reads the result as today
  from the store.
- `vite.config.ts`: `build.rollupOptions.output.manualChunks` for `maplibre-gl`, `@mantine/*`, `h3-js` +
  turf, `terra-draw`; the visualizer plugin under `ANALYZE=1`.
- `index.html`: `<link rel="preload" as="fetch" href="…/buildings-scores.bin.gz" crossorigin>` via a tiny
  Vite plugin that reads the manifest (054).
- `ARCHITECTURE.md`: a "Performance" section with the budgets.

## Tests

- `scoreClient.test.ts`: fallback path gives the same arrays as `scoreAll`; worker path mocked with the
  same contract.
- `buildingScore.test.ts` unchanged (pure).
- CI: `npm run build` + a size check script failing when the initial JS exceeds the budget
  (`scripts/check_bundle_size.mjs`, budget in `package.json`).

## Definition of Done

Per `CLAUDE.md`, plus: Lighthouse mobile performance ≥ 80 on the public map; moving a condition picker does
not drop frames (DevTools performance trace attached in `local-docs/architecture/07-perf-baseline.md`).

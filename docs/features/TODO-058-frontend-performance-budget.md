# TODO-058 — Frontend performance budget: scoring in a worker, code splitting, lazy data, cache headers

**Status:** Partly done 2026-11-12 (what needs no server): scoring in a worker, code splitting, the bundle budget.
Still open: cache headers and the data preload (need 054), a Lighthouse run, a real low-end phone, `manualChunks`
tuning below 450 KB. See "As built" at the end. Scale track.

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

## As built (2026-11-12)

Measured on a laptop, `npm run build` + the dev server; numbers in `local-docs/architecture/07-perf-baseline.md`.

- **Scoring in a worker.** `workers/score.worker.ts` (5 KB: only the pure scoring code, no h3-js) owns its own copy of
  the score columns; `services/buildings/scoreClient.ts` hands it the raw blob once (transferred, not copied:
  `buildingData.takeRawScores()`) and then sends only the settings. The score of every building (and the score of
  each condition for the area ranking) comes back as transferable `Uint8Array`s. Where there is no worker (jsdom, an
  old browser, a worker that fails or crashes) the same `scoreAll` runs on the main thread. Of several settings
  changes while one scoring runs, only the newest is computed (the ones in between resolve with `null`), and
  `BuildingsLayer` drops a result that arrives after a newer change. A condition change took a **330 ms** long task
  on the main thread; with the worker it is **50 ms** (applying the changed feature states). The area ranking
  (051) stays on the main thread (a few ms).
- **Initial JavaScript: 647 → 482 KB gzip** (budget 500 KB; the target of 450 is not reached: maplibre 270, mantine
  82, react 54, our code 60, tiles 14). Done by loading later what most visitors never run:
  `Map.tsx` lazy-loads Best zones (h3-js 64 KB, turf), the isochrone, exclusion and pin layers and the Idealista
  layer; `terra-draw` (23 KB) is only loaded with the exclusions flag; `@turf/buffer` is imported where a street is
  buffered; `services/bestZonesConfig.ts` (strictness steps, `Bounds`) and `services/exclusionsGeometry.ts` (turf
  union / difference) are split from the code that needs only a constant or a point test; `bestZoneGrid.ts` (h3)
  is split from `buildingScore.ts`. With the new panel Best zones is mounted when the zones are asked for.
- **Budget check:** `npm run check:bundle` (after `npm run build`) sums the gzip size of the scripts and modulepreload
  links of `dist/index.html` against `bundleBudget.initialJsGzipKB` in `package.json`; the deploy workflow runs it
  after the build and fails when the budget is exceeded.
- Not done: `rollup-plugin-visualizer` (the sizes come from the vendor groups in `vite.config.ts`, `build.rolldownOptions
  .output.codeSplitting`); the `fetchpriority=high` preload of the score blob and the inlined `buildings-meta.json`;
  cache headers; Lighthouse; a low-end phone.


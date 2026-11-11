# Feature Flags

Flags are read in `frontend/src/features.ts` as `VITE_FEATURE_<NAME> === 'true'`. Anything else counts as off.
They are build-time values: changing one needs a rebuild or a dev-server restart.

| File | Purpose |
|---|---|
| `frontend/.env.production` | public build (committed): the "Production" column below |
| `frontend/.env.local` | local dev; `.env.local.example` has everything off |
| `frontend/.env.test` | tests: every flag on, so the suite covers the gated code |

| Flag | What it gates in the code | Production | Plan |
|------|---------------------------|------------|------|
| `VITE_FEATURE_ISOCHRONE` | workplace click + draggable marker, `IsochroneLayer`, commute slider and info modal, `useIsochrone` (OTP2) | off | needs a hosted OTP2 |
| `VITE_FEATURE_EXCLUSIONS` | `ExclusionLayer`, `ExclusionDraw`, `ExclusionControls`; exclusions in best zones | off | soon |
| `VITE_FEATURE_PINS` | `ComparePane`, `AddPinButton`, `PinLayer`, `PinAccuracyLayer`, `WalkabilityLayer`, add-pin click mode, mobile Map/Compare toggle | off | later |
| `VITE_FEATURE_SCREENSHOT` | `ScreenshotDropZone` around the map; the Claude Vision call (the SDK is left out of the bundle when off) | off | later: the API key must not reach the browser |
| `VITE_FEATURE_IDEALISTA_PRICES` | `IdealistaPricesLayer` + controls (data file is gitignored, local only) | off | private scrape, not for public |
| `VITE_FEATURE_BEST_ZONES` | `BestZones` bar + zones + Idealista zone links (038) | **on** | public |
| `VITE_FEATURE_LOCALS_OPINION` | "Locals' opinion" condition, its info text, "What locals say" card block, loading `barri-vibe.json` (042) | **on** | public |
| `VITE_FEATURE_FACADE_PHOTO` | Catastro facade photo in the building card (hotlinked; the service states no terms of use) | off | TBD |

The "Inside commute zone, outside exclusion zones" option of best zones is shown only when `ISOCHRONE` or
`EXCLUSIONS` is on.

When a feature goes fully public, remove its flag from the code and delete its row here.

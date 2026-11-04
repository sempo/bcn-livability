# DEPRECATED-026 — Noise score: area average vs centroid

**Status:** Deprecated 2026-11-04. Removed with the hexes (TODO-046 step 6).

**Why.** Replaced by noise per facade of each building (TODO-046 stage 2): the facade-length-weighted Lden of the building, no area averaging.

## Status

Implemented in `scripts/prepare-livability-grid.py`.

## Problem

Noise level was previously sampled at the hex centroid only. A cell near a motorway/quiet street boundary got a single point value that could misrepresent the actual noise exposure across the cell.

## Solution

`lden_avg(noise, cell, sample_res)` computes noise as an unweighted mean over all H3 child-cell centroids at `NOISE_SAMPLE_RES` (default `H3_RES + 2`, i.e. res 11 for the standard res-9 grid, ~49 sample points per hex at ~26 m spacing).

- Smooths boundary artefacts; homogeneous cells are unaffected (all samples return the same value).
- `NOISE_SAMPLE_RES` env var overrides the default.
- Requires regenerating `frontend/public/data/livability-h3.geojson` after deployment.

## Tests

`scripts/test_noise_avg.py` — 8 unit tests (run with `python -m unittest scripts/test_noise_avg.py`).

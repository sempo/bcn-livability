# 045 — Left panel labels in real units

**Note (2026-11-04):** 049 replaced the real-scale lines with conditions in real units ("Up to 65 dB is OK for me").

**Note (2026-11-04):** the hexes were removed in TODO-046; where this file says hex / cell, read building.

**Status:** Done 2026-11-04, merged into 047 (building age) and implemented there — see
`047-building-age.md`, "Panel labels". Agreed 2026-10-27, before Spanish (TODO-028), so the new labels are
translated once.

## Idea

The Livability Index controls in the left panel speak in abstract numbers: weights 1–10 per component. A
newcomer can't tell what "Market Price 5" means for them.

The sliders stay **weights** ("how much it matters"); only the labels change:

- **Weight slider labels** — done in 047: words instead of the 1–10 numbers.
- **One dimmed line under each component** with its real scale, from worst to best:
  - **Market Price** — real prices in €/m² (`buildings-meta.json` `price_bounds` p5 / p95), e.g. "€6,800 → €2,100/m²".
  - **Walkability** — "No services close" → "All everyday services close".
  - **Noise** — "≥ 75 dB, very loud" → "≤ 45 dB, very quiet" (thresholds from the score formula).
  - **City Core Access** — "> 90 min" → "≤ 15 min".
- **Risk penalty sliders** — done in 047 with the same "how much it matters" words as the weights ("Mild" /
  "Strong" read as unclear without context).
- **Score range** — out of scope: TODO-032 removes the slider.

User story: *As someone new to Barcelona, I want the panel to use prices, minutes and plain words, so I
understand what I'm choosing without reading the methodology.*

## Not doing

Turning components into value filters in real units (price range in €, walkability "at least …"). It changes
how the index works and overlaps TODO-031 (questionnaire) and TODO-032 (colour scale).

## Notes

- Take numbers from data and the existing formulas (`compositeScore.ts`, noise and city-core thresholds), never
  hard-code them in labels.
- The building card already shows real values (dB, minutes, €/m²) — reuse its noise wording where it fits.
- Update the info modal text if wording changes.

## Definition of Done

Standard (see `CLAUDE.md`).

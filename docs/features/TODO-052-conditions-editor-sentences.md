# TODO-052 — Conditions editor as sentences; one expert layer at a time

**Status:** Planned, not started. Depends on 031 and 050 (bands). Part of the mass-market UX track.

**Note (2026-11-12):** the sentence rows and word pickers (`SentenceRow`, `WordPicker`, option sets,
`riskPreset`) are now built in **031**, where the onboarding uses the same component. 052 moves them into the
panel for good and adds what is left: the old controls are removed, the **Map layers** segmented control,
**Best areas** (More / Fewer) and an **Advanced** section (risk strengths, full lists, contrast boost, search
URL). The mock-up ("Mad-libs Onboarding", screen 3) shows the target layout.

Open copy issue found in 031: `noiseAnchor` (`services/buildings/conditions.ts`; 47 / 57 / 67 dB → courtyard / calm /
busy / main road) does not match the picker words (50 / 58 / 65 dB → a courtyard / a calm street / normal city
noise). Decide one set of words when the card and the panel are aligned.

## Problem

The panel is a settings form: six rows of checkbox + slider + gear + sentence, three risk rows with 1–10
sliders labelled "Matters / Important", four map-layer switches each with its own legend, and a floating
best-zones bar with "top 15 %" and an Idealista URL field. The sentences introduced in 049 are the best part
of it, but they sit *under* the sliders instead of *being* the control. The expert layers (noise, three
climate layers) compete with the main controls for the same space.

## Decision

- **The sentence is the control.** Each condition is one line of plain English with tappable words that
  open a small picker: *"No louder than [a busy street · 65 dB] outside my window"*, *"[Everyday services] within
  [10 min] on foot"*, *"[My places] within [30 min] on foot"*, *"A [70 m²] flat costs up to [€280,000] on average"*,
  *"Residents rate the barri at least [7.5]"*, *"Built in [any era]"*.
- Pickers offer **verbal steps**, not continuous sliders: the same option sets as the quiz (031) plus
  "Custom…" which reveals the existing slider for power users.
- **Risks** become one line: *"Avoid [flood and wildfire risk]"* with a picker: Avoid (strength 5) · Strongly
  avoid (8) · Don't care (0) · Custom (three sliders).
- **Expert layers** move under a "Map layers" segmented control: None · Noise · River floods · Street
  flooding · Wildfire. One at a time, one legend. "None" by default.
- **Best zones**: the bar says "Show my best areas" → zones appear; controls are "More areas / Fewer areas"
  (steps of `TOP_PCT_STEPS`) instead of "top X %". The Idealista URL field moves into a "Search filters"
  popover with one sentence of help; unchanged otherwise.
- Nothing changes in the model or the store values; this is a new face on `CompositeControls`,
  `ClimateLayerControls`, the noise switch and `BestZones`.

## Spec

**Sentence rows** (`SentenceRow`): off = greyed sentence with a leading checkbox; on = full colour, words in
brand colour with a dotted underline; tapping a word opens a Mantine `Popover` with 3–4 options + "Custom…".
Picker options per condition: see 031 (same ENV `VITE_QUIZ_*`). The current value is highlighted even when
it is not one of the steps (then "Custom" is highlighted with the value).

**Services / places / eras** pickers: the existing modals, opened from the bracketed word ("Everyday
services" → "My 3 services" once edited).

**Risk line**: `conditionStatus`-style mapping both ways: strengths all equal to 5 → "Avoid"; all 8 →
"Strongly avoid"; all 0 → "Don't care"; anything else → "Custom". Choosing an option sets all three.

**Map layers**: `SegmentedControl`, full width, under the conditions; legend of the chosen layer only; the
info buttons stay. Store keeps the four booleans; the control sets exactly one true.

**Order in the panel** (desktop and mobile drawer): Your conditions (chip row from 031 + "Change") →
sentence rows → risk line → legend (050) → Map layers → attribution.

## Implementation

- `components/FilterPanel/SentenceRow.tsx`, `WordPicker.tsx` (options, custom slider slot).
- `services/conditionOptions.ts` (pure): option sets per condition from ENV; `nearestOption(value)`;
  `riskPreset(strengths)` / `strengthsFor(preset)`.
- `CompositeControls.tsx`: rewrite around `SentenceRow`; keep the gear modals and the info modal.
- `components/FilterPanel/MapLayersControl.tsx`: replaces the noise switch + `ClimateLayerControls`.
- `BestZones.tsx`: copy and the More / Fewer buttons; `BaseUrlInput` into a popover titled "Search filters".
- `FilterPanel.tsx`: new order.
- ENV: reuses `VITE_QUIZ_*` from 031; `VITE_RISK_PRESET_AVOID=5`, `VITE_RISK_PRESET_STRONG=8`.
- Docs: `049-conditions-real-units.md` gets a note that the sliders are now behind "Custom…".

## Tests

- `conditionOptions.test.ts`: options from ENV, nearest option, risk preset round trips.
- `SentenceRow.test.tsx`: off / on states; picking an option updates the store once; "Custom…" shows the
  slider with the current value.
- `MapLayersControl.test.tsx`: exactly one layer visible; "None" clears all; legend follows the choice.
- `BestZones.test.tsx`: More / Fewer step through `TOP_PCT_STEPS`; labels.
- Existing `CompositeControls.test.tsx` updated, not deleted: the same store effects through the new UI.

## Definition of Done

Per `CLAUDE.md`. Manual: on a 375 px phone every sentence fits on two lines; a new user can change the noise
limit without seeing a number in dB unless they open "Custom…".

## Open questions

- Keep the checkboxes at all, or make "Don't care" an option of every picker (= off)? Proposed: checkbox
  stays; it is the fastest way to switch a condition off.

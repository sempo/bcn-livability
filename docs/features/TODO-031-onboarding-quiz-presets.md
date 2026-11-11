# TODO-031 — Onboarding quiz and presets ("What matters to you?")

**Status:** Planned, not started. Rewritten 2026-11-11 for the conditions model (049); the original file
(`TODO-031-weight-questionnaire.md`) was about weights 0–10, which no longer exist.
Part of the mass-market UX track: 050 (match score) → 031 (this) → 051 (ranked areas) → 052 (sentence editor)
→ 053 (shareable URL).

## Problem

A first-time visitor lands on a map already coloured by defaults they never chose, over a panel with ~20
controls. There is no entry point: no question, no explanation, no way to say "I'm a family on a budget" in
10 seconds. Best-in-class tools (Rightmove "Where can I live?", Teleport, the NYT "Where should you live"
quiz) start with 2–4 questions and show a result; the settings panel comes after.

## Decision

- A **first-visit quiz** of 3–4 screens sets the conditions (049); nothing else is new in the model.
- **Presets** are named answer sets to the same quiz. Picking one skips the quiz.
- The quiz is reachable later from the panel ("Change my answers") and from the URL (053).
- Every answer maps to an existing store value: `compositeWeights` (on / off), `conditions` (limits),
  `enabledWalkCategories`, `enabledLandmarkIds`, `ageEras`, `compositeRiskStrengths`.

## User story

*As someone moving to Barcelona, I want to say in a few taps what matters to me and see where I'd like to
live, without learning what Lden or €/m² of a barri means.*

## Quiz

Screen 1 — **"What matters to you?"** Tiles, pick 1–4 (order of tapping = order in the results list):
Quiet · Everything on foot · Close to the centre · Within my budget · The kind of building · What locals think.
Each maps to one condition: noise, poiAccess, cityCore, openPrice, age, localsOpinion (the last one only with
`VITE_FEATURE_LOCALS_OPINION`).

Screens 2…n — **one follow-up per chosen tile**, answered with 3–4 verbal options. The options are the
condition limits (ENV `VITE_QUIZ_*`, defaults below):

| Tile | Question | Options → limit |
|---|---|---|
| Quiet | How quiet? | "Like a courtyard" 50 dB · "A calm street" 58 dB · "Normal city noise" 65 dB |
| Everything on foot | How far would you walk for daily errands? | 5 · 10 · 15 min; then multi-select of the 10 services (all on by default) |
| Close to the centre | How close to the centre? | 15 · 30 · 45 min walk; "the centre" = all 13 places; "Pick places" opens the landmark list |
| Within my budget | Your budget per m²? | €2,500 · €3,500 · €4,500 · €6,000 (each label also shows the share of homes under that budget, computed at load from the building rows and the area price table in `buildings-meta.json` — `price_bounds` only holds p5/p95) |
| The kind of building | Which buildings do you like? | the 5 eras as cards with the era text (`AGE_ERAS`), multi-select |
| What locals think | How happy should residents be with the area? | "Happy" 7.0 · "Very happy" 7.5 · "Among the happiest" 8.0 |

Last screen — **Risks**: "Avoid flood and wildfire risk?" Yes / No. Yes = all three strengths at the default
(5); No = 0. Fine-tuning stays in the editor (052).

Then "Show me the map". Conditions not chosen are **off**.

## Presets

Shown on screen 1 under "or start from": **Family** (quiet 58, foot 10 min with school + kindergarten + park +
supermarket + pharmacy, budget 3,500, risks on), **Remote worker** (foot 10 min with café + supermarket + park,
centre 30, quiet 58), **City life** (centre 15, foot 5 min with café + restaurant + metro, noise 65),
**Investor** (budget 3,500, centre 30, locals 7.5). Values in `services/presets.ts`, overridable by ENV
`VITE_PRESET_<NAME>` as JSON (optional; defaults in code).

A preset is just the quiz pre-answered: the user can still edit.

## UI

- Full-screen modal over the map on first visit (`localStorage` flag `bcn_onboarded`), skippable ("Just show
  me the map" keeps the defaults).
- One question per screen, big tap targets, progress dots, back button. Mobile first.
- The panel gets a row at the top: *"Your conditions: quiet · on foot · budget"* with "Change" → quiz.
- Copy in English (`docs/DESIGN.md`).

## Implementation

- `components/Onboarding/` — `OnboardingModal.tsx`, `QuizScreen.tsx`, `TileGrid.tsx`, `OptionList.tsx`,
  `PresetCards.tsx`.
- `services/quiz.ts` (pure): `QuizAnswers` type; `answersToSettings(answers) → { weights, conditions,
  categories, landmarks, eras, riskStrengths }`; `settingsToAnswers` (best match, for "Change my answers").
- `services/presets.ts`: `PRESETS: Preset[]` (id, name, blurb, answers).
- Store: `applySettings(partial)` action that sets all six values at once (one rescoring, not six).
- `App.tsx`: mount the modal when `!localStorage.bcn_onboarded`.
- ENV: `VITE_QUIZ_NOISE_OPTIONS=50,58,65`, `VITE_QUIZ_WALK_OPTIONS=5,10,15`,
  `VITE_QUIZ_CENTRE_OPTIONS=15,30,45`, `VITE_QUIZ_PRICE_OPTIONS=2500,3500,4500,6000`,
  `VITE_QUIZ_LOCALS_OPTIONS=7.0,7.5,8.0`. Add to `.env.local.example`, `.env.production`, `ARCHITECTURE.md`.

## Tests

- `quiz.test.ts`: every answer combination produces valid store values; unchosen tiles are off; round trip
  `settingsToAnswers(answersToSettings(a))` for each preset.
- `presets.test.ts`: every preset passes the same checks; names unique.
- `OnboardingModal.test.tsx`: first visit shows the modal; skip keeps defaults; completing the quiz calls
  `applySettings` once with the expected values; `bcn_onboarded` is set; "Change" reopens with the current
  answers.

## Definition of Done

Per `CLAUDE.md`, plus: completing the quiz on a phone (375 px) takes ≤ 5 taps for a 2-tile answer; the map
shows a visible difference between two presets.

## Open questions

- Should "Within my budget" be on by default in the quiz (most people have one)? Proposed: pre-selected.
- Where the quiz first appears on mobile vs desktop: same modal for both (proposed).

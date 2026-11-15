# TODO-070 — Building card for the launch: explicit match, rank in the barri and in the city, details folded

**Status:** Planned, not started. Agreed with the owner on 2026-11-15 as the product change the media launch needs
(`docs/media/STRATEGY.md`). The interface stays as it is; this feature changes the building card only. The design
below was agreed with the owner on 2026-11-15 except where it says "open"; no code yet. Extends 050 (match header), 062 (phone sheet), 063 (share image).

## Problem

The launch story is one sentence: say what matters to you, tap any building, see how well it fits you and how it
compares with its barri and with the city. The card does not yet say that plainly:

- The score line reads "Good match · 83". It is not obvious that 83 is the match with *my* conditions.
- "Meets 3 of 4 of your conditions" has no "compared with what". Nothing says how the building stands among others.
- Below the match header the card shows everything at once: Catastro facts, noise by facade, walking times, building
  age, climate risks, the barri block. For a person who came from a link it is a wall of technical data.

## Decision

1. **The score is named for what it is:** how well this building matches my conditions.
2. **Two new lines: the rank of the building, for my conditions,** in its barri and in the city.
3. **Each rank is tied to a scale**, so that "better than 90%" reads as very good and "better than 5%" as poor
   without thinking.
4. **The technical details are folded** under an expandable section, closed by default.
5. **The match with each condition stays where it is,** at the top and visible: "Meets 3 of 4" and the rows.

Rules agreed on the way:

- **No general score.** Both ranks are computed under the person's current conditions only. A general score next
  to the personal one, as Vivino shows an average rating next to "Match for You" (`docs/media/VIRAL_CASES.md`,
  case 14), was considered and rejected: ours could only be the score under conditions we picked, and the project
  left a single index on purpose (049). While the person has not changed anything, "your conditions" are the ones
  the map opens with.
- **Neutral wording.** "This building" or its address, never "your home": the person may be looking at their own
  home, a relative's, or one they are considering.
- **"Barri"** is one of the 73 administrative barris (outside Barcelona: the municipality), not a street block.

## Proposed card, top to bottom (to agree)

| # | Block | Now | Proposed |
|---|---|---|---|
| 1 | Address, photo | as is | as is |
| 2 | Score | "Good match · 83" | a small label above it, "Match with your conditions", then "83 of 100 · Good match" in the band colour |
| 3 | Conditions | "Meets 3 of 4 of your conditions" and one row per condition with ✓ ◐ ✗ | unchanged |
| 4 | Risk line | "Risk: −6 points — river flooding" | unchanged |
| 5 | **Rank in the barri** | — | under a heading "For your conditions": "Barri: la Vila de Gràcia — better than 80% of homes", with a bar and a word (see below) |
| 6 | **Rank in the city** | — | "City: Barcelona — better than 64% of homes", with a bar and a word |
| 7 | Save image, Share | as is | as is; the two ranks go on the picture |
| 8 | **Details** (closed) | open sections: Catastro facts, noise by facade, walking times, age, climate risks, barri block | one expandable section "Details about this building" holding the same sections in the same order |

### The rank scale

- A horizontal bar from 0 to 100% with a marker at the building's place, drawn in the match colour ramp
  (`docs/DESIGN.md`): low on the left, high on the right.
- A word next to the number, by thresholds kept in ENV (`VITE_RANK_BANDS`, default `75,50,25`): from 75% up, 50–75%,
  25–50%, under 25%. The first draft ("among the best / above average / below average / among the weakest") was
  rejected by the owner: "weakest" is too harsh. The words below describe the place in the order or the fit with
  the person's wishes, never the worth of the building or the person.
- **Words, per language** (written for each language, not translated from English; for the native read-through, 065):

| Band | EN | ES | CA |
|---|---|---|---|
| 75% and up | Among the best fits | Entre los mejores encajes | Entre els millors encaixos |
| 50–75% | Above the middle | Por encima de la mitad | Per sobre de la meitat |
| 25–50% | Below the middle | Por debajo de la mitad | Per sota de la meitat |
| under 25% | Many others fit you better | Muchas otras opciones encajan mejor | Moltes altres opcions encaixen millor |

  Why these words: they use the vocabulary the app already has in ES and CA ("encaje", "encaix": the band labels
  are "Buen encaje", "Bon encaix", "Encaje débil", "Encaix feble"). The lowest band is a statement about other
  homes, not about this one, and it is still true (under 25% means most homes score higher). "Opciones"
  ("opcions") avoids the gender of "vivienda / edificio" and fits a choice of where to live. "Débil / feble" stays
  in the score's own band label, which the rank words must not repeat. ES and CA address the person as "tú / tu",
  like the rest of the app.
- **The scope goes in a label, not in the sentence.** "Barri: la Vila de Gràcia", "City: Barcelona" (ES "Barrio:",
  "Ciudad:"; CA "Barri:", "Ciutat:"). Names like el Raval, l'Antiga Esquerra, l'Hospitalet, Esplugues would need
  "de + article" contractions in Spanish and Catalan (del Raval, de l'Antiga, d'Esplugues) that no template can get
  right for all 73 barris and 35 municipalities. Outside Barcelona the label reads "Municipality:" / "Municipio:" /
  "Municipi:".
- **The heading "For your conditions"** ("Para tus condiciones" / "Per a les teves condicions") stands once above
  both lines, and on the picture; with a profile it can read "For a family".
- **Numbers:** follow the number format the locale files already use for percentages; check ES and CA in the
  read-through (spacing before "%" differs by convention).
- On a phone (062) both ranks are visible in the half-open sheet without scrolling.

### What "better than N%" counts

- The final score of the building (0–100, after penalties) against the final scores of the other residential
  buildings in the same scope, under the same conditions. N = share of buildings with a lower score.
- Computed in the scoring worker after each rescoring: a histogram of scores (101 bins) per area and one for the
  city; the card reads the rank from them. No server, no new data file.

## Open questions

1. **Ties (decided).** Every building that meets all conditions scores 100. With lenient conditions most of a barri
   can score 100, and a perfect building would count as "better than 36%" only (the rest tie with it). When the
   building is in the top group, the line changes to "Among the best: 64% of homes here fit as well" (ES: "Entre
   los mejores encajes: el 64 % de las viviendas encaja igual de bien"; CA: "Entre els millors encaixos: el 64 %
   dels habitatges hi encaixen igual de bé"), and the marker sits at the right end of the bar. The top group is the
   buildings with the maximum score of the scope.
2. **"The city" outside Barcelona.** Proposal: first line = barri (Barcelona) or municipality (elsewhere); second
   line = Barcelona for a Barcelona building, "the Barcelona area" (every building in the data) for the rest.
3. **Incomplete data (060).** Proposal: no rank lines when the building itself has a score range; a note instead.
4. **Small areas.** Below `AREA_MIN_BUILDINGS` buildings the barri line is hidden.
5. **No conditions set (061):** no score, no ranks, as today.
6. **Unit.** We count buildings, not dwellings. The UI already says "homes" for buildings; keep, or say "buildings"?
7. **What stays outside "Details" (decided).** Nothing technical: the barri block (price, what locals say) is
   folded inside "Details" with the rest.
8. **Does "Details" remember that it was opened** while the person moves from building to building? Proposal: yes,
   for the session.
9. **The phone sheet header** (062) shows the band in compact mode: it gets the same label and wording as block 2.

## Changes elsewhere

- Share image (063): the two rank lines on the building picture, next to the score and "For whom". The profile or
  the conditions always stay on the picture: a rank without them would read as a rank of the building in general.
- Texts in EN, ES, CA (`locales/*/card.json`, `conditions.json`); ES and CA go into the native read-through (065).
- `docs/features/050-match-score.md`, `062-mobile-web.md`, `063-share-image.md`, `docs/PROJECT_BRIEF.md` (user
  flow, step 4) are updated when this ships.

## Tests (write first)

- Rank service: known scores → expected percentages for the area and the city; ties per the chosen rule; small
  area; incomplete data; a building outside Barcelona; the band word for each threshold.
- Worker protocol: histograms come back with the scores and change with the settings.
- `MatchHeader`: label and wording of the score; the two rank lines with the area name; hidden in the cases above.
- `BuildingCard`: details are closed by default and open on a click; existing section tests run with them open.
- Share image model and drawing: the rank lines are on the building picture.
- Locale completeness for the three languages; ENV file test for `VITE_RANK_BANDS`.
- Integration: choose a profile, select a building, read the score, both ranks and the rows; change a condition
  and the numbers change.

## Definition of done

As in `CLAUDE.md`; plus the card checked in a phone viewport (half-open sheet) and a saved picture checked by eye.

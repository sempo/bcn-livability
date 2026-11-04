# TODO-048 — Energy certificates and ground-floor premises (draft)

**Status:** Draft 2026-11-04, taken out of 046. Do not start until this text is agreed. Kept separate from
building age (047).

## Idea

Two more facts about the specific building, from open data.

1. **Energy performance certificates (ICAEN, Generalitat open data).** These show how cold or hot the flat is
   likely to be and how much the bills cost: the rating letter A–G, consumption (kWh/m² a year) and emissions.
2. **Ground-floor premises census of Barcelona** (`cens-locals-planta-baixa-act-economica`). This shows what is
   downstairs: a bar or restaurant (night noise, smells, terraces), a shop, or an empty premises.

## Questions to answer before planning

**Energy certificates**
- Coverage: a certificate exists only where a dwelling was sold or rented since 2013, or a building applied
  for one. What share of our buildings has at least one, in Barcelona and in the AMB?
- Match to buildings: by cadastral reference (if the dataset has one), by address, or by point in footprint?
- One building, many certificates (one per flat). Show the distribution ("12 flats certified: 2 D, 7 E,
  3 F"), or the median letter?
- Is a missing certificate a gap (black outline) or just absent?

**Ground-floor premises**
- Barcelona only, like street flooding. What to show outside the city?
- Match: premises point → building footprint (or the nearest one within a few metres).
- Which activities matter for living above them: bars and restaurants, night-life, workshops? Empty premises
  as a sign of a dead street?
- How fresh is the census (year), and is it updated?

**Both**
- Card only, a weight, or a filter? Start with the card and decide after seeing real buildings.
- Licence and attribution.

## Not doing

Heat-wave cooling demand (`comportament-energetic-edificis`): still only an idea in TODO-046 open questions.

## Definition of Done

Standard (see `CLAUDE.md`).

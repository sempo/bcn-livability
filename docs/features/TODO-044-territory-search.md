# TODO-044 — Territory search

**Note (2026-11-04):** the hexes were removed in TODO-046; where this file says hex / cell, read building.

**Status:** Draft. Not planned for the first release.

## Idea

A "Search a neighbourhood" box over Barcelona districts, barris and AMB municipalities, including colloquial
names (El Born, Poblenou, …). Picking a result fits the hex map to the territory and draws its outline.

User story: *As someone relocating to Barcelona, I already know a few neighbourhood names, so I want to jump
straight to one instead of hunting for it on the map.*

## Notes

- Territory cards and the adm map mode were dropped (DEPRECATED-027): an area has no meaningful single score.
  If search is built, it brings back only "variant A" from that file: a territory URL opens the regular hex map
  focused on the place, with a small facts-only panel (no score, no rank).
- Needs a colloquial-name dictionary (El Born, Poblenou → several barris) for matching; see DEPRECATED-027.
- Later scope: metro stations and named places (e.g. La Rambla) as searchable objects.
- Analytics: `search_used`, `territory_opened {source: search}`.
- Possibly worth it for SEO as well: territory URLs give search engines one page per place (see DEPRECATED-027).

## Definition of Done

Standard (see `CLAUDE.md`).

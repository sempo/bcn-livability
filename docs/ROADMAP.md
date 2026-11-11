# Roadmap (planned tracks, 2026-11-11)

One file per feature in `docs/features/` (`TODO-` = not started). This file only gives the order and the
dependencies. Status lives in the feature files.

## Track A — scale: before any press link

| Order | Feature | Depends on | Why first |
|---|---|---|---|
| A1 | TODO-054 hosting: CDN cache, our server as origin, versioned data | — | GitHub Pages cannot take a spike |
| A2 | TODO-056 observability | — (self-hosted parts need A1's server) | can't run a launch blind |
| A3 | TODO-055 own basemap, static metro, Catastro offline | A1 | third-party servers are the next thing to break |
| A4 | TODO-057 CI gate, branch previews, data out of git | A1 | safe hotfixes under load |
| A5 | TODO-058 worker scoring, bundle budget | A1 | mobile traffic from press |
| — | TODO-059 API for the personal mode | A1 | design only; when isochrones go public |

## Track B — mass-market UX

| Order | Feature | Depends on |
|---|---|---|
| B1 | 050 match bands, card header (done 2026-11-11) | — |
| B2 | TODO-044 address / area search | — |
| B3 | TODO-031 onboarding quiz and presets | B1 |
| B4 | TODO-051 ranked areas, area view at low zoom | B1 (bands), B5-independent |
| B5 | TODO-052 sentence editor, one expert layer, simpler best zones | B3 |
| B6 | TODO-053 settings in the URL, Share | B3 (presets as URL tokens) |

Tracks A and B are independent of each other; A1 + A2 + B1 are the minimum before a launch post.
Design briefs for track B: `local-docs/design/` (not in git). Architecture notes for track A:
`local-docs/architecture/` (not in git).

## Later (unchanged)

TODO-028 i18n, TODO-029 CTA, TODO-030 landing page, TODO-033 multi-city, TODO-040 green index,
TODO-041 market activity, TODO-043 noise outside Barcelona, TODO-048 energy certificates.

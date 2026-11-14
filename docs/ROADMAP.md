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
| B2 | 044 address / area search (done) | — |
| B3 | 031 onboarding: profiles + one sentence (done 2026-11-12) | B1 |
| B4 | 051 ranked areas, area view at low zoom (done 2026-11-12) | B1 (bands), B5-independent |
| B5 | 052 sentence editor, one expert layer, simpler best zones (done 2026-11-12) | B3 |
| B6 | 053 settings in the URL, Share (done 2026-11-12) | B3 (presets as URL tokens) |

Tracks A and B are independent of each other; A1 + A2 + B1 are the minimum before a launch post.
Design briefs for track B: `local-docs/design/` (not in git). Architecture notes for track A:
`local-docs/architecture/` (not in git).

## Later (unchanged)

TODO-029 CTA, TODO-030 landing page, TODO-033 multi-city, TODO-040 green index,
TODO-041 market activity, TODO-043 noise outside Barcelona, TODO-048 energy certificates.

## Launch strategy: functionality vs. reach (2026-11-13)

Question: for a mass launch, add more features (the gated ones), or keep the current ones and work on
landing, speed and publications? **Decision: keep the current functionality, work on reach.** No gated feature
is switched on for the launch.

### Why (what made similar products go viral)

Walk Score, Hoodmaps, Chronotrains and the BBC "Where can I afford to live?" calculator spread because of
reach, not breadth:

- **One idea in one sentence.** Walk Score is one number; Chronotrains is "where can you get by train in 5 hours".
- **A personal result in 10 seconds.** The person types their own address and sees something about themselves.
- **A result worth sharing or arguing about.** "My barri is 3rd" or "my street is called noisy" touches identity,
  and people share that.
- **The press needs a story, not a tool.** "The 10 quietest barris of Barcelona" gets written; "a new map with
  filters" does not.
- **Traffic comes from phones, from a link, in one spike.** Anyone who waits more than ~3 s or hits an error is lost.

### Why not the gated features

`ISOCHRONE`, `PINS`, `SCREENSHOT`, `EXCLUSIONS` serve the second mode (comparing listings already found). That is the
bottom of the funnel: useful to people who are buying, not to people who clicked out of curiosity. `ISOCHRONE` and
`SCREENSHOT` also need a server or a secret key, which adds a point of failure exactly at the traffic peak.
Keep them as reasons for a second and third wave of publications ("now with your commute").

### Positioning risk

"A map for foreigners to buy a home in Barcelona" can go the wrong way during the housing crisis. The safer and
more shareable framing is "how liveable is your street", addressed to residents. Buyers still find the product.
Open question for the owner: who is the first-wave audience (residents or expat buyers)? It decides the language
order and the press angle.

### Features for the launch

| Order | Feature | Why | Depends on | File |
|---|---|---|---|---|
| L1 | **Share image of the result** (**required**) | a link without a picture does not travel; this is the only new feature the launch needs | 053 (Share URL) | 063 (done 2026-11-13) |
| L2 | **Language switch** (**required**) | a local launch on an English-only tool will not spread: press, residents, social media | — | 065 (was 028; done 2026-11-14, ES / CA need a native read-through) |
| L3 | **Embeddable widget** for real-estate agencies | each embed is a permanent backlink and a free distribution channel; see below | A1, L1, licence check | not written yet |
| L4 | Address-first entry: the search box is the first action, not the conditions panel | a personal result in 10 seconds | 044 | not written yet |
| L5 | 2–3 press stories built from our own data (quietest barris, everything within 10 min on foot, price vs. liveability) | the press writes stories, not tools | L1 | no code, a data note |
| — | Landing page | after the above: viral traffic goes straight into the map, an extra screen only loses it | — | TODO-030 (stays later) |

The infrastructure items stay as they are: **A1 (hosting) + A2 (observability) + mobile (062)** are the minimum
before any press link.

#### L1. Share image of the result (required) — done 2026-11-13, see `docs/features/063-share-image.md`

A link preview (Open Graph / Twitter card) and a downloadable image showing the user's result: the address or
barri, the match band and score, the conditions that were met, and the map around it. Needs a way to render an
image from the URL state (053): a small image service behind the CDN, or pre-rendered images for the ~70 barris
plus a client-side canvas for an address. Static hosting cannot set per-URL meta tags, so this depends on A1.
Also a "Save image" / native share button on the building card and the area card (the area card and the building link: 064, done 2026-11-14).

#### L2. Language switch (required)

A visible switch with Catalan, Spanish and English (the order depends on the audience decision above). It also
covers number formats and the texts generated from conditions (the one-sentence settings, the card summary).
Scope and design are in 065 (EN / ES / CA, any number of languages, texts in `frontend/src/locales/`, guide in `docs/TRANSLATING.md`). The language goes into the URL (053) so shared links open in the same language.

#### L3. Embeddable widget for agencies

An agency puts a small, good-looking block of ours on its own listing page: for the listing's address, the
livability score, the band and a short list of the conditions, plus a link "see on the map". Options to evaluate
(first pick is the cheapest):

1. **iframe** of a stripped-down page (`/embed?lat=…&lng=…`): no panel, one card, no account. One line of HTML for
   the agency. Needs framing to be allowed (`frame-ancestors`), which GitHub Pages cannot set, so it depends on A1.
2. **Static image / badge** (reuses L1): an `<img>` per address, works anywhere, nothing to run on the agency side,
   but not interactive.
3. **Web component / script tag** (`<bcn-livability lat lng>`): nicer for agencies, more to maintain; later.

Conditions: the widget always links back to the map (this is the point of it); it must not leak the user's
settings; it must be cheap to serve under load (precomputed per building where possible).
**Open risk:** the data licences must allow showing derived scores on commercial sites. Check every source in
`docs/DATA_LICENSES.md` before this ships, and the Idealista links must stay out of the widget.

### Not in this list (decided)

Gated features stay off. Multi-city (033), green index (040), market activity (041) and the other "Later" items
wait until the launch has shown what people ask for.

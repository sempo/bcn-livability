# Design

Synced with the code on 2026-11-11 (`frontend/src/main.tsx`, `index.css`, layer components).

## Brand and type

| Token | Value | Usage |
|---|---|---|
| Primary (time2map coral) | `#F06965` | Mantine `brand` colour (shade 6): checkboxes, switches, sliders; workplace marker |
| Font | IBM Plex Sans, `system-ui` fallback | all UI text |
| Ink | `#1f2937` | body text (`--ink`) |
| Panels | white 82 %, `blur(16px)`, border `rgba(0,0,0,0.06)`, shadow `0 8px 28px rgba(0,0,0,0.14)` | brand bar, filter panel (`.glass-panel`) |

## Map colours

| Element | Value |
|---|---|
| Livability Index | RdYlGn ramp `#d73027` → `#fc8d59` → `#fee08b` → `#91cf60` → `#1a9850`, fixed on 0–100 with four named bands (Great / Good / Partial / Poor match, TODO-050); "Boost contrast" fits it to the visible area (032); fill opacity 0.75, dots 0.85 |
| Incomplete data (060) | light diagonal hatch over the score colour: thin on buildings (6 px period), wide on areas (20 px period); white stripes at 60 % alpha |
| Hovered / selected building | white outline, 2 px |
| Best zones | `#6741d9`, dashed outline, light fill, numbered |
| Search result (area) | `#1971c2`, solid 3 px outline, fill 6 %; address = marker of the same colour |
| Isochrone | black mask at 25 % outside the zone, white 1.5 px outline, label "N min from work" |
| Exclusion zones | `#555555`, fill 28 %, outline 1.5 px |
| Noise, flood, wildfire, street flooding | official palettes of each source (see the legend components) |

## Layout

- Desktop: brand bar, search box and filter panel at the top left, over the map. The building card opens on the right. With
  pins on, the compare pane sits on the left in a resizable split.
- Mobile (≤ 768 px, TODO-062): the map is always visible. One bottom sheet with three positions (peek, half, full)
  holds the conditions, the ranked areas and the building card; full stops below the search pill, and a tap on
  peek opens it halfway. Peek shows the conditions that are on, or the
  building's address and match. The colour scale, "About" and "Where am I" float above the sheet. On top, one
  search pill with the product name as placeholder (the first visit shows the full name bar instead). No zoom
  buttons, rotation or tilt. Touch targets are 44 px (word pills 36 px with a larger hit area); inputs are 16 px;
  fixed elements respect the safe areas. With pins on, there is a Map / Compare toggle.
- The colour scale and the best zones use the visible part of the map: the viewport minus the panel and the card
  (on a phone, minus the sheet at peek or half).

## Language

All UI text is in English.

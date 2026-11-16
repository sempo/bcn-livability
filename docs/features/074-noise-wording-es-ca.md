# 074 — Noise wording in Spanish and Catalan

Follows the "honest names" rule of [073](073-score-model-audit.md) (C1).

## Problem

The noise condition measures one number: Lden in dB on the facade that faces the street. In Spanish and Catalan it
was named with *tranquilo / tranquil* ("Tranquilidad", "Tranquil·litat"). English *quiet* is about sound; *tranquilo*
is wider: calm, little traffic and few people, no night life, and in "barrio tranquilo" often *safe*. "Tranquilidad"
also reads as "peace of mind". The name promised more than the score measures, and the same word already describes
the feel of a neighbourhood in the area texts.

Two more problems were fixed in passing:

- "lado calle / lado patio", "costat carrer / costat pati" are calques of *street side*. Spanish says
  "fachada a la calle / al patio"; Catalan "façana de carrer / de pati".
- "¿Qué tan…?" is Latin American Spanish; peninsular Spanish uses other forms. "Com de a prop" in Catalan is clumsy.

## Decision

| Where | Before (ES / CA) | After (ES / CA) |
|---|---|---|
| Condition name, chip, add button (`conditions:label/short/add.noise`) | Tranquilidad, Tranquilo / Tranquil·litat, Tranquil | Poco ruido / Poc soroll |
| Sentence (`editor:sentence.noise`) | …en el lado calle / …al costat carrer | …en la fachada a la calle / …a la façana de carrer |
| Editor title (`editor.noiseTitle`) | ¿Qué tan tranquilo debe ser el lado calle? / Com de tranquil ha de ser el costat carrer? | ¿Cuánto ruido aceptas en la fachada a la calle? / Quant soroll acceptes a la façana de carrer? |
| Card and info (`card:side.*`, `card:noise.scored*`, `quietSide`, `info.noiseTitle`, `info.noise`) | Lado calle / patio, Costat carrer / pati | Fachada a la calle / al patio, Façana de carrer / de pati |
| Info reference levels | una calle calmada / un carrer calmat | una calle tranquila / un carrer tranquil |
| Other editor titles (ES) | ¿Qué tan cerca del centro?, ¿Qué tan contentos…? | ¿A qué distancia del centro?, ¿Cuánto deben valorar los vecinos la zona? |
| Other editor title (CA) | Com de a prop del centre? | A quina distància del centre? |

Kept as they are, because a dB number stands next to them or a whole picture is meant: the reference
"una calle tranquila / un carrer tranquil" (58 dB), "patio tranquilo", the card scale "muy tranquilo / tranquilo",
"Fachada al patio, tranquila", the profile blurbs and the neighbourhood texts. The card score row stays "Ruido / Soroll"
(it shows the dB value).

The name is "Poco ruido", not "Ruido": the label is put into "Lo mejor: …" and "Destaca en: …", where "ruido" would
read as a strength of being noisy.

English does not change ("Quiet" is about sound).

## Tests

- `src/i18n/translated-ui.test.tsx`: the sentence says "en la fachada a la calle"; in ES and CA the short label, the
  condition label and the "strongest" line name the condition "Poco ruido / Poc soroll".

## Definition of Done

- [x] Tests, lint, typecheck green.
- [x] Checked in the dev server (ES, CA): editor row, card noise block.

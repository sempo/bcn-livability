import type { Profile } from '../conditionOptions'
import {
  BAND_COLOR, BAND_LABEL, CONDITION_LABEL, matchBand, type ConditionId, type ConditionStatus, type MatchBandId,
  type MatchSummary,
} from '../match/matchSummary'
import { PRESETS } from '../presets'
import { decodeConfig, encodeConfig, type UrlSettings } from '../urlConfig'

// What a share image says (TODO-063). Pure: the building card and the build script both turn their data into this
// model, and the drawing (shareImageDraw.ts) only paints it. The image never carries a house number (privacy) and
// has no "Meets N of M" line; the rows carry the detail.

/** Rows on an image, the risk row included. */
export const MAX_ROWS = 4

export type RowStatus = ConditionStatus | 'risk'

export interface ShareRow {
  status: RowStatus
  text: string
}

export interface ShareModel {
  kind: 'building' | 'area'
  /** Street without a number, or the name of the area. */
  place: string
  /** "Can Baró, Barcelona"; null when the area is not known. */
  subtitle: string | null
  /** "For a family"; null when the settings are not a profile. */
  forWhom: string | null
  /** The big number: the score, or "62%" for an area. */
  value: string
  /** The band name, for a building ("Good match"). */
  bandLabel: string
  band: MatchBandId
  /** Colour of the plaque behind the number. */
  bandColor: string
  /** Under the number, for an area ("of homes are a good match"). */
  caption: string | null
  rows: ShareRow[]
}

/** "For a family": the profile in words. Profiles from an override or a new one fall back to the name. */
const FOR_PHRASE: Record<string, string> = {
  family: 'For a family', remote: 'For a remote worker', city: 'For city life', investor: 'For an investor',
}
const forWhom = (profile: Pick<Profile, 'id' | 'name'> | null) =>
  profile ? FOR_PHRASE[profile.id] ?? `For ${profile.name}` : null

/** "Carrer Tenerife 59 · Carrer Torre Dulac 14" → "Carrer Tenerife": the first street, no house number. */
export function streetOnly(address: string | null | undefined): string | null {
  const first = address?.split(' · ')[0]?.trim()
  if (!first) return null
  const name = first.replace(/\s+(?:\d+[A-Za-z]?(?:\s*-\s*\d+[A-Za-z]?)?|s\/n)$/i, '').trim()
  return name || null
}

/** The profile whose settings these are exactly, or null (a changed limit, a hand-made set, the defaults). */
export function profileOf(settings: UrlSettings, defaults: UrlSettings, presets: readonly Profile[] = PRESETS): Profile | null {
  const mine = encodeConfig(settings, defaults)
  if (mine === '') return null
  return presets.find((p) => {
    const s = decodeConfig(`preset:${p.id}`, defaults)
    return s !== null && encodeConfig(s, defaults) === mine
  }) ?? null
}

interface AreaRef { name: string; kind: 'barri' | 'muni' }

const subtitleOf = (area: AreaRef | null) =>
  area ? (area.kind === 'barri' ? `${area.name}, Barcelona` : area.name) : null

export function buildingShareModel(input: {
  address: string | null
  area: AreaRef | null
  /** The score as the map colours it: the best case when the data is incomplete (060). */
  score: number
  summary: MatchSummary
  riskText: string | null
  profile: Pick<Profile, 'id' | 'name'> | null
}): ShareModel {
  const band = matchBand(input.score)
  const rows: ShareRow[] = input.summary.rows.map((r) => ({ status: r.status, text: `${r.label}: ${r.text}` }))
  const risk: ShareRow[] = input.riskText ? [{ status: 'risk', text: input.riskText }] : []
  return {
    kind: 'building',
    place: streetOnly(input.address) ?? input.area?.name ?? 'Barcelona',
    subtitle: subtitleOf(input.area),
    forWhom: forWhom(input.profile),
    value: String(input.score),
    bandLabel: BAND_LABEL[band],
    band,
    bandColor: BAND_COLOR[band],
    caption: null,
    rows: [...rows.slice(0, MAX_ROWS - risk.length), ...risk],
  }
}

export function areaShareModel(input: {
  rank: { name: string; kind: 'barri' | 'muni'; shareGood: number; mean: number; strongest: readonly ConditionId[] }
  profile: Pick<Profile, 'id' | 'name'> | null
}): ShareModel {
  const { rank } = input
  const band = matchBand(rank.mean)
  return {
    kind: 'area',
    place: rank.name,
    subtitle: rank.kind === 'barri' ? 'Barcelona' : 'Metro area',
    forWhom: forWhom(input.profile),
    value: `${Math.round(rank.shareGood)}%`,
    bandLabel: BAND_LABEL[band],
    band,
    bandColor: BAND_COLOR[band],
    caption: 'of homes are a good match',
    rows: rank.strongest.slice(0, MAX_ROWS).map((id) => ({ status: 'met' as const, text: `Strong on: ${CONDITION_LABEL[id]}` })),
  }
}

/** "barcelona-livability-vila-de-gracia.png" */
export function shareFileName(place: string, ext: 'png' | 'jpg'): string {
  const slug = place.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `barcelona-livability${slug ? `-${slug}` : ''}.${ext}`
}

/**
 * Breaks `text` at spaces into lines no wider than `maxWidth` (`measure` gives the width of a string). A word wider
 * than the line stays on its own line. Past `maxLines` the last line is cut with an ellipsis.
 */
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (line && measure(next) > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = `${kept[maxLines - 1]} ${lines.slice(maxLines).join(' ')}`
  while (last.length > 1 && measure(`${last}…`) > maxWidth) last = last.slice(0, -1)
  kept[maxLines - 1] = `${last.trimEnd()}…`
  return kept
}

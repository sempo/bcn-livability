import { SCORE_RAMP } from '../BuildingsLayer/scoreRamp'

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1)
  const [r2, g2, b2] = hexToRgb(c2)
  const r = Math.round(r1 + (r2 - r1) * t).toString(16).padStart(2, '0')
  const g = Math.round(g1 + (g2 - g1) * t).toString(16).padStart(2, '0')
  const b = Math.round(b1 + (b2 - b1) * t).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

/** Color for sub-scores — always full 0–100 scale. */
export function scoreColor(score: number): string {
  for (let i = SCORE_RAMP.length - 1; i >= 0; i--) {
    if (score >= SCORE_RAMP[i].stop) return SCORE_RAMP[i].color
  }
  return SCORE_RAMP[0].color
}

/** Color for composite score — on the map's colour scale (fitted to the visible area, TODO-032). */
export function scoreColorForRange(score: number, min: number, max: number): string {
  const ramp = SCORE_RAMP
  if (max <= min) return scoreColor(score)
  const span = max - min
  const stops = ramp.map((s, i) => ({ color: s.color, val: min + span * (i / (ramp.length - 1)) }))
  const t = Math.max(0, Math.min(1, (score - min) / span))
  const idx = t * (ramp.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.min(Math.ceil(idx), ramp.length - 1)
  if (lo === hi) return stops[lo].color
  return lerpColor(stops[lo].color, stops[hi].color, idx - lo)
}

/** One decimal, rounding half up (6.55 → 6.6; toFixed alone gives 6.5). */
export const dec1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1)

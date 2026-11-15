import { BAND_COLOR, BAND_LABEL, BAND_ORDER } from '../match/matchSummary'
import { wrapLines, type RowStatus, type ShareModel } from './shareImageModel'

// Paints a share image (TODO-063) on any Canvas 2D context: the browser's (the "Save image" button) and Node's
// (@napi-rs/canvas, at build time). The map behind the panel is passed in, because the two worlds have different
// maps: a snapshot of the live map, or the areas coloured by their share of good homes.

export type ShareFormat = 'og' | 'post'

/** Pixel sizes: 1200×630 for a link preview, 1080×1350 (4:5) for the saved image. */
export const FORMAT_SIZE: Record<ShareFormat, { width: number; height: number }> = {
  og: { width: 1200, height: 630 },
  post: { width: 1080, height: 1350 },
}

export const FONT = '"IBM Plex Sans", system-ui, sans-serif'
const INK = '#1f2937'
const MUTED = '#4b5563'
const BRAND = '#F06965'
const PARTLY = '#92400e'
const MISSED = '#b91c1c'

// The time2map mark (public/time2map-mark.svg), 53 × 76 in its own units.
const MARK_PATH =
  'M26.5454 0.642914C41.3184 0.642915 53.3219 12.6711 53.3219 27.2439C53.3219 43.8986 36.7017 62.8662 26.5454 75.3571C16.3887 63.5601 1.00493e-05 43.2043 0 27.2439C1.27399e-06 12.6712 12.003 0.643079 26.5454 0.642914ZM37.2209 11.8677C36.2941 10.2136 34.4087 9.34263 32.5486 9.70989L14.5117 13.2715C12.662 13.6367 11.2532 15.1441 11.0136 17.0143L8.68752 35.1696C8.44553 37.0589 9.45192 38.8881 11.177 39.6956L28.2552 47.6905C29.9803 48.498 32.0296 48.0985 33.3254 46.7025L45.7542 33.3135C47.0484 31.9194 47.2952 29.8493 46.3656 28.1898L37.2209 11.8677Z'
const MARK_W = 53.3219
const MARK_H = 75.9

/** Where the place is on the picture, and the room the map has (the rest is under the panel). */
export interface MapSlot {
  /** The whole picture. */
  width: number
  height: number
  /** Centre of the part of the map that stays visible; the place goes here. */
  focus: { x: number; y: number }
}

export interface DrawOptions {
  format: ShareFormat
  /** Paints the map over the whole picture. It returns where the place ended up (the pin is drawn there), or null. */
  drawMap: (ctx: Ctx, slot: MapSlot) => Placed | Promise<Placed>
  /** Under the panel, bottom left of the map. */
  attribution: string
  /** "livability.time2map.com" */
  domain: string
}

export type Ctx = CanvasRenderingContext2D
type Placed = { x: number; y: number } | null

interface Metrics {
  /** The white panel. */
  panel: { x: number; y: number; w: number; h: number; r: number; padTop: number; padBottom: number; padX: number }
  forWhom: number
  place: number
  subtitle: number
  plaque: { number: number; label: number; small: number; padX: number; padY: number; r: number; gap: number }
  row: { size: number; icon: number; gap: number; between: number }
  footer: number
  pin: number
  attribution: number
  /** Stacked on white (the map in a rectangle on top, brand line above it) instead of a card over the whole map. */
  sheet: boolean
}

/**
 * The tall picture (1080×1350) is stacked on white: the brand line on top, the map in a rounded rectangle under it,
 * the result under the map. The brand is not at the bottom, where it mixed with the rows of the result.
 */
export const POST_MAP = { x: 36, y: 112, w: 1008, h: 500, r: 32 } as const

const METRICS: Record<ShareFormat, Metrics> = {
  og: {
    panel: { x: 656, y: 36, w: 508, h: 558, r: 28, padTop: 32, padBottom: 26, padX: 36 },
    forWhom: 20, place: 48, subtitle: 26,
    plaque: { number: 100, label: 36, small: 20, padX: 26, padY: 12, r: 20, gap: 22 },
    row: { size: 24, icon: 28, gap: 14, between: 10 },
    footer: 20, pin: 80, attribution: 15, sheet: false,
  },
  post: {
    panel: { x: 0, y: POST_MAP.y + POST_MAP.h, w: 1080, h: 1350 - POST_MAP.y - POST_MAP.h, r: 0, padTop: 40, padBottom: 48, padX: 60 },
    forWhom: 28, place: 72, subtitle: 36,
    plaque: { number: 150, label: 54, small: 28, padX: 36, padY: 16, r: 28, gap: 32 },
    row: { size: 34, icon: 38, gap: 18, between: 14 },
    footer: 30, pin: 110, attribution: 20, sheet: true,
  },
}

/** Centre of the map that stays visible beside / above the panel. */
export function mapSlot(format: ShareFormat): MapSlot {
  const { width, height } = FORMAT_SIZE[format]
  const m = METRICS[format].panel
  if (format === 'post') return { width: POST_MAP.w, height: POST_MAP.h, focus: { x: POST_MAP.w / 2, y: POST_MAP.h / 2 } }
  return { width, height, focus: { x: m.x / 2, y: height / 2 } }
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, topOnly = false) {
  const b = topOnly ? 0 : r
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - b)
  if (b) ctx.arcTo(x + w, y + h, x + w - b, y + h, b)
  else ctx.lineTo(x + w, y + h)
  ctx.lineTo(x + b, y + h)
  if (b) ctx.arcTo(x, y + h, x, y + h - b, b)
  else ctx.lineTo(x, y + h)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function drawMark(ctx: Ctx, x: number, y: number, height: number, fill: string, outline = 0) {
  const k = height / MARK_H
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(k, k)
  const path = new Path2D(MARK_PATH)
  if (outline > 0) {
    ctx.lineJoin = 'round'
    ctx.lineWidth = (outline * 2) / k
    ctx.strokeStyle = '#ffffff'
    ctx.stroke(path)
  }
  ctx.fillStyle = fill
  ctx.fill(path, 'evenodd')
  ctx.restore()
}

/** The pin of the place: the mark with its tip on the point, a white edge and a soft shadow. */
function drawPin(ctx: Ctx, at: { x: number; y: number }, height: number) {
  const w = (height * MARK_W) / MARK_H
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = height * 0.14
  ctx.shadowOffsetY = height * 0.08
  drawMark(ctx, at.x - w / 2, at.y - height, height, BRAND, Math.max(2, height / 28))
  ctx.restore()
}

/** The marker of a row: ✓ met, ◐ partly, ✗ missed, ▲ risk, – no data. Colour and shape both say it. */
function drawIcon(ctx: Ctx, status: RowStatus, x: number, y: number, size: number) {
  const k = size / 28
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(k, k)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (status === 'met' || status === 'missed') {
    ctx.beginPath()
    ctx.arc(14, 14, 13, 0, Math.PI * 2)
    ctx.fillStyle = status === 'met' ? BAND_COLOR.great : MISSED
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.beginPath()
    if (status === 'met') {
      ctx.moveTo(8, 14.5); ctx.lineTo(12, 18.5); ctx.lineTo(20, 9.5)
    } else {
      ctx.moveTo(9, 9); ctx.lineTo(19, 19); ctx.moveTo(19, 9); ctx.lineTo(9, 19)
    }
    ctx.stroke()
  } else if (status === 'partly') {
    ctx.strokeStyle = PARTLY
    ctx.fillStyle = PARTLY
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(14, 14, 11.5, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(14, 14, 11.5, Math.PI / 2, (3 * Math.PI) / 2)
    ctx.closePath()
    ctx.fill()
  } else if (status === 'risk') {
    ctx.strokeStyle = INK
    ctx.fillStyle = INK
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.moveTo(14, 3.5); ctx.lineTo(26, 24.5); ctx.lineTo(2, 24.5)
    ctx.closePath()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(14, 11); ctx.lineTo(14, 17.5)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(14, 21, 1.5, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.strokeStyle = MUTED
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(7, 14); ctx.lineTo(21, 14)
    ctx.stroke()
  }
  ctx.restore()
}

const font = (weight: number, size: number) => `${weight} ${size}px ${FONT}`

interface RowsLayout {
  items: { status: RowStatus; lines: string[]; height: number }[]
  between: number
  height: number
}

/** The rows at a font size: each one wrapped to at most two lines, and the height of all of them. */
function layoutRows(
  model: ShareModel, size: number, width: number, measure: (weight: number, size: number) => (s: string) => number,
): RowsLayout {
  const icon = Math.round(size * 1.15)
  const between = Math.round(size * 0.42)
  const items = model.rows.map((r) => {
    const lines = wrapLines(r.text, width, measure(400, size), 2)
    return { status: r.status, lines, height: Math.max(icon, lines.length * size * 1.25) }
  })
  return { items, between, height: items.reduce((sum, r, i) => sum + r.height + (i > 0 ? between : 0), 0) }
}

interface RanksLayout {
  heading: string | null
  lines: string[][]
  lh: number
  height: number
}

/** The rank lines (TODO-070) at a font size: each wrapped to at most two lines, with the heading when there is one. */
function layoutRanks(
  model: ShareModel, size: number, width: number, measure: (weight: number, size: number) => (s: string) => number,
): RanksLayout {
  const lines = model.ranks.map((r) => wrapLines(r, width, measure(600, size), 2))
  const lh = size * 1.3
  const heading = lines.length > 0 ? model.ranksHeading : null
  const height = lines.length === 0 ? 0
    : (heading ? lh : 0) + lines.reduce((sum, l, i) => sum + l.length * lh + (i > 0 ? size * 0.35 : 0), 0)
  return { heading, lines, lh, height }
}

/** The mark, the brand and the address on one line centred on `cy`. The brand drops out when both do not fit. */
function drawBrandLine(
  ctx: Ctx, left: number, cy: number, width: number, size: number, domain: string,
  measure: (weight: number, size: number) => (s: string) => number,
) {
  const markH = size * 1.4
  drawMark(ctx, left, cy - markH / 2, markH, BRAND)
  const x = left + markH * 0.7 + 10
  ctx.textBaseline = 'middle'
  const brand = 'Barcelona livability map'
  if (x - left + measure(600, size)(brand) + 24 + measure(400, size)(domain) <= width) {
    ctx.font = font(600, size)
    ctx.fillStyle = INK
    ctx.textAlign = 'left'
    ctx.fillText(brand, x, cy)
    ctx.font = font(400, size)
    ctx.fillStyle = MUTED
    ctx.textAlign = 'right'
    ctx.fillText(domain, left + width, cy)
    ctx.textAlign = 'left'
  } else {
    ctx.font = font(600, size)
    ctx.fillStyle = INK
    ctx.textAlign = 'left'
    ctx.fillText(domain, x, cy)
  }
  ctx.textBaseline = 'alphabetic'
}

/** The picture: the map, the pin, and the panel with the result. */
export async function drawShareImage(ctx: Ctx, model: ShareModel, opts: DrawOptions): Promise<void> {
  const { format } = opts
  const m = METRICS[format]
  const { width, height } = FORMAT_SIZE[format]
  const slot = mapSlot(format)

  const stacked = m.sheet
  const p = m.panel
  ctx.save()
  ctx.fillStyle = stacked ? '#ffffff' : '#e9ece7'
  ctx.fillRect(0, 0, width, height)
  // The map: the whole picture (card over it) or a rounded rectangle under the brand line.
  const at = stacked ? { x: POST_MAP.x, y: POST_MAP.y } : { x: 0, y: 0 }
  ctx.save()
  if (stacked) {
    roundRect(ctx, at.x, at.y, POST_MAP.w, POST_MAP.h, POST_MAP.r)
    ctx.clip()
  }
  ctx.translate(at.x, at.y)
  const drawn = await opts.drawMap(ctx, slot)
  const placeAt = drawn ? { x: drawn.x, y: drawn.y } : null

  // Attribution on the map, bottom left.
  ctx.font = font(400, m.attribution)
  ctx.textBaseline = 'alphabetic'
  const aw = ctx.measureText(opts.attribution).width
  const ah = m.attribution + 10
  const ay = (stacked ? POST_MAP.h : height) - 14 - ah
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  roundRect(ctx, 16, ay, aw + 20, ah, 8)
  ctx.fill()
  ctx.fillStyle = '#374151'
  ctx.fillText(opts.attribution, 26, ay + m.attribution + 1)

  if (placeAt) drawPin(ctx, placeAt, m.pin)
  ctx.restore()

  // The panel: a card over the map, or just the white under the map.
  if (!stacked) {
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.18)'
    ctx.shadowBlur = 28
    ctx.shadowOffsetY = 8
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, p.x, p.y, p.w, p.h, p.r)
    ctx.fill()
    ctx.restore()
  }

  const left = p.x + p.padX
  const inner = p.w - 2 * p.padX
  const measure = (weight: number, size: number) => (s: string) => {
    ctx.font = font(weight, size)
    return ctx.measureText(s).width
  }

  // --- blocks, measured first so the free height can be shared between them ---
  const placeLines = wrapLines(model.place, inner, measure(700, m.place), 2)
  const placeLH = m.place * 1.1
  const headH = (model.forWhom ? m.forWhom * 1.3 + 6 : 0) + placeLines.length * placeLH + (model.subtitle ? m.subtitle * 1.3 + 6 : 0)

  const pl = m.plaque
  const plaqueH = pl.number + pl.padY * 2 + 2
  const rowW = (size: number) => inner - Math.round(size * 1.15) - m.row.gap

  const footH = stacked ? 0 : m.footer * 1.4
  const top = p.y + p.padTop
  const bottom = p.y + p.h - p.padBottom
  const MIN_GAP = 12

  // The rows start at their full size and shrink until the panel holds everything.
  let rowSize = m.row.size
  let rows = layoutRows(model, rowSize, rowW(rowSize), measure)
  let ranks = layoutRanks(model, rowSize, inner, measure)
  while (rowSize > 18) {
    const free = bottom - top - (headH + plaqueH + ranks.height + rows.height + footH)
    if (free >= MIN_GAP * (ranks.height > 0 ? 4 : 3)) break
    rowSize -= 2
    rows = layoutRows(model, rowSize, rowW(rowSize), measure)
    ranks = layoutRanks(model, rowSize, inner, measure)
  }
  const rowIcon = Math.round(rowSize * 1.15)
  const rowLH = rowSize * 1.25
  const blocks = [headH, plaqueH, ranks.height, rows.height, footH].filter((h) => h > 0)
  const gap = Math.max(MIN_GAP, (bottom - top - blocks.reduce((a, b) => a + b, 0)) / (blocks.length - 1))
  let y = top

  // Head: for whom, the place, the area.
  ctx.fillStyle = MUTED
  if (model.forWhom) {
    ctx.font = font(600, m.forWhom)
    ctx.fillStyle = MUTED
    ctx.fillText(model.forWhom.toUpperCase(), left, y + m.forWhom)
    y += m.forWhom * 1.3 + 6
  }
  ctx.font = font(700, m.place)
  ctx.fillStyle = INK
  for (const line of placeLines) {
    ctx.fillText(line, left, y + m.place * 0.92)
    y += placeLH
  }
  if (model.subtitle) {
    ctx.font = font(400, m.subtitle)
    ctx.fillStyle = MUTED
    ctx.fillText(model.subtitle, left, y + m.subtitle + 4)
    y += m.subtitle * 1.3 + 6
  }
  y = top + headH + gap

  // Plaque: the number on the colour of the band.
  ctx.fillStyle = model.bandColor
  roundRect(ctx, left, y, inner, plaqueH, pl.r)
  ctx.fill()
  ctx.fillStyle = INK
  ctx.font = font(700, pl.number)
  const numX = left + pl.padX
  ctx.fillText(model.value, numX, y + pl.padY + pl.number * 0.86)
  const numW = ctx.measureText(model.value).width
  const textX = numX + numW + pl.gap
  const textW = left + inner - pl.padX - textX
  if (model.kind === 'building') {
    ctx.font = font(700, pl.label)
    ctx.fillText(model.bandLabel, textX, y + plaqueH / 2 - 2)
    ctx.font = font(500, pl.small)
    ctx.fillText('out of 100', textX, y + plaqueH / 2 + pl.small + 4)
  } else {
    const lines = wrapLines(model.caption ?? '', textW, measure(700, pl.label * 0.62), 3)
    ctx.font = font(700, pl.label * 0.62)
    const lh = pl.label * 0.62 * 1.2
    lines.forEach((l, i) => ctx.fillText(l, textX, y + plaqueH / 2 - ((lines.length - 1) * lh) / 2 + i * lh + pl.label * 0.2))
  }
  y += plaqueH + gap

  // Where the building stands in its barri and the city, for the conditions on the picture.
  if (ranks.height > 0) {
    ctx.fillStyle = INK
    if (ranks.heading) {
      ctx.font = font(600, rowSize * 0.8)
      ctx.fillStyle = MUTED
      ctx.fillText(ranks.heading.toUpperCase(), left, y + rowSize * 0.8)
      y += ranks.lh
    }
    ctx.font = font(600, rowSize)
    ctx.fillStyle = INK
    ranks.lines.forEach((lines, i) => {
      if (i > 0) y += rowSize * 0.35
      for (const l of lines) {
        ctx.fillText(l, left, y + rowSize)
        y += ranks.lh
      }
    })
    y += gap
  }

  // Rows.
  if (rows.items.length > 0) {
    for (const r of rows.items) {
      drawIcon(ctx, r.status, left, y + (r.height - rowIcon) / 2, rowIcon)
      ctx.fillStyle = INK
      ctx.font = font(400, rowSize)
      r.lines.forEach((l, i) =>
        ctx.fillText(l, left + rowIcon + m.row.gap, y + (r.height - r.lines.length * rowLH) / 2 + i * rowLH + rowSize))
      y += r.height + rows.between
    }
  }

  // The brand line: on top of the stacked picture, at the foot of the card otherwise.
  if (stacked) drawBrandLine(ctx, POST_MAP.x + 24, POST_MAP.y / 2, POST_MAP.w - 48, m.footer, opts.domain, measure)
  else drawBrandLine(ctx, left, bottom - footH / 2, inner, m.footer, opts.domain, measure)
  ctx.restore()
}

/** The picture for the site itself (the link preview of the home page): the map, the question and the four bands. */
export async function drawSiteImage(ctx: Ctx, opts: Omit<DrawOptions, 'format'> & { headline: string; sentence: string }): Promise<void> {
  const m = METRICS.og
  const { width, height } = FORMAT_SIZE.og
  const p = m.panel
  ctx.save()
  ctx.fillStyle = '#e9ece7'
  ctx.fillRect(0, 0, width, height)
  await opts.drawMap(ctx, mapSlot('og'))

  ctx.font = font(400, m.attribution)
  ctx.textBaseline = 'alphabetic'
  const aw = ctx.measureText(opts.attribution).width
  const ah = m.attribution + 10
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  roundRect(ctx, 16, height - 14 - ah, aw + 20, ah, 8)
  ctx.fill()
  ctx.fillStyle = '#374151'
  ctx.fillText(opts.attribution, 26, height - 14 - ah + m.attribution + 1)

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.18)'
  ctx.shadowBlur = 28
  ctx.shadowOffsetY = 8
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, p.x, p.y, p.w, p.h, p.r)
  ctx.fill()
  ctx.restore()

  const left = p.x + p.padX
  const inner = p.w - 2 * p.padX
  const top = p.y + p.padTop
  const bottom = p.y + p.h - p.padBottom
  const measure = (weight: number, size: number) => (s: string) => {
    ctx.font = font(weight, size)
    return ctx.measureText(s).width
  }

  // Brand.
  drawMark(ctx, left, top, 40, BRAND)
  ctx.font = font(600, 24)
  ctx.fillStyle = INK
  ctx.textBaseline = 'middle'
  ctx.fillText('Barcelona livability map', left + 40 * 0.7 + 12, top + 20)
  ctx.textBaseline = 'alphabetic'

  // The question and one sentence.
  let y = top + 96
  ctx.font = font(700, 62)
  ctx.fillStyle = INK
  for (const line of wrapLines(opts.headline, inner, measure(700, 62), 3)) {
    ctx.fillText(line, left, y + 52)
    y += 64
  }
  y += 14
  ctx.font = font(400, 25)
  ctx.fillStyle = '#374151'
  for (const line of wrapLines(opts.sentence, inner, measure(400, 25), 4)) {
    ctx.fillText(line, left, y + 24)
    y += 34
  }

  // The four bands.
  const colW = (inner - 3 * 8) / 4
  const sy = bottom - 70
  BAND_ORDER.forEach((id, i) => {
    const x = left + i * (colW + 8)
    ctx.fillStyle = BAND_COLOR[id]
    roundRect(ctx, x, sy, colW, 16, 8)
    ctx.fill()
    ctx.fillStyle = INK
    ctx.font = font(500, 20)
    ctx.fillText(BAND_LABEL[id].replace(' match', ''), x, sy + 42)
  })
  ctx.font = font(400, 20)
  ctx.fillStyle = MUTED
  ctx.textAlign = 'left'
  ctx.fillText(opts.domain, left, bottom)
  ctx.restore()
}

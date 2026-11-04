import type { ExpressionSpecification } from 'maplibre-gl'

/** Official Barcelona acoustic map palette (QGIS .qml style): colour below 40 dB, then [from dB, colour] steps. */
const BELOW_40 = '#b3e0f2'
const STEPS: [number, string][] = [
  [40, '#79c8e0'], [45, '#a8d86e'], [50, '#d4ed6a'], [55, '#f5f500'], [60, '#f5c800'],
  [65, '#f57d00'], [70, '#e02020'], [75, '#d400d4'], [80, '#0000c8'],
]

/** Step expression colouring a dB value with the official palette. */
export function ldenColorExpression(input: ExpressionSpecification): ExpressionSpecification {
  return ['step', input, BELOW_40, ...STEPS.flat()] as ExpressionSpecification
}

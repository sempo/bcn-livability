import { CONDITION_LABEL, type ConditionId } from '../match/matchSummary'

// The numbers line of the area card (TODO-064).

const fmt = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })

export interface AreaCardStats {
  n: number
  shareGood: number
  shareGreat: number
  mean: number
  strongest: readonly ConditionId[]
  ranked: boolean
  incomplete: boolean
}

/** "71% of 1,240 homes are a good match", or the plain count for an area with too few homes to rank. */
export function matchLine(r: Pick<AreaCardStats, 'n' | 'shareGood' | 'ranked'>): string {
  const homes = `${fmt.format(r.n)} ${r.n === 1 ? 'home' : 'homes'}`
  if (!r.ranked) return `${homes}: too few to rank`
  return `${Math.round(r.shareGood)}% of ${homes} are a good match`
}

/** Under the big percentage: "of 1,240 homes are a good match". */
export function matchCaption(r: Pick<AreaCardStats, 'n'>): string {
  return `of ${fmt.format(r.n)} ${r.n === 1 ? 'home' : 'homes'} are a good match`
}

/** "Strongest on: quiet, daily services" or null. */
export function strongestLine(strongest: readonly ConditionId[]): string | null {
  if (strongest.length === 0) return null
  return `Strongest on: ${strongest.map((id) => CONDITION_LABEL[id].toLowerCase()).join(', ')}`
}

/** The note under the numbers when many homes have incomplete data, else null. */
export function incompleteNote(incomplete: boolean): string | null {
  return incomplete ? 'Many homes here have incomplete data, so the shares are the best case.' : null
}

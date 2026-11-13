import { useMemo } from 'react'
import { useStore } from '../../store'
import { useSheetStore } from '../../store/sheetStore'
import { conditionNames } from '../../services/match/conditionNames'

/**
 * What the sheet shows above the fold in the conditions view (TODO-062): the conditions that are on, or, after an
 * area was picked from the list, that area with a way back to the list.
 */
export function ConditionsSheetHeader() {
  const weights = useStore((s) => s.compositeWeights)
  const risks = useStore((s) => s.compositeRiskStrengths)
  const position = useSheetStore((s) => s.position)
  const tab = useSheetStore((s) => s.tab)
  const picked = useSheetStore((s) => s.pickedArea)
  const backToList = useSheetStore((s) => s.backToList)
  const names = useMemo(() => conditionNames(weights, risks), [weights, risks])
  const peek = position === 'peek'

  if (picked && peek) {
    return (
      <div className="sheet-header sheet-header--row">
        <div className="sheet-header__text">
          <div className="sheet-header__title">{picked.name}</div>
          <div className="sheet-header__sub">{picked.share}% of homes are a good match</div>
        </div>
        <button type="button" className="sheet-header__action" onClick={backToList}>Back to the list</button>
      </div>
    )
  }

  if (tab === 'areas') {
    return (
      <div className="sheet-header">
        <div className="sheet-header__title">Your areas</div>
        <div className="sheet-header__sub">{peek ? 'Swipe up for the ranked list' : 'Ranked by the share of homes that fit'}</div>
      </div>
    )
  }

  const list = names.length > 0 ? names.join(' · ') : 'No conditions yet'
  return (
    <div className="sheet-header">
      <div className="sheet-header__title">{peek ? list : 'Your conditions'}</div>
      <div className="sheet-header__sub">
        {peek ? (names.length > 0 ? 'Swipe up to change them' : 'Swipe up to add one') : list}
      </div>
    </div>
  )
}

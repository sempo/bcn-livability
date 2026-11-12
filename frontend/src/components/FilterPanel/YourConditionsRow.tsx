import { useMemo } from 'react'
import { useStore } from '../../store'
import { features } from '../../features'
import { SHORT_LABEL, activeConditions } from '../../services/conditionOptions'

/** "Your conditions: Quiet · On foot · Budget — Change": the way back into the onboarding (TODO-031). */
export function YourConditionsRow() {
  const weights = useStore((s) => s.compositeWeights)
  const strengths = useStore((s) => s.compositeRiskStrengths)
  const order = useStore((s) => s.conditionOrder)
  const openOnboarding = useStore((s) => s.openOnboarding)
  const names = useMemo(
    () => activeConditions(weights, strengths, order).map((k) => SHORT_LABEL[k]).join(' · '),
    [weights, strengths, order],
  )
  if (!features.onboarding) return null
  return (
    <div className="your-conditions">
      <span className="your-conditions__label">Your conditions</span>
      <span className="your-conditions__names">{names || 'none'}</span>
      <button type="button" className="your-conditions__change" onClick={openOnboarding}>Change</button>
    </div>
  )
}

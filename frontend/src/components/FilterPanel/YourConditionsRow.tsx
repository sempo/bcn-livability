import { useStore } from '../../store'
import { features } from '../../features'

/** "Your conditions … Start from a profile": the way back to the profiles of the onboarding (TODO-031). */
export function YourConditionsRow() {
  const openOnboarding = useStore((s) => s.openOnboarding)
  if (!features.onboarding) return null
  return (
    <div className="your-conditions">
      <span className="your-conditions__label">Your conditions</span>
      <button type="button" className="your-conditions__change" onClick={openOnboarding}>Start from a profile</button>
    </div>
  )
}

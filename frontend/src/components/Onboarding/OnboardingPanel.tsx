import { useState } from 'react'
import { Button } from '@mantine/core'
import { useStore } from '../../store'
import { PRESETS } from '../../services/presets'
import { profileToPatch, type Profile } from '../../services/conditionOptions'
import { ConditionsEditor } from '../Conditions/ConditionsEditor'
import { PresetCards } from './PresetCards'

/** Build your own: the three conditions most people start with, at their default limits. */
const BUILD_YOUR_OWN: Profile = {
  id: 'own', name: 'Build your own', blurb: '', order: ['noise', 'poiAccess', 'openPrice'],
}

/**
 * First visit (TODO-031): pick a profile or build your own, then edit one sentence per condition while the map
 * recolours behind the panel.
 */
export function OnboardingPanel() {
  const applySettings = useStore((s) => s.applySettings)
  const completeOnboarding = useStore((s) => s.completeOnboarding)
  const [screen, setScreen] = useState<'start' | 'build'>('start')
  const [from, setFrom] = useState<string | null>(null)

  const start = (p: Profile) => {
    applySettings(profileToPatch(p))
    setFrom(p.id === BUILD_YOUR_OWN.id ? null : p.name)
    setScreen('build')
  }

  if (screen === 'start') {
    return (
      <section className="onboarding-panel glass-panel" aria-label="Where would you like to live?">
        <h2>Where in Barcelona would you like to live?</h2>
        <p className="onboarding-panel__sub">
          Pick a profile or build your own. We&apos;ll colour every home on the map by how well it fits.
        </p>
        <PresetCards presets={PRESETS} onPick={start} />
        <div className="onboarding-panel__or">or</div>
        <Button variant="default" fullWidth size="md" onClick={() => start(BUILD_YOUR_OWN)}>Build your own</Button>
        <button type="button" className="onboarding-panel__skip" onClick={completeOnboarding}>
          Just show me the map
        </button>
      </section>
    )
  }

  return (
    <section className="onboarding-panel glass-panel" aria-label="Your conditions">
      <div className="onboarding-panel__top">
        <button type="button" className="onboarding-panel__back" onClick={() => setScreen('start')}>‹ Back</button>
        {from && <span className="onboarding-panel__tag">{from} profile</span>}
      </div>
      <h2>I&apos;d like to live somewhere…</h2>
      <p className="onboarding-panel__sub">Tap a highlighted word to change it.</p>
      <ConditionsEditor />
      <div className="onboarding-panel__cta">
        <Button fullWidth size="md" color="brand" c="#1f2937" onClick={completeOnboarding}>Show me the map</Button>
      </div>
    </section>
  )
}

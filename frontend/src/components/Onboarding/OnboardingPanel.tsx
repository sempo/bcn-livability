import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@mantine/core'
import { useStore } from '../../store'
import { PRESETS, profileName } from '../../services/presets'
import { profileToPatch, type Profile } from '../../services/conditionOptions'
import { ConditionsEditor } from '../Conditions/ConditionsEditor'
import { PresetCards } from './PresetCards'

/** Build your own: the three conditions most people start with, at their default limits. */
const BUILD_YOUR_OWN: Profile = {
  id: 'own', order: ['noise', 'poiAccess', 'openPrice'],
}

/**
 * First visit (TODO-031): pick a profile or build your own, then edit one sentence per condition while the map
 * recolours behind the panel.
 */
export function OnboardingPanel() {
  const { t } = useTranslation('editor')
  const applySettings = useStore((s) => s.applySettings)
  const completeOnboarding = useStore((s) => s.completeOnboarding)
  const [screen, setScreen] = useState<'start' | 'build'>('start')
  const [from, setFrom] = useState<string | null>(null)

  const start = (p: Profile) => {
    applySettings(profileToPatch(p))
    setFrom(p.id === BUILD_YOUR_OWN.id ? null : profileName(p))
    setScreen('build')
  }

  if (screen === 'start') {
    return (
      <section className="onboarding-panel glass-panel" aria-label={t('onboarding.ariaStart')}>
        <h2>{t('onboarding.title')}</h2>
        <p className="onboarding-panel__sub">
          {t('onboarding.sub')}
        </p>
        <PresetCards presets={PRESETS} onPick={start} />
        <div className="onboarding-panel__or">{t('onboarding.or')}</div>
        <Button variant="default" fullWidth size="md" onClick={() => start(BUILD_YOUR_OWN)}>{t('onboarding.buildOwn')}</Button>
        <button type="button" className="onboarding-panel__skip" onClick={completeOnboarding}>
          {t('onboarding.skip')}
        </button>
      </section>
    )
  }

  return (
    <section className="onboarding-panel glass-panel" aria-label={t('onboarding.ariaConditions')}>
      <div className="onboarding-panel__top">
        <button type="button" className="onboarding-panel__back" onClick={() => setScreen('start')}>{t('onboarding.back')}</button>
        {from && <span className="onboarding-panel__tag">{t('onboarding.tag', { name: from })}</span>}
      </div>
      <h2>{t('onboarding.heading')}</h2>
      <p className="onboarding-panel__sub">{t('onboarding.tapHint')}</p>
      <ConditionsEditor />
      <div className="onboarding-panel__cta">
        <Button fullWidth size="md" color="brand" c="#1f2937" onClick={completeOnboarding}>{t('onboarding.show')}</Button>
      </div>
    </section>
  )
}

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { features } from '../../features'
import {
  CONDITION_KEYS, SHORT_LABEL, activeConditions, strengthsFor, type ConditionKey, type SettingsPatch,
} from '../../services/conditionOptions'
import { SentenceRow } from './SentenceRow'
import { AddConditionChips } from './AddConditionChips'
import { MatchBar } from './MatchBar'

/** The conditions as numbered sentences, "+ add" chips for the rest, and the match bar (TODO-031). */
export function ConditionsEditor() {
  const { t } = useTranslation('editor')
  const weights = useStore((s) => s.compositeWeights)
  const strengths = useStore((s) => s.compositeRiskStrengths)
  const order = useStore((s) => s.conditionOrder)
  const applySettings = useStore((s) => s.applySettings)
  const active = useMemo(() => activeConditions(weights, strengths, order), [weights, strengths, order])
  const missing = CONDITION_KEYS.filter((k) => !active.includes(k) && (k !== 'localsOpinion' || features.localsOpinion))

  const change = (key: ConditionKey, on: boolean) => {
    const patch: SettingsPatch = { order: on ? [...active, key] : active.filter((k) => k !== key) }
    if (key === 'risk') patch.riskStrengths = strengthsFor(on ? 'avoid' : 'off')
    else patch.weights = { ...weights, [key]: on ? 1 : 0 }
    applySettings(patch)
  }

  return (
    <div className="conditions-editor">
      {active.length === 0 ? (
        <p className="conditions-editor__empty">{t('editor.empty')}</p>
      ) : (
        <div className="conditions-editor__rows">
          {active.map((k, i) => (
            <div key={k} className="condition-row">
              <span className="condition-row__num" aria-label={t('editor.priority', { n: i + 1 })}>{i + 1}</span>
              <SentenceRow condition={k} />
              <button
                type="button"
                className="condition-row__remove"
                aria-label={t('editor.remove', { name: SHORT_LABEL[k] })}
                onClick={() => change(k, false)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <AddConditionChips missing={missing} onAdd={(k) => change(k, true)} />
      <MatchBar />
    </div>
  )
}

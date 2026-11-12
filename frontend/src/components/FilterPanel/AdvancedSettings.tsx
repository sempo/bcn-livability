import { useState } from 'react'
import { Stack, Switch, Text } from '@mantine/core'
import { useStore } from '../../store'
import { DEFAULT_RISK_STRENGTHS, type RiskStrengths } from '../../services/climateRisk/climateRisk'
import { StrengthRow } from './StrengthRow'

const RISKS: { id: keyof RiskStrengths; label: string }[] = [
  { id: 'flood', label: 'River flood risk' },
  { id: 'fire', label: 'Wildfire risk' },
  { id: 'street', label: 'Street flooding risk' },
]

/** What only experts need (TODO-052): how much each risk counts, and the colour scale. Closed at first. */
export function AdvancedSettings() {
  const [open, setOpen] = useState(false)
  const strengths = useStore((s) => s.compositeRiskStrengths)
  const setStrengths = useStore((s) => s.setCompositeRiskStrengths)
  const contrastBoost = useStore((s) => s.contrastBoost)
  const setContrastBoost = useStore((s) => s.setContrastBoost)

  return (
    <div className="advanced-settings">
      <button type="button" className="advanced-settings__head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Advanced
      </button>
      {open && (
        <Stack gap={12} mt={8}>
          <Text size="xs" c="dimmed">
            Exact values live in each sentence under &ldquo;Custom…&rdquo;. Here: how much each climate risk counts, and the
            colour scale.
          </Text>
          <Stack gap={10}>
            <Text size="xs" fw={600}>How much each risk counts</Text>
            {RISKS.map((r) => (
              <StrengthRow
                key={r.id}
                label={r.label}
                weight={strengths[r.id]}
                defaultWeight={DEFAULT_RISK_STRENGTHS[r.id] || 5}
                onChange={(v) => setStrengths({ ...strengths, [r.id]: v })}
              />
            ))}
          </Stack>
          <Switch
            size="xs"
            label="Boost contrast for this view"
            checked={contrastBoost}
            onChange={(e) => setContrastBoost(e.currentTarget.checked)}
          />
        </Stack>
      )}
    </div>
  )
}

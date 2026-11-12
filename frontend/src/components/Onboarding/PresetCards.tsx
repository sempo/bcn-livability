import type { Profile } from '../../services/conditionOptions'

/** The profiles of the first screen: a name and what it asks for. */
export function PresetCards({ presets, onPick }: { presets: readonly Profile[]; onPick: (p: Profile) => void }) {
  return (
    <div className="preset-cards">
      {presets.map((p) => (
        <button key={p.id} type="button" className="preset-card" onClick={() => onPick(p)}>
          <b>{p.name}</b>
          <span>{p.blurb}</span>
        </button>
      ))}
    </div>
  )
}

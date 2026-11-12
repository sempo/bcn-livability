import { ADD_LABEL, type ConditionKey } from '../../services/conditionOptions'

/** "+ Quiet", "+ Within my budget": the conditions that are not on yet. */
export function AddConditionChips({ missing, onAdd }: { missing: readonly ConditionKey[]; onAdd: (key: ConditionKey) => void }) {
  if (missing.length === 0) return null
  return (
    <div className="add-chips">
      <span className="add-chips__label">Add</span>
      {missing.map((k) => (
        <button key={k} type="button" className="add-chip" onClick={() => onAdd(k)}>
          + {ADD_LABEL[k]}
        </button>
      ))}
    </div>
  )
}

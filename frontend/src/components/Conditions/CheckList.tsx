import { Checkbox } from '@mantine/core'

export interface CheckItem {
  id: string
  label: string
  hint?: string
}

/** Pick several of a list; "All" selects everything and at least one stays selected. */
export function CheckList({ items, selected, onChange, allLabel }: {
  items: readonly CheckItem[]
  selected: readonly string[]
  onChange: (ids: string[]) => void
  allLabel: string
}) {
  const allSelected = items.every((i) => selected.includes(i.id))
  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
    // Keep the list order, and never an empty selection: a condition needs at least one thing to measure.
    const ordered = items.map((i) => i.id).filter((x) => next.includes(x))
    if (ordered.length > 0) onChange(ordered)
  }
  return (
    <div className="check-list">
      <Checkbox
        label={allLabel}
        checked={allSelected}
        onChange={() => onChange(items.map((i) => i.id))}
        styles={{ label: { fontWeight: 600 } }}
      />
      {items.map((i) => (
        <Checkbox
          key={i.id}
          label={i.hint ? `${i.label} · ${i.hint}` : i.label}
          checked={selected.includes(i.id)}
          onChange={() => toggle(i.id)}
        />
      ))}
    </div>
  )
}

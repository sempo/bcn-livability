import { useState, type ReactNode } from 'react'
import { Popover, Text } from '@mantine/core'

/** A tappable word of a sentence; opens a small picker under it. `children` gets a function that closes it. */
export function WordPicker({ label, title, note, children }: {
  label: string
  title?: string
  /** A second, smaller line under the title: what happens beyond the limit. */
  note?: string
  children: (close: () => void) => ReactNode
}) {
  const [opened, setOpened] = useState(false)
  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-start"
      width={280}
      shadow="md"
      radius="md"
      transitionProps={{ duration: 0 }}
      trapFocus
    >
      <Popover.Target>
        <button
          type="button"
          className="word-pill"
          aria-haspopup="dialog"
          aria-expanded={opened}
          onClick={() => setOpened((o) => !o)}
        >
          {label}
        </button>
      </Popover.Target>
      <Popover.Dropdown className="word-picker">
        {title && <Text size="xs" c="dimmed" mb={note ? 2 : 4}>{title}</Text>}
        {note && <Text size="xs" c="dimmed" mb={4}>{note}</Text>}
        {children(() => setOpened(false))}
      </Popover.Dropdown>
    </Popover>
  )
}

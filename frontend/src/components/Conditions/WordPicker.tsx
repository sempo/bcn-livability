import { useState, type ReactNode } from 'react'
import { Drawer, Popover, Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { PHONE_QUERY } from '../../services/phoneConfig'

/**
 * A tappable word of a sentence; opens a small picker under it, or on a phone a bottom sheet with large rows
 * (TODO-062). `children` gets a function that closes it.
 */
export function WordPicker({ label, title, note, children }: {
  label: string
  title?: string
  /** A second, smaller line under the title: what happens beyond the limit. */
  note?: string
  children: (close: () => void) => ReactNode
}) {
  const [opened, setOpened] = useState(false)
  const phone = useMediaQuery(PHONE_QUERY, false, { getInitialValueInEffect: false })
  const content = (
    <>
      {title && <Text size="xs" c="dimmed" mb={note ? 2 : 4}>{title}</Text>}
      {note && <Text size="xs" c="dimmed" mb={4}>{note}</Text>}
      {children(() => setOpened(false))}
    </>
  )
  const pill = (
    <button
      type="button"
      className="word-pill"
      aria-haspopup="dialog"
      aria-expanded={opened}
      onClick={() => setOpened((o) => !o)}
    >
      {label}
    </button>
  )

  if (phone) {
    return (
      <>
        {pill}
        <Drawer
          opened={opened}
          onClose={() => setOpened(false)}
          position="bottom"
          size="auto"
          radius="lg"
          withCloseButton={false}
          padding="md"
          zIndex={300}
          aria-label={title ?? label}
          classNames={{ content: 'bottom-sheet' }}
        >
          <div className="word-picker word-picker--sheet">{content}</div>
        </Drawer>
      </>
    )
  }

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
      <Popover.Target>{pill}</Popover.Target>
      <Popover.Dropdown className="word-picker">{content}</Popover.Dropdown>
    </Popover>
  )
}

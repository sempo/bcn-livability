import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import bbox from '@turf/bbox'
import { IconX } from '@tabler/icons-react'
import { ActionIcon, Group, Paper, Stack, Text } from '@mantine/core'
import { settingsOf, URL_DEFAULTS, useStore } from '../../store'
import { useSearchStore } from '../../store/searchStore'
import { useAreaJoin } from '../../hooks/useAreaJoin'
import { areaDescription } from '../../services/areas/areaDescriptions'
import { incompleteNote, matchCaption, matchLine, strongestLine } from '../../services/areas/areaCardText'
import { areaLink } from '../../services/areas/areaLink'
import { SITE_URL } from '../../services/shareImage/shareConfig'
import { areaShareModel, profileOf } from '../../services/shareImage/shareImageModel'
import { encodeConfig } from '../../services/urlConfig'
import { scoreColorForRange } from '../BuildingCard/cardColors'
import { SaveImageButton } from '../BuildingCard/SaveImageButton'
import { ShareLinkButton } from '../BuildingCard/ShareLinkButton'
import { useSheetSlots } from '../MobileSheet/sheetSlots'

/** Closes the card and the outline of the area on the map. */
function closeArea(): void {
  useStore.getState().setSelectedArea(null)
  useSearchStore.getState().clear()
}

/**
 * The card of a clicked area (TODO-064): what the area is like, how many of its homes fit the conditions, and the
 * buttons that make a picture or a link of it. On desktop a card over the top right of the map; with `embedded`
 * (the phone) it fills the slots of the bottom sheet, like the building card.
 */
export function AreaCard({ embedded = false }: { embedded?: boolean }) {
  const slots = useSheetSlots()
  const index = useStore((s) => s.selectedArea)
  const ranks = useStore((s) => s.areaRanks)
  const join = useAreaJoin()

  useEffect(() => {
    if (index === null) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeArea() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index])

  const rank = index === null ? undefined : ranks?.find((r) => r.index === index)
  const feature = index === null ? undefined : join?.get(index)
  if (!rank || !feature) return null

  const [w, s, e, n] = bbox(feature)
  const centre: [number, number] = [(w + e) / 2, (s + n) / 2]
  const description = rank.kind === 'barri' ? areaDescription(rank.code) : null
  const where = rank.kind === 'barri' ? 'Barcelona' : 'Metro area'
  const color = rank.ranked ? scoreColorForRange(rank.mean, 0, 100) : '#868e96'
  const strongest = strongestLine(rank.strongest)
  const incomplete = incompleteNote(rank.incomplete)
  const config = () => encodeConfig(settingsOf(useStore.getState()), URL_DEFAULTS)
  const link = () => areaLink({
    name: rank.name, code: rank.code, kind: rank.kind, ranked: rank.ranked,
    profile: profileOf(settingsOf(useStore.getState()), URL_DEFAULTS),
    siteUrl: SITE_URL, href: window.location.href, config: config(),
  })

  const details = (
    <Stack gap="sm" data-testid="area-card">
      {description && <Text size="sm">{description}</Text>}
      <Stack gap={4}>
        {rank.ranked ? (
          <>
            <div className="area-card__headline">
              <Text fw={700} style={{ fontSize: 28, lineHeight: 1 }} data-testid="area-share">
                {Math.round(rank.shareGood)}%
              </Text>
              <Text size="sm" fw={600} style={{ lineHeight: 1.25 }}>{matchCaption(rank)}</Text>
            </div>
            <div className="area-card__bar" aria-hidden="true"><i style={{ width: `${Math.round(rank.shareGood)}%`, background: color }} /></div>
            <Text size="xs" c="dimmed">
              {Math.round(rank.shareGreat)}% are a great match · average score {Math.round(rank.mean)}
            </Text>
          </>
        ) : (
          <Text size="sm" fw={600}>{matchLine(rank)}</Text>
        )}
        {strongest && <Text size="xs" c="dimmed">{strongest}</Text>}
        {incomplete && <Text size="xs" c="dimmed">{incomplete}</Text>}
      </Stack>
      {rank.ranked && (
        <SaveImageButton
          lngLat={centre}
          build={(profile) => areaShareModel({
            rank: { name: rank.name, kind: rank.kind, shareGood: rank.shareGood, mean: rank.mean, strongest: rank.strongest },
            profile,
          })}
          link={link}
          extra={<ShareLinkButton getUrl={link} copied="Link copied. It opens this area with your conditions." />}
        />
      )}
      {!rank.ranked && <ShareLinkButton getUrl={link} copied="Link copied. It opens this area with your conditions." />}
    </Stack>
  )

  if (embedded) {
    if (!slots.header || !slots.body) return null
    const peek = (
      <Group justify="space-between" align="flex-start" wrap="nowrap" className="building-peek">
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text fw={700} size="md" truncate>{rank.name}</Text>
          <Text size="sm" fw={600}>
            {rank.ranked ? `${Math.round(rank.shareGood)}% of homes are a good match` : matchLine(rank)}
          </Text>
        </Stack>
        <ActionIcon size={44} radius="md" variant="subtle" color="gray" onClick={closeArea}
          aria-label="Close area card" style={{ flex: 'none', marginTop: -4, marginRight: -8 }}>
          <IconX size={24} stroke={2} />
        </ActionIcon>
      </Group>
    )
    return (
      <>
        {createPortal(peek, slots.header)}
        {createPortal(<div className="building-card__body building-card__body--sheet">{details}</div>, slots.body)}
      </>
    )
  }

  return (
    <div className="building-card-overlay">
      <Paper shadow="md" radius="md" w={300} className="building-card">
        <Group justify="space-between" align="flex-start" wrap="nowrap" className="building-card__header">
          <Stack gap={0}>
            <Text size="sm" fw={700}>{rank.name}</Text>
            <Text size="xs" c="dimmed">{where}</Text>
          </Stack>
          <ActionIcon size={36} radius="md" variant="subtle" color="gray" onClick={closeArea}
            aria-label="Close area card" style={{ flex: 'none', marginTop: -6, marginRight: -8 }}>
            <IconX size={24} stroke={2} />
          </ActionIcon>
        </Group>
        <div className="building-card__body">{details}</div>
      </Paper>
    </div>
  )
}

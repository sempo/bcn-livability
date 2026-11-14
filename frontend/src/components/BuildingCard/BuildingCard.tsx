import { IconX } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Trans, useTranslation } from 'react-i18next'
import i18n from '../../i18n'
import { formatNumber } from '../../i18n/format'
import { ActionIcon, Anchor, Divider, Group, Paper, Stack, Text } from '@mantine/core'
import { settingsOf, URL_DEFAULTS, useStore } from '../../store'
import { valueOf } from '../../services/buildings/buildingData'
import { useBuildingData } from '../../hooks/useBuildingData'
import { buildingArea, scoreBuilding } from '../../services/buildings/buildingScore'
import { loadBuildingDetail, type BuildingDetail, type BuildingDetailResult } from '../../services/buildings/buildingDetail'
import { catastroUrl, facadePhotoUrl, prettyAddress } from '../../services/buildings/address'
import { UNCERTAIN_YEAR, eraOf } from '../../services/buildings/buildingAge'
import { belowGroundUses, loadCatastroUnits } from '../../services/buildings/catastroUnits'
import { LANDMARKS } from '../../services/cityCore/landmarks'
import { SERVICE_CATEGORIES } from '../../services/walkability/serviceCategories'
import { barriVibeData } from '../../services/localsOpinion/localsOpinion'
import { LandmarkRow, LocalsSay, NoiseLabel, RiskRow, ScoreBar, SectionTitle } from './cardParts'
import { scoreColor, scoreColorForRange } from './cardColors'
import { fireText } from './cardText'
import {
  USE_LABEL, countWithin, doorWaterText, groundFloorWarning, noiseVsLimit, priceVsBudget, ratingVsMin, riverText, sideText,
} from './buildingCardText'
import { minutesShare } from '../../services/buildings/conditions'
import { features } from '../../features'
import { BAND_LABEL, matchBand, matchSummary, riskLine } from '../../services/match/matchSummary'
import { ageText, cityCoreText, localsText, noiseText, poiText, priceText } from '../../services/match/matchText'
import { MatchHeader } from './MatchHeader'
import { SaveImageButton } from './SaveImageButton'
import { ShareLinkButton } from './ShareLinkButton'
import { buildingLinkUrl } from '../../services/buildingLink'
import { encodeConfig } from '../../services/urlConfig'
import { buildingShareModel } from '../../services/shareImage/shareImageModel'
import { useSheetSlots } from '../MobileSheet/sheetSlots'

const DIM = { fontSize: 10, opacity: 0.75 }

/** How the building's era relates to the eras the user likes, from its age score. */
function ageMatch(score: number): string {
  if (score === 0) return i18n.t('card:ageMatch.none')
  if (score === 100) return i18n.t('card:ageMatch.full')
  return i18n.t('card:ageMatch.edge')
}
const fmt = (n: number) => formatNumber(n, { maximumFractionDigits: 0 })

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" gap="xs" wrap="nowrap">
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size="xs" fw={500} ta="right">{value}</Text>
    </Group>
  )
}

/** Catastro facts (stage 5 attributes, shown only). */
function BuildingFacts({ d }: { d: BuildingDetail }) {
  const { t } = useTranslation('card')
  const other = (d.units ?? 0) - (d.dwellings ?? 0)
  const [below, setBelow] = useState<{ ref: string; uses: string[] } | null>(null)

  // What the floors below ground are (car park, storage, flats) — INSPIRE only counts them.
  useEffect(() => {
    if (!d.floors_below) return
    let cancelled = false
    loadCatastroUnits(d.id)
      .then((units) => { if (!cancelled) setBelow({ ref: d.id, uses: belowGroundUses(units) }) })
      .catch((err) => console.warn('Catastro units failed to load', err))
    return () => { cancelled = true }
  }, [d.id, d.floors_below])

  const belowUses = below?.ref === d.id ? below.uses : []
  return (
    <Stack gap={3}>
      {d.dwellings !== undefined && (
        <Row label={t('facts.dwellings')} value={`${d.dwellings}${other > 0 ? ` · ${t('facts.dwellingsValue', { n: other })}` : ''}`} />
      )}
      {d.floors !== undefined && (
        <Row label={t('facts.floors')} value={`${d.floors}${d.floors_below ? ` + ${t('facts.below', { n: d.floors_below })}` : ''}`} />
      )}
      {belowUses.length > 0 && <Row label={t('facts.belowGround')} value={belowUses.join(', ')} />}
      {d.year_built !== undefined && (
        <Row label={t('facts.built')}
          value={`${d.year_built} · ${eraOf(d.year_built).name}${d.year_renov ? ` · ${t('facts.renovated', { year: d.year_renov })}` : ''}`} />
      )}
      {d.year_built === UNCERTAIN_YEAR && (
        <Text size="xs" c="dimmed" style={DIM}>{t('facts.uncertain')}</Text>
      )}
      {d.area_m2 !== undefined && <Row label={t('facts.builtArea')} value={`${fmt(d.area_m2)} m²`} />}
      {d.condition && d.condition !== 'functional' && <Row label={t('facts.condition')} value={d.condition} />}
      {other > 0 && (
        <Text size="xs" c="dimmed" style={DIM}>{t('facts.otherPremises')}</Text>
      )}
    </Stack>
  )
}

function NoiseDetails({ d, facades }: { d: BuildingDetail; facades: BuildingDetailResult['facades'] }) {
  const { t } = useTranslation('card')
  if (d.lden_avg === undefined) return <Text size="xs" c="dimmed">{t('noise.noMap')}</Text>
  const sica = d.noise_src === 'sica_2022'
  const approx = sica ? '≈ ' : ''
  const groups = [...facades].sort((a, b) => b.lden - a.lden)
  return (
    <Stack gap={3}>
      <Group gap={6} align="center">
        <Text size="xs">
          {t('noise.typical', { approx, db: Math.round(d.lden_avg) })}{d.ln_avg !== undefined && t('noise.night', { ln: Math.round(d.ln_avg) })}
        </Text>
        <NoiseLabel lden={d.lden_avg} />
      </Group>
      {[sideText('street', d.lden_street, d.ln_street), sideText('inner', d.lden_inner, d.ln_inner)]
        .filter((line): line is string => line !== null)
        .map((line) => <Text key={line} size="xs" c="dimmed">{approx}{line}</Text>)}
      {d.lden_max !== undefined && d.lden_min !== undefined && (
        <Text size="xs" c="dimmed">{t('noise.extremes', { max: Math.round(d.lden_max), min: Math.round(d.lden_min) })}</Text>
      )}
      {groups.length > 0 && (
        <Stack gap={1} mt={2}>
          {groups.map((g) => (
            <Text key={`${g.side}-${g.dir}`} size="xs" c="dimmed" style={{ fontSize: 10 }}>
              {t('noise.group', { side: g.side === 'street' ? t('noise.street') : t('noise.courtyard'), dir: g.dir, len: Math.round(g.length_m), db: Math.round(g.lden) })}
              {g.ln !== undefined && t('noise.groupNight', { ln: Math.round(g.ln) })}
            </Text>
          ))}
        </Stack>
      )}
      {d.f17_lden_max !== undefined && d.f17_lden_max > 0 && (
        <Text size="xs" c="dimmed">
          {t('noise.f17', { db: Math.round(d.f17_lden_max) })}
          {d.f17_ln_max !== undefined && t('noise.f17Night', { ln: Math.round(d.f17_ln_max) })}
        </Text>
      )}
      {d.f17_leisure_ln_max !== undefined && d.f17_leisure_ln_max > 0 && (
        <Text size="xs" c="dimmed">{t('noise.leisure', { db: Math.round(d.f17_leisure_ln_max) })}</Text>
      )}
      <Text size="xs" c="dimmed" style={DIM}>
        {t('noise.modelled')}
      </Text>
      {sica && (
        <Text size="xs" c="dimmed" fs="italic" style={DIM}>
          {t('noise.sica')}
        </Text>
      )}
      <Text size="xs" c="dimmed" style={DIM}>{t('noise.who')}</Text>
    </Stack>
  )
}

/**
 * The building card. On desktop a card over the top right of the map. With `embedded` (the phone layout, TODO-062)
 * it fills the slots of the bottom sheet instead: a two-line header for peek (address, match) and the details
 * below it.
 */
export function BuildingCard({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation('card')
  const slots = useSheetSlots()
  const selected = useStore((s) => s.selectedBuilding)
  const setSelected = useStore((s) => s.setSelectedBuilding)
  const weights = useStore((s) => s.compositeWeights)
  const enabledLandmarkIds = useStore((s) => s.enabledLandmarkIds)
  const enabledCategories = useStore((s) => s.enabledWalkCategories)
  const riskStrengths = useStore((s) => s.compositeRiskStrengths)
  const ageEras = useStore((s) => s.ageEras)
  const conditions = useStore((s) => s.conditions)
  const [sMin, sMax] = useStore((s) => s.compositeColorRange)
  const [loaded, setLoaded] = useState<{ i: number; result: BuildingDetailResult } | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setSelected])

  // A new building starts at the top of the sheet's body.
  const sheetBody = slots.body
  useEffect(() => {
    const scroller = sheetBody?.closest('.mobile-sheet__body')
    if (scroller) scroller.scrollTop = 0
  }, [selected, sheetBody])

  // The positions may arrive a moment after the buildings are coloured (TODO-058): the card shows once they are in.
  const data = useBuildingData(selected !== null)
  useEffect(() => {
    if (selected === null || !data) return
    let cancelled = false
    loadBuildingDetail(selected, data.cols.lng[selected], data.cols.lat[selected])
      .then((result) => { if (!cancelled) setLoaded({ i: selected, result }) })
      .catch((err) => console.error('Building card failed to load', err))
    return () => { cancelled = true }
  }, [selected, data])

  if (selected === null || !data) return null

  const vibe = features.localsOpinion ? barriVibeData : null
  const composite = scoreBuilding(data, selected, {
    weights, conditions, enabledLandmarkIds, enabledCategories, riskStrengths, ageEras, vibe,
  })
  const { score, components, penalties } = composite
  const barColor = (v: number | null) => (v !== null ? scoreColor(v) : '#aaa')
  const lden = valueOf(data, 'lden_avg', selected)
  const services = SERVICE_CATEGORIES.filter((c) => enabledCategories.includes(c.id))
    .map((cat) => ({ cat, minutes: valueOf(data, `min_${cat.id}`, selected) }))
  const placeMinutes = enabledLandmarkIds.map((id) => valueOf(data, `cc_${id}`, selected))
  const yearBuilt = valueOf(data, 'year_built', selected)
  const area = buildingArea(data, selected)
  const barri = area?.kind === 'barri' && vibe ? vibe.barris[area.code] : undefined
  const result = loaded?.i === selected ? loaded.result : null
  const d = result?.detail ?? null
  const riskShown = riskStrengths.flood > 0 || riskStrengths.fire > 0 || riskStrengths.street > 0
  const warning = d && groundFloorWarning(d.street_t10_cm, d.street_t100_cm, d.river_zone, d.floors_below)
  const color = scoreColorForRange(score, sMin, sMax)
  const withinMin = (minutes: readonly (number | null)[], limit: number) =>
    minutes.filter((m) => m !== null && m <= limit).length
  const summary = matchSummary(composite, weights, {
    noise: lden !== null ? noiseText(lden, conditions.noiseMaxDb) : undefined,
    poiAccess: poiText(withinMin(services.map((x) => x.minutes), conditions.walkMaxMin), services.length, conditions.walkMaxMin),
    cityCore: cityCoreText(withinMin(placeMinutes, conditions.cityCoreMaxMin), placeMinutes.length, conditions.cityCoreMaxMin),
    openPrice: area?.price != null ? priceText(area.price, conditions.priceMaxEurM2) : undefined,
    localsOpinion: barri ? localsText(barri.satisfAdj, conditions.localsMin) : undefined,
    age: ageText(yearBuilt !== null ? eraOf(yearBuilt).name : null),
  })
  const riskText = riskLine(penalties, { flood: d?.river_zone ? t('river.zoneYear', { year: d.river_zone }) : undefined })
  const landmarks = enabledLandmarkIds
    .map((id) => ({ id, name: LANDMARKS.find((l) => l.id === id)?.name ?? id, minutes: valueOf(data, `cc_${id}`, selected) }))
    .filter((e): e is { id: string; name: string; minutes: number } => e.minutes !== null)
    .sort((a, b) => a.minutes - b.minutes)

  const address = prettyAddress(d?.address) ?? (d ? t('ui.buildingTitle') : t('ui.loading'))
  const shownScore = composite.hasGap && composite.scoreMin < score ? `${composite.scoreMin}–${score}` : String(score)
  const buildingPos: [number, number] = [data.cols.lng[selected], data.cols.lat[selected]]
  const buildingLink = () => buildingLinkUrl(
    window.location.href, encodeConfig(settingsOf(useStore.getState()), URL_DEFAULTS), buildingPos)
  const details = (
        <Stack gap="sm">
          {d && features.facadePhoto && (
            <Stack gap={2}>
              <img src={facadePhotoUrl(d.id)} alt={t('ui.photoAlt', { address: prettyAddress(d.address) ?? t('ui.photoAltFallback') })}
                style={{ width: '100%', maxHeight: 170, objectFit: 'cover', borderRadius: 4, background: '#f1f3f5' }}
                onError={(e) => { e.currentTarget.style.display = 'none' }} />
              <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>{t('ui.photoCredit')}</Text>
            </Stack>
          )}

          <MatchHeader
            score={score} scoreMin={composite.scoreMin} incomplete={composite.hasGap}
            summary={summary} riskText={riskText} color={color} compact={embedded}
          />

          {d && (
            <SaveImageButton
              lngLat={buildingPos}
              build={(profile) => buildingShareModel({
                address: prettyAddress(d.address), area, score, summary, riskText, profile,
              })}
              link={buildingLink}
              extra={<ShareLinkButton getUrl={buildingLink} copied={t('shareCopied.building')} />}
            />
          )}

          {d && (
            <>
              <Divider />
              <SectionTitle>{t('section.building')}</SectionTitle>
              <BuildingFacts d={d} />
              <Anchor href={catastroUrl(d.id)} target="_blank" rel="noopener noreferrer" size="xs">
                {t('ui.openCatastro')}
              </Anchor>
            </>
          )}

          <Divider />
          <Stack gap={4}>
            <SectionTitle>{t('section.walkability')}</SectionTitle>
            {weights.poiAccess > 0 && (
              <>
                <ScoreBar score={components.poiAccess} color={barColor(components.poiAccess)} />
                <Text size="xs">{countWithin(services.map((s) => s.minutes), conditions.walkMaxMin, 'services')}</Text>
              </>
            )}
            <Text size="xs" c="dimmed" style={DIM}>{t('ui.walkNote')}</Text>
            {services.map(({ cat, minutes }) => {
              const sub = minutesShare([minutes], conditions.walkMaxMin)
              return (
                <Group key={cat.id} gap={4} wrap="nowrap" align="center">
                  <Text style={{ fontSize: 11, width: 16, lineHeight: 1 }}>{cat.emoji}</Text>
                  <Text size="xs" c="dimmed" style={{ flex: 1, fontSize: 10 }}>{cat.label}</Text>
                  <Text style={{ fontSize: 10, minWidth: 40, textAlign: 'right' }} c="dimmed">
                    {minutes !== null ? t('minutes', { n: minutes }) : t('ui.noneNearby')}
                  </Text>
                  <div style={{ width: 40, height: 3, borderRadius: 2, background: '#eee', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${sub}%`, background: scoreColor(sub) }} />
                  </div>
                </Group>
              )
            })}
          </Stack>

          <Divider />
          <Stack gap={4}>
            <SectionTitle>{t('section.noise')}</SectionTitle>
            {weights.noise > 0 && (
              <>
                <ScoreBar score={components.noise} color={barColor(components.noise)} />
                {lden !== null && <Text size="xs">{noiseVsLimit(lden, conditions.noiseMaxDb)}</Text>}
              </>
            )}
            {d ? <NoiseDetails d={d} facades={result?.facades ?? []} /> : <Text size="xs" c="dimmed">{t('ui.loading')}</Text>}
          </Stack>

          {weights.cityCore > 0 && (
            <>
              <Divider />
              <Stack gap={4}>
                <SectionTitle>{t('section.cityCore')}</SectionTitle>
                <ScoreBar score={components.cityCore} color={barColor(components.cityCore)} />
                <Text size="xs">{countWithin(placeMinutes, conditions.cityCoreMaxMin, 'places')}</Text>
                {landmarks.map((e) => <LandmarkRow key={e.id} name={e.name} minutes={e.minutes} />)}
              </Stack>
            </>
          )}

          {weights.age > 0 && (
            <>
              <Divider />
              <Stack gap={4}>
                <SectionTitle>{t('section.age')}</SectionTitle>
                <ScoreBar score={components.age} color={barColor(components.age)} />
                <Text size="xs" c="dimmed">
                  {yearBuilt === null || components.age === null
                    ? t('ui.yearUnknown')
                    : t('ui.ageLine', { era: eraOf(yearBuilt).name, years: eraOf(yearBuilt).years, match: ageMatch(components.age) })}
                </Text>
                {d?.year_renov !== undefined && (
                  <Text size="xs" c="dimmed" style={DIM}>
                    {t('ui.renovated', { year: d.year_renov })}
                  </Text>
                )}
              </Stack>
            </>
          )}

          {riskShown && d && (
            <>
              <Divider />
              <Stack gap={6}>
                <SectionTitle>{t('section.climate')}</SectionTitle>
                {warning && <Text size="xs" fw={600} c="red.7">{warning}</Text>}
                {riskStrengths.flood > 0 && (
                  <RiskRow label={t('ui.riskRiver')} text={riverText(d.river_zone)} penalty={penalties.flood} />
                )}
                {riskStrengths.street > 0 && (
                  <RiskRow label={t('ui.riskStreet')} text={doorWaterText(d.street_t10_cm, d.street_t100_cm)}
                    penalty={penalties.street} />
                )}
                {riskStrengths.fire > 0 && (
                  <RiskRow label={t('ui.riskWildfire')} text={fireText(d)} penalty={penalties.fire} />
                )}
              </Stack>
            </>
          )}

          {area && (
            <>
              <Divider />
              <Stack gap={4}>
                <Group justify="space-between" gap="xs" wrap="nowrap">
                  <SectionTitle>{area.kind === 'barri' ? t('section.barri') : t('section.muni')}</SectionTitle>
                  <Text size="xs" c="dimmed">{area.name}</Text>
                </Group>
                <Text size="xs" c="dimmed" style={DIM}>{t('ui.sameFor', { kind: area.kind === 'barri' ? t('ui.kindBarri') : t('ui.kindMuni') })}</Text>
                {area.price === null && <Text size="xs" c="dimmed">{t('ui.noPrice')}</Text>}
                {area.price !== null && weights.openPrice > 0 && (
                  <Text size="xs">{t('ui.salePrice', { text: priceVsBudget(area.price, conditions.priceMaxEurM2) })}</Text>
                )}
                {area.price !== null && weights.openPrice === 0 && (
                  <Text size="xs"><Trans i18nKey="ui.salePriceOpen" ns="card" values={{ price: fmt(area.price) }} components={{ b: <b /> }} /></Text>
                )}
                {weights.openPrice > 0 && (
                  <ScoreBar score={components.openPrice} color={barColor(components.openPrice)} />
                )}
                {features.localsOpinion && barriVibeData && (
                  <>
                    <Text size="xs" fw={500} mt={4}>{t('ui.localsSay')}</Text>
                    {weights.localsOpinion > 0 && (
                      <ScoreBar score={components.localsOpinion} color={barColor(components.localsOpinion)} />
                    )}
                    {weights.localsOpinion > 0 && barri && (
                      <Text size="xs">{ratingVsMin(barri.satisfAdj, conditions.localsMin)}</Text>
                    )}
                    {barri ? <LocalsSay barri={barri} data={barriVibeData} />
                      : <Text size="xs" c="dimmed">{t('ui.notBcn')}</Text>}
                  </>
                )}
              </Stack>
            </>
          )}
        </Stack>
  )

  if (embedded) {
    if (!slots.header || !slots.body) return null
    const peek = (
      <Group justify="space-between" align="flex-start" wrap="nowrap" className="building-peek">
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text fw={700} size="md" truncate>{address}</Text>
          <Text size="sm" fw={700} style={{ color }} data-testid="peek-match">
            {BAND_LABEL[matchBand(score)]} · {shownScore}
            <Text span size="sm" fw={500} c="dimmed">
              {' · '}{summary.total > 0 ? t('ui.peekMeets', { met: summary.met, total: summary.total }) : t('ui.peekNone')}
            </Text>
          </Text>
        </Stack>
        <ActionIcon size={44} radius="md" variant="subtle" color="gray" onClick={() => setSelected(null)}
          aria-label={t('ui.closeBuilding')} style={{ flex: 'none', marginTop: -4, marginRight: -8 }}>
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
        {/* The header stays in view while the details scroll under it. */}
        <Group justify="space-between" align="flex-start" wrap="nowrap" className="building-card__header">
          <Stack gap={0}>
            <Text size="sm" fw={700}>{address}</Text>
            {d && (
              <Text size="xs" c="dimmed">
                {d.student ? t('ui.studentResidence') : USE_LABEL[d.use ?? ''] ?? t('use.other')}
              </Text>
            )}
          </Stack>
          <ActionIcon size={36} radius="md" variant="subtle" color="gray" onClick={() => setSelected(null)}
            aria-label={t('ui.closeBuilding')} style={{ flex: 'none', marginTop: -6, marginRight: -8 }}>
            <IconX size={24} stroke={2} />
          </ActionIcon>
        </Group>
        <div className="building-card__body">
{details}
        </div>
      </Paper>
    </div>
  )
}

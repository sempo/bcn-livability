import { useEffect, useState } from 'react'
import { ActionIcon, Anchor, Divider, Group, Paper, Stack, Text } from '@mantine/core'
import { useStore } from '../../store'
import { buildingData, valueOf } from '../../services/buildings/buildingData'
import { buildingArea, scoreBuilding } from '../../services/buildings/buildingScore'
import { loadBuildingDetail, type BuildingDetail, type BuildingDetailResult } from '../../services/buildings/buildingDetail'
import { catastroUrl, facadePhotoUrl, prettyAddress } from '../../services/buildings/address'
import { belowGroundUses, loadCatastroUnits } from '../../services/buildings/catastroUnits'
import { LANDMARKS } from '../../services/cityCore/landmarks'
import { SERVICE_CATEGORIES } from '../../services/walkability/serviceCategories'
import { barriVibeData } from '../../services/localsOpinion/localsOpinion'
import { LandmarkRow, LocalsSay, NoiseLabel, RiskRow, ScoreBar, SectionTitle } from './cardParts'
import { scoreColor, scoreColorForRange } from './cardColors'
import { fireText } from './cardText'
import {
  USE_LABEL, doorWaterText, groundFloorWarning, riverText, sideText,
} from './buildingCardText'
import { features } from '../../features'

const DIM = { fontSize: 10, opacity: 0.75 }
const fmt = (n: number) => new Intl.NumberFormat('en-ES', { maximumFractionDigits: 0 }).format(n)

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
        <Row label="Dwellings" value={`${d.dwellings}${other > 0 ? ` · ${other} other premises` : ''}`} />
      )}
      {d.floors !== undefined && (
        <Row label="Floors" value={`${d.floors}${d.floors_below ? ` + ${d.floors_below} below ground` : ''}`} />
      )}
      {belowUses.length > 0 && <Row label="Below ground" value={belowUses.join(', ')} />}
      {d.year_built !== undefined && (
        <Row label="Built" value={`${d.year_built}${d.year_renov ? ` · renovated ${d.year_renov}` : ''}`} />
      )}
      {d.area_m2 !== undefined && <Row label="Built area" value={`${fmt(d.area_m2)} m²`} />}
      {d.condition && d.condition !== 'functional' && <Row label="Condition" value={d.condition} />}
      {other > 0 && (
        <Text size="xs" c="dimmed" style={DIM}>Other premises: shops, offices, parking spaces, storage rooms</Text>
      )}
    </Stack>
  )
}

function NoiseDetails({ d, facades }: { d: BuildingDetail; facades: BuildingDetailResult['facades'] }) {
  if (d.lden_avg === undefined) return <Text size="xs" c="dimmed">No official noise map for this municipality</Text>
  const sica = d.noise_src === 'sica_2022'
  const approx = sica ? '≈ ' : ''
  const groups = [...facades].sort((a, b) => b.lden - a.lden)
  return (
    <Stack gap={3}>
      <Group gap={6} align="center">
        <Text size="xs">
          Typical window: {approx}{Math.round(d.lden_avg)} dB{d.ln_avg !== undefined && ` · night ${Math.round(d.ln_avg)}`}
        </Text>
        <NoiseLabel lden={d.lden_avg} />
      </Group>
      {[sideText('street', d.lden_street, d.ln_street), sideText('inner', d.lden_inner, d.ln_inner)]
        .filter((t): t is string => t !== null)
        .map((t) => <Text key={t} size="xs" c="dimmed">{approx}{t}</Text>)}
      {d.lden_max !== undefined && d.lden_min !== undefined && (
        <Text size="xs" c="dimmed">Loudest facade {Math.round(d.lden_max)} dB · quietest {Math.round(d.lden_min)} dB</Text>
      )}
      {groups.length > 0 && (
        <Stack gap={1} mt={2}>
          {groups.map((g) => (
            <Text key={`${g.side}-${g.dir}`} size="xs" c="dimmed" style={{ fontSize: 10 }}>
              {g.side === 'street' ? 'Street' : 'Courtyard'} · faces {g.dir} · {Math.round(g.length_m)} m —{' '}
              {Math.round(g.lden)} dB{g.ln !== undefined && ` (night ${Math.round(g.ln)})`}
            </Text>
          ))}
        </Stack>
      )}
      {d.f17_lden_max !== undefined && d.f17_lden_max > 0 && (
        <Text size="xs" c="dimmed">
          Official facade map 2017: loudest facade {Math.round(d.f17_lden_max)} dB
          {d.f17_ln_max !== undefined && `, night ${Math.round(d.f17_ln_max)} dB`}
        </Text>
      )}
      {d.f17_leisure_ln_max !== undefined && d.f17_leisure_ln_max > 0 && (
        <Text size="xs" c="dimmed">Night-life noise on a facade: {Math.round(d.f17_leisure_ln_max)} dB</Text>
      )}
      <Text size="xs" c="dimmed" style={DIM}>
        Modelled at 4 m above ground (≈ 1st floor). Coloured circles next to the facades on the map.
      </Text>
      {sica && (
        <Text size="xs" c="dimmed" fs="italic" style={DIM}>
          Different official model (SICA 2022, 5 dB bands): its levels run a few dB higher than Barcelona's map,
          so compare with Barcelona with care.
        </Text>
      )}
      <Text size="xs" c="dimmed" style={DIM}>WHO: &lt; 53 dB · EU action: 55 dB · harmful: ≥ 65 dB</Text>
    </Stack>
  )
}

export function BuildingCard() {
  const selected = useStore((s) => s.selectedBuilding)
  const setSelected = useStore((s) => s.setSelectedBuilding)
  const weights = useStore((s) => s.compositeWeights)
  const enabledLandmarkIds = useStore((s) => s.enabledLandmarkIds)
  const enabledCategories = useStore((s) => s.enabledWalkCategories)
  const riskStrengths = useStore((s) => s.compositeRiskStrengths)
  const [sMin, sMax] = useStore((s) => s.compositeColorRange)
  const [loaded, setLoaded] = useState<{ i: number; result: BuildingDetailResult } | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setSelected])

  useEffect(() => {
    const data = buildingData
    if (selected === null || !data) return
    let cancelled = false
    loadBuildingDetail(selected, data.cols.lng[selected], data.cols.lat[selected])
      .then((result) => { if (!cancelled) setLoaded({ i: selected, result }) })
      .catch((err) => console.error('Building card failed to load', err))
    return () => { cancelled = true }
  }, [selected])

  const data = buildingData
  if (selected === null || !data) return null

  const vibe = features.localsOpinion ? barriVibeData : null
  const { score, baseScore, components, penalties } = scoreBuilding(data, selected, {
    weights, enabledLandmarkIds, enabledCategories, riskStrengths, vibe,
  })
  const area = buildingArea(data, selected)
  const barri = area?.kind === 'barri' && vibe ? vibe.barris[area.code] : undefined
  const result = loaded?.i === selected ? loaded.result : null
  const d = result?.detail ?? null
  const riskShown = riskStrengths.flood > 0 || riskStrengths.fire > 0 || riskStrengths.street > 0
  const warning = d && groundFloorWarning(d.street_t10_cm, d.street_t100_cm, d.river_zone, d.floors_below)
  const color = scoreColorForRange(score, sMin, sMax)
  const landmarks = enabledLandmarkIds
    .map((id) => ({ id, name: LANDMARKS.find((l) => l.id === id)?.name ?? id, minutes: valueOf(data, `cc_${id}`, selected) }))
    .filter((e): e is { id: string; name: string; minutes: number } => e.minutes !== null)
    .sort((a, b) => a.minutes - b.minutes)

  return (
    <div className="building-card-overlay">
      <Paper shadow="md" p="md" radius="md" w={300} style={{ maxHeight: 'calc(100vh - 96px)', overflowY: 'auto' }}>
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Stack gap={0}>
              <Text size="sm" fw={700}>{prettyAddress(d?.address) ?? (d ? 'Building' : 'Loading…')}</Text>
              {d && (
                <Text size="xs" c="dimmed">
                  {d.student ? 'Student residence' : USE_LABEL[d.use ?? ''] ?? 'Building'}
                </Text>
              )}
            </Stack>
            <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setSelected(null)}
              aria-label="Close building card">×</ActionIcon>
          </Group>

          {d && features.facadePhoto && (
            <Stack gap={2}>
              <img src={facadePhotoUrl(d.id)} alt={`Facade of ${prettyAddress(d.address) ?? 'the building'}`}
                style={{ width: '100%', maxHeight: 170, objectFit: 'cover', borderRadius: 4, background: '#f1f3f5' }}
                onError={(e) => { e.currentTarget.style.display = 'none' }} />
              <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>Photo © Dirección General del Catastro</Text>
            </Stack>
          )}

          <Stack gap={2}>
            <Text size="xs" c="dimmed">Livability</Text>
            <Text fw={800} lh={1} style={{ fontSize: 28, color }}>
              {score}<Text component="span" size="sm" c="dimmed" fw={400}> / 100</Text>
            </Text>
            {penalties.flood + penalties.fire + penalties.street > 0 && (
              <Text size="xs" c="dimmed">{baseScore} before risk penalties</Text>
            )}
          </Stack>

          {d && (
            <>
              <Divider />
              <SectionTitle>Building</SectionTitle>
              <BuildingFacts d={d} />
              <Anchor href={catastroUrl(d.id)} target="_blank" rel="noopener noreferrer" size="xs">
                Open in Catastro ↗
              </Anchor>
            </>
          )}

          <Divider />
          <Stack gap={4}>
            <SectionTitle>Walkability</SectionTitle>
            <ScoreBar score={components.poiAccess} color={scoreColor(components.poiAccess)} />
            <Text size="xs" c="dimmed" style={DIM}>Walking time from the entrance, along the streets</Text>
            {SERVICE_CATEGORIES.filter((c) => enabledCategories.includes(c.id)).map((cat) => {
              const sub = valueOf(data, `walk_${cat.id}`, selected) ?? 0
              const minutes = d?.[`min_${cat.id}`]
              return (
                <Group key={cat.id} gap={4} wrap="nowrap" align="center">
                  <Text style={{ fontSize: 11, width: 16, lineHeight: 1 }}>{cat.emoji}</Text>
                  <Text size="xs" c="dimmed" style={{ flex: 1, fontSize: 10 }}>{cat.label}</Text>
                  <Text style={{ fontSize: 10, minWidth: 40, textAlign: 'right' }} c="dimmed">
                    {minutes !== undefined ? `${minutes} min` : 'none nearby'}
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
            <SectionTitle>Noise</SectionTitle>
            {weights.noise > 0 && (
              <ScoreBar score={components.noise} color={components.noise !== null ? scoreColor(components.noise) : '#aaa'} />
            )}
            {d ? <NoiseDetails d={d} facades={result?.facades ?? []} /> : <Text size="xs" c="dimmed">Loading…</Text>}
          </Stack>

          {weights.cityCore > 0 && (
            <>
              <Divider />
              <Stack gap={4}>
                <SectionTitle>City Core Access</SectionTitle>
                <ScoreBar score={components.cityCore} color={scoreColor(components.cityCore)} />
                {landmarks.map((e) => <LandmarkRow key={e.id} name={e.name} minutes={e.minutes} />)}
              </Stack>
            </>
          )}

          {riskShown && d && (
            <>
              <Divider />
              <Stack gap={6}>
                <SectionTitle>Climate risk</SectionTitle>
                {warning && <Text size="xs" fw={600} c="red.7">{warning}</Text>}
                {riskStrengths.flood > 0 && (
                  <RiskRow label="River flooding" text={riverText(d.river_zone)} penalty={penalties.flood} />
                )}
                {riskStrengths.street > 0 && (
                  <RiskRow label="Street flooding (heavy rain)" text={doorWaterText(d.street_t10_cm, d.street_t100_cm)}
                    penalty={penalties.street} />
                )}
                {riskStrengths.fire > 0 && (
                  <RiskRow label="Wildfire" text={fireText(d)} penalty={penalties.fire} />
                )}
              </Stack>
            </>
          )}

          {area && (
            <>
              <Divider />
              <Stack gap={4}>
                <Group justify="space-between" gap="xs" wrap="nowrap">
                  <SectionTitle>{area.kind === 'barri' ? 'Barri-level' : 'Municipality-level'}</SectionTitle>
                  <Text size="xs" c="dimmed">{area.name}</Text>
                </Group>
                <Text size="xs" c="dimmed" style={DIM}>The same for every building in the {area.kind === 'barri' ? 'barri' : 'municipality'}</Text>
                {area.price !== null ? (
                  <Text size="xs">Sale price: <b>{fmt(area.price)} €/m²</b> · Generalitat official data</Text>
                ) : (
                  <Text size="xs" c="dimmed">No sale price data</Text>
                )}
                {weights.openPrice > 0 && (
                  <ScoreBar score={components.openPrice}
                    color={components.openPrice !== null ? scoreColor(components.openPrice) : '#aaa'} />
                )}
                {features.localsOpinion && barriVibeData && (
                  <>
                    <Text size="xs" fw={500} mt={4}>What locals say</Text>
                    {weights.localsOpinion > 0 && (
                      <ScoreBar score={components.localsOpinion}
                        color={components.localsOpinion !== null ? scoreColor(components.localsOpinion) : '#aaa'} />
                    )}
                    {barri ? <LocalsSay barri={barri} data={barriVibeData} />
                      : <Text size="xs" c="dimmed">Not available outside Barcelona city</Text>}
                  </>
                )}
              </Stack>
            </>
          )}
        </Stack>
      </Paper>
    </div>
  )
}

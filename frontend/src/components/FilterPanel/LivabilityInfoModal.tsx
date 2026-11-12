import { Modal, Stack, Text } from '@mantine/core'
import {
  MINUTES_FALLOFF_FACTOR, NOISE_FALLOFF_DB, PRICE_FALLOFF_PCT, SATISF_FALLOFF,
} from '../../services/buildings/conditions'
import { features } from '../../features'

export function LivabilityInfoModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  return (
    <Modal opened={opened} onClose={onClose} title="About Livability Index" size="md">
      <Stack gap={12} pb={8}>
        <Text size="sm">
          The Livability Index shows how well each home meets your conditions. Turn a condition on and set
          what is OK for you: a home that meets it scores 100 on it, and less the further it falls short.
          The index is the average over the conditions that are on, then reduced by the climate risks you
          care about. Colours use a fixed 0–100 scale in four bands (Great, Good, Partial, Poor match); Boost
          contrast fits them to the visible area instead.
        </Text>

        <Stack gap={6}>
          <Text size="sm" fw={600}>Walkability</Text>
          <Text size="xs" c="dimmed">
            Walking minutes from the building's entrance to the nearest supermarket, pharmacy, park, school,
            kindergarten, clinic, metro, café, restaurant and beach, along the street network (OSM); parks and
            beaches count to their edge. A service within your limit counts fully, fading to 0 at {MINUTES_FALLOFF_FACTOR}×
            the limit; one beyond 1.5 km counts 0. The score is the share of your services within reach — you
            can pick which ones count.
          </Text>
        </Stack>

        <Stack gap={6}>
          <Text size="sm" fw={600}>Noise outside the window</Text>
          <Text size="xs" c="dimmed">
            Lden (day-evening-night level, dB) along every exposed facade of the building — street and
            courtyard sides — averaged by facade length: the noise of a typical window, modelled 4 m above the
            ground. Within your limit → 100; {NOISE_FALLOFF_DB} dB over it → 0. For reference: 45 dB a quiet courtyard,
            55 a calm street, 65 a busy street, 75 a main road; the WHO recommends below 53 dB. Barcelona: the
            city's 2022 strategic noise map; 14 AMB municipalities: their 2022 official maps (SICA), a different
            model that reads a few dB louder.
          </Text>
        </Stack>

        <Stack gap={6}>
          <Text size="sm" fw={600}>City Core Access</Text>
          <Text size="xs" c="dimmed">
            Walking minutes to each place you pick (Sagrada Família, Plaça Catalunya…), along the
            street network from the building. A place within your limit counts fully, fading to 0 at
            {' '}{MINUTES_FALLOFF_FACTOR}× the limit; the score is the share of your places within reach.
          </Text>
        </Stack>

        <Stack gap={6}>
          <Text size="sm" fw={600}>Market Price (Generalitat)</Text>
          <Text size="xs" c="dimmed">
            Official average sale price €/m² of the building's barri (Barcelona) or municipality (Generalitat
            de Catalunya, INCASOL) — the area's average, not the price of a specific flat. At or below your
            budget → 100; {PRICE_FALLOFF_PCT}% over it → 0.
          </Text>
        </Stack>

        {features.localsOpinion && (
          <Stack gap={6}>
            <Text size="sm" fw={600}>Locals' opinion</Text>
            <Text size="xs" c="dimmed">
              How satisfied residents are with living in their barri (0–10), from Barcelona's municipal
              services survey (ESM, 2022–2026, about 30,000 interviews). Barris with few interviews are pulled
              towards their wider area (gran barri). At or above your minimum → 100; {SATISF_FALLOFF} point below it →
              0. Barcelona city only — buildings outside count as missing data. Barris with few interviews also
              count as missing data.
            </Text>
          </Stack>
        )}

        <Stack gap={6}>
          <Text size="sm" fw={600}>Building age</Text>
          <Text size="xs" c="dimmed">
            Off by default. Tick the eras of construction you like: a building of a liked era
            scores 100, any other 0, fading over a few years at the edges of an era. Year of construction from
            Catastro; a renovation is shown in the building card but does not change the score. Catastro gives
            1900 for many old buildings whose exact year is unknown, so 1900 counts for both neighbouring eras.
          </Text>
        </Stack>

        <Stack gap={6}>
          <Text size="sm" fw={600}>Risk penalties</Text>
          <Text size="xs" c="dimmed">
            Climate risks are not averaged in — they reduce the score of exposed buildings only:
            score × (1 − strength/10 × risk). Safe buildings keep their score; strength 10 on a
            building in the highest-risk zone drives it to 0.
          </Text>
          <Text size="xs" c="dimmed">
            <b>River flood risk</b> — the building touches one of the official river flood zones (ACA): 10-year
            zone counts fully, 100-year 60%, 500-year 25%. Rivers overflowing only — rain water on
            streets is the separate Street flooding risk.
          </Text>
          <Text size="xs" c="dimmed">
            <b>Wildfire risk</b> — the building touches the wildland–urban interface (Protecció
            Civil, zones around forests ≥ 5 ha) × the hazard of the nearest forest (Generalitat
            structural wildfire hazard map 2024, classes 1–10), fading with distance. A static
            hazard map, not a forecast; recent burned areas are not reflected.
          </Text>
          <Text size="xs" c="dimmed">
            <b>Street flooding risk</b> — how deep the water gets at the building's door in a 10-year and a
            100-year rain (RESCCUE drainage model, Barcelona only). Depth is weighted smoothly: water
            up to 10 cm stays in the gutter and counts 0, 50 cm or more counts fully. Matters most for
            ground-floor flats, basements and underground parking.
          </Text>
        </Stack>

      </Stack>
    </Modal>
  )
}

import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import { IconCurrentLocation } from '@tabler/icons-react'
import { useMapStore } from '../../store/mapStore'
import { useStore } from '../../store'
import { useBuildingData } from '../../hooks/useBuildingData'
import { locateOutcome } from '../../services/locate'
import { LOCATE_NEAREST_BUILDING_M } from '../../services/phoneConfig'

const NOTE_MS = 4000
const LOCATE_ZOOM = 17

const NOTES = {
  outside: 'You are outside the map area.',
  denied: 'Location is blocked. Allow it for this site in your browser settings.',
  failed: 'Could not find your position. Try again outside or near a window.',
  unsupported: 'This browser cannot tell where you are.',
} as const

/**
 * "Where am I" (TODO-062), asked only on tap. Flies to the position and, when a home is within
 * LOCATE_NEAREST_BUILDING_M metres, opens it in the sheet.
 */
export function LocateButton() {
  const map = useMapStore((s) => s.map)
  const data = useBuildingData(true)
  const setSelectedBuilding = useStore((s) => s.setSelectedBuilding)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const dot = useRef<maplibregl.Marker | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => { clearTimeout(timer.current); dot.current?.remove() }, [])

  const say = (text: string) => {
    setNote(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setNote(null), NOTE_MS)
  }

  const onPosition = (lng: number, lat: number) => {
    if (!map) return
    const cols = data?.cols.lng && data.cols.lat ? { lng: data.cols.lng, lat: data.cols.lat } : null
    const outcome = cols ? locateOutcome(lng, lat, cols, LOCATE_NEAREST_BUILDING_M) : { kind: 'nobuilding' as const }
    if (outcome.kind === 'outside') { say(NOTES.outside); return }
    if (!dot.current) {
      const el = document.createElement('div')
      el.className = 'locate-dot'
      dot.current = new maplibregl.Marker({ element: el })
    }
    dot.current.setLngLat([lng, lat]).addTo(map)
    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), LOCATE_ZOOM) })
    if (outcome.kind === 'building') setSelectedBuilding(outcome.row)
  }

  const locate = () => {
    if (!navigator.geolocation) { say(NOTES.unsupported); return }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (p) => { setBusy(false); onPosition(p.coords.longitude, p.coords.latitude) },
      (err) => { setBusy(false); say(err.code === err.PERMISSION_DENIED ? NOTES.denied : NOTES.failed) },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    )
  }

  return (
    <>
      {note && <div className="map-note" role="status">{note}</div>}
      <button
        type="button"
        className="round-button"
        aria-label="Show my location"
        aria-busy={busy}
        disabled={busy || !map}
        onClick={locate}
      >
        <IconCurrentLocation size={22} stroke={1.8} />
      </button>
    </>
  )
}

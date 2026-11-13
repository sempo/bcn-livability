import { lazy, Suspense, useEffect, useState } from 'react'
import { useMediaQuery } from '@mantine/hooks'
import { Drawer, ActionIcon, Notification, SegmentedControl } from '@mantine/core'
import { IconAdjustmentsHorizontal } from '@tabler/icons-react'
import { BrandBar } from './components/BrandBar/BrandBar'
import { FilterPanel } from './components/FilterPanel/FilterPanel'
import { OnboardingPanel } from './components/Onboarding/OnboardingPanel'
import { useStore } from './store'
import { SearchBox } from './components/SearchBox/SearchBox'
import { ComparePane } from './components/PropertyPins/ComparePane'
import { AddPinButton } from './components/PropertyPins/AddPinButton'
import { ScreenshotDropZone } from './components/PropertyPins/ScreenshotDropZone'
import { BuildingCard } from './components/BuildingCard/BuildingCard'
import { usePinsStore } from './store/pinsStore'
import { useUrlState } from './hooks/useUrlState'
import { useIsochrone } from './hooks/useIsochrone'
import { usePinAnalytics } from './hooks/usePinAnalytics'
import { features } from './features'
import { afterFirstPaint } from './services/firstPaint'
import './index.css'

// MapLibre is more than half of the JavaScript of the page. It is downloaded from the start (index.html preloads it)
// but runs after the first paint, so the panel shows up without waiting for it (TODO-058).
const LazyMap = lazy(() => import('./components/Map/Map').then((m) => ({ default: m.Map })))
const mapPlaceholder = <div style={{ width: '100%', height: '100%' }} />

/**
 * The map, started after the first paint. Its code and style are ready at once (both are preloaded), and setting
 * up the base map is a long task: started any earlier it would hold back the first paint.
 */
function Map() {
  const [painted, setPainted] = useState(false)
  useEffect(() => {
    let live = true
    void afterFirstPaint().then(() => { if (live) setPainted(true) })
    return () => { live = false }
  }, [])
  if (!painted) return mapPlaceholder
  return <Suspense fallback={mapPlaceholder}><LazyMap /></Suspense>
}

export function App() {
  useUrlState()
  usePinAnalytics()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobileView, setMobileView] = useState<'map' | 'compare'>('map')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const pinCount = usePinsStore((s) => s.pins.length)
  const onboardingOpen = useStore((s) => s.onboardingOpen)

  useIsochrone((err) => {
    setErrorMsg(err.message)
    setTimeout(() => setErrorMsg(null), 4000)
  })

  const showError = (msg: string) => {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(null), 4000)
  }

  const errorNotification = errorMsg && (
    <Notification
      color="red"
      title="Could not update isochrone"
      onClose={() => setErrorMsg(null)}
      style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000, maxWidth: 320 }}
    >
      {errorMsg}
    </Notification>
  )

  const mapPane = (
    <div className="map-pane">
      {features.screenshot ? (
        <ScreenshotDropZone onError={showError}>
          <Map />
        </ScreenshotDropZone>
      ) : (
        <Map />
      )}
      {!isMobile && (
        <div className={features.onboarding ? 'top-panel top-panel--wide' : 'top-panel'}>
          <BrandBar />
          <SearchBox />
          {onboardingOpen ? <OnboardingPanel /> : <FilterPanel />}
        </div>
      )}
      <BuildingCard />
    </div>
  )

  if (isMobile) {
    return (
      <div className="app">
        {mapPane}

        <div className="brand-mobile">
          <BrandBar />
          <SearchBox />
        </div>

        {features.pins && mobileView === 'compare' && pinCount > 0 && (
          <div className="mobile-compare">
            <ComparePane fullScreen />
          </div>
        )}

        {onboardingOpen && (
          <div className="onboarding-sheet">
            <OnboardingPanel />
          </div>
        )}

        {!onboardingOpen && (
          <ActionIcon
            className="filter-toggle"
            size="xl"
            radius="xl"
            variant="white"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open filters"
          >
            <IconAdjustmentsHorizontal size={22} />
          </ActionIcon>
        )}
        <Drawer
          opened={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          position="bottom"
          size="auto"
          title="Filters"
        >
          <FilterPanel />
        </Drawer>

        {features.pins && pinCount > 0 && (
          <SegmentedControl
            className="mobile-view-toggle"
            value={mobileView}
            onChange={(v) => setMobileView(v as 'map' | 'compare')}
            data={[
              { label: 'Map', value: 'map' },
              { label: `Compare (${pinCount})`, value: 'compare' },
            ]}
          />
        )}

        {features.pins && mobileView === 'map' && <AddPinButton onError={showError} />}

        {errorNotification}
      </div>
    )
  }

  return (
    <div className="app">
      {features.pins ? (
        <div className="app-split">
          <ComparePane />
          {mapPane}
        </div>
      ) : mapPane}
      {features.pins && <AddPinButton onError={showError} />}
      {errorNotification}
    </div>
  )
}

export default App

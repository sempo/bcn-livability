import { useContext, useEffect } from 'react'
import { MapContext } from '../Map/MapContext'
import { useStore } from '../../store'
import { addLayerOrdered } from '../Map/layerOrder'
import { ldenColorExpression } from '../../services/noise/noisePalette'

const SOURCE_ID = 'noise-pmtiles'
const LAYER_ID = 'noise-overlay'
const PMTILES_URL = `pmtiles://${import.meta.env.BASE_URL}data/noise.pmtiles`

const LDEN_COLOR_STEP = ldenColorExpression(['get', 'lden'])

export function NoiseLayer() {
  const map = useContext(MapContext)
  const { noiseLayerVisible } = useStore()

  useEffect(() => {
    if (!map) return

    function addLayer() {
      if (!map) return
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'vector',
          url: PMTILES_URL,
          attribution: 'Strategic Noise Map 2022 · Ajuntament de Barcelona · Open Data BCN',
        })
      }
      if (!map.getLayer(LAYER_ID)) {
        addLayerOrdered(map, {
          id: LAYER_ID,
          type: 'fill',
          source: SOURCE_ID,
          'source-layer': 'noise',
          filter: ['>', ['coalesce', ['get', 'lden'], 0], 0],
          layout: { visibility: 'none' },
          paint: {
            'fill-color': LDEN_COLOR_STEP,
            'fill-opacity': 0.6,
            'fill-outline-color': 'rgba(0,0,0,0.08)',
          },
        }, LAYER_ID)
      }
    }

    // map from MapContext is set only after 'load' — always safe to call directly
    addLayer()

    return () => {
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map])

  useEffect(() => {
    if (!map || !map.getLayer(LAYER_ID)) return
    map.setLayoutProperty(LAYER_ID, 'visibility', noiseLayerVisible ? 'visible' : 'none')
  }, [map, noiseLayerVisible])

  return null
}

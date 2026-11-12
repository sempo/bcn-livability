import { useEffect, useMemo, useRef, useState } from 'react'
import { ActionIcon, Combobox, Loader, TextInput, useCombobox } from '@mantine/core'
import { IconSearch, IconX } from '@tabler/icons-react'
import { loadAreas, type AreaFeature } from '../../services/areas'
import { searchAreas, areaIdsBounds } from '../../services/areaSearch'
import { searchAddresses, type AddressSuggestion } from '../../services/geocoding'
import { SEARCH_DEBOUNCE_MS, SEARCH_MAX_RESULTS, SEARCH_MIN_CHARS } from '../../services/searchConfig'
import { useSearchStore } from '../../store/searchStore'

/**
 * "Search a neighbourhood or address" (TODO-044): districts, barris, municipalities and colloquial names
 * from the areas dataset, plus Geoapify address suggestions. Writes the pick to the search store; the
 * map side is SearchLayer.
 */
export function SearchBox() {
  const [areas, setAreas] = useState<AreaFeature[]>([])
  const [text, setText] = useState('')
  const [addresses, setAddresses] = useState<AddressSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const selection = useSearchStore((s) => s.selection)
  const selectArea = useSearchStore((s) => s.selectArea)
  const selectAddress = useSearchStore((s) => s.selectAddress)
  const clear = useSearchStore((s) => s.clear)
  const combobox = useCombobox()

  useEffect(() => { loadAreas().then(setAreas) }, [])

  // Escape (handled in SearchLayer) empties the selection: empty the field with it.
  const hadSelection = useRef(false)
  useEffect(() => {
    if (hadSelection.current && !selection) setText('')
    hadSelection.current = selection !== null
  }, [selection])

  const query = text.trim()
  const areaMatches = useMemo(() => searchAreas(areas, query, SEARCH_MAX_RESULTS), [areas, query])

  useEffect(() => {
    if (query.length < SEARCH_MIN_CHARS) {
      setAddresses([])
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    const timer = setTimeout(() => {
      searchAddresses(query, controller.signal, SEARCH_MAX_RESULTS).then((r) => {
        if (controller.signal.aborted) return
        setAddresses(r)
        setLoading(false)
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query])

  const pick = (value: string) => {
    const [type, idx] = value.split(':')
    if (type === 'area') {
      const m = areaMatches[Number(idx)]
      const bounds = areaIdsBounds(areas, m.areaIds)
      if (!bounds) return
      const outline = {
        type: 'FeatureCollection' as const,
        features: areas.filter((a) => m.areaIds.includes(a.properties.id)),
      }
      selectArea(m.label, bounds, outline)
      setText(m.label)
    } else {
      const a = addresses[Number(idx)]
      selectAddress(a.label, a.coords)
      setText(a.label)
    }
    combobox.closeDropdown()
  }

  const reset = () => {
    setText('')
    setAddresses([])
    clear()
  }

  const showEmpty = query.length >= SEARCH_MIN_CHARS && !loading && areaMatches.length === 0 && addresses.length === 0

  return (
    <Combobox store={combobox} onOptionSubmit={pick} withinPortal={false}>
      <Combobox.Target>
        <TextInput
          className="glass-panel search-box"
          size="sm"
          radius="md"
          placeholder="Search a neighbourhood or address"
          aria-label="Search a neighbourhood or address"
          leftSection={loading ? <Loader size={14} /> : <IconSearch size={16} />}
          rightSection={
            text ? (
              <ActionIcon variant="subtle" color="gray" size="sm" aria-label="Clear search" onClick={reset}>
                <IconX size={14} />
              </ActionIcon>
            ) : null
          }
          value={text}
          onChange={(e) => { setText(e.currentTarget.value); combobox.openDropdown() }}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
        />
      </Combobox.Target>
      <Combobox.Dropdown hidden={query.length === 0}>
        <Combobox.Options>
          {areaMatches.length > 0 && (
            <Combobox.Group label="Areas">
              {areaMatches.map((m, i) => (
                <Combobox.Option key={m.areaIds.join('|')} value={`area:${i}`}>
                  <div>{m.label}</div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>{m.hint}</div>
                </Combobox.Option>
              ))}
            </Combobox.Group>
          )}
          {addresses.length > 0 && (
            <Combobox.Group label="Addresses">
              {addresses.map((a, i) => (
                <Combobox.Option key={`${a.label}${i}`} value={`addr:${i}`}>{a.label}</Combobox.Option>
              ))}
            </Combobox.Group>
          )}
          {showEmpty && <Combobox.Empty>Nothing found</Combobox.Empty>}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useStore, URL_DEFAULTS, settingsOf } from '../store'
import { encodeConfig, shareUrl } from '../services/urlConfig'
import { PHONE_QUERY } from '../services/phoneConfig'

const TOAST_MS = 3000

/**
 * Share button (TODO-053): the system share sheet on a phone, a copied link elsewhere. `message` is a short note
 * to show for a moment, or null.
 */
export function useShare() {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const say = (text: string) => {
    setMessage(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), TOAST_MS)
  }

  async function share() {
    // The settings as they are now, not as the address shows them (it follows after a short pause).
    const url = shareUrl(window.location.href, encodeConfig(settingsOf(useStore.getState()), URL_DEFAULTS))
    const phone = typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches
    if (phone && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Barcelona livability map', url })
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return // the person closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      say('Link copied. It opens your map with your conditions.')
    } catch {
      say('Could not copy. Copy the link from the address bar.')
    }
  }

  return { share, message }
}

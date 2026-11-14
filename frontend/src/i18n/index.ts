import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import {
  DEFAULT_LANGUAGE, ENABLED_LANGUAGES, LANG_STORAGE_KEY, resolveLanguage, type LangCode,
} from './languages'
import { NAMESPACES, type Namespace } from './namespaces'

// Translations live in src/locales/<language>/<namespace>.json (TODO-065, docs/TRANSLATING.md). English is the source
// and the fallback and is part of the bundle; every other language is fetched when it is chosen.
const bundled = import.meta.glob('../locales/en/*.json', { eager: true, import: 'default' }) as Record<string, object>
const lazy = import.meta.glob(['../locales/*/*.json', '!../locales/en/*.json'], { import: 'default' }) as
  Record<string, () => Promise<object>>

function pathOf(lang: LangCode, ns: Namespace) {
  return `../locales/${lang}/${ns}.json`
}

/** Fetches the files of a language that is not loaded yet. A missing file is not an error: English fills in. */
async function loadLanguage(lang: LangCode) {
  if (lang === DEFAULT_LANGUAGE) return
  await Promise.all(NAMESPACES.map(async (ns) => {
    if (i18n.hasResourceBundle(lang, ns)) return
    const load = lazy[pathOf(lang, ns)]
    if (load) i18n.addResourceBundle(lang, ns, await load(), true, true)
  }))
}

function applyToPage(lang: LangCode) {
  document.documentElement.lang = lang
}

/** The address carries the language only when it is not the default, so most links stay as short as before. */
function writeToAddress(lang: LangCode) {
  const url = new URL(window.location.href)
  if (lang === DEFAULT_LANGUAGE) url.searchParams.delete('lang')
  else url.searchParams.set('lang', lang)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

let ready: Promise<void> | undefined

/** Starts i18next in the language the visitor should get. Safe to call more than once. */
export function initI18n(): Promise<void> {
  ready ??= (async () => {
    const resources: Record<string, Record<string, object>> = { [DEFAULT_LANGUAGE]: {} }
    for (const [path, content] of Object.entries(bundled)) {
      const ns = path.split('/').pop()!.replace('.json', '')
      resources.en = { ...resources.en, [ns]: content }
    }
    let stored: string | null = null
    try { stored = localStorage.getItem(LANG_STORAGE_KEY) } catch { /* storage blocked */ }
    const lang = resolveLanguage({
      enabled: ENABLED_LANGUAGES, fallback: DEFAULT_LANGUAGE, search: window.location.search,
      stored, browser: navigator.languages ?? [],
    })
    await i18n.use(initReactI18next).init({
      lng: DEFAULT_LANGUAGE,
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: [...ENABLED_LANGUAGES],
      ns: [...NAMESPACES],
      defaultNS: 'common',
      resources,
      interpolation: { escapeValue: false }, // React escapes; the share pictures draw plain text
      returnNull: false,
    })
    await loadLanguage(lang)
    await i18n.changeLanguage(lang)
    applyToPage(lang)
  })()
  return ready
}

/** Switches the language: loads it, remembers it, and puts it in the address. */
export async function setLanguage(lang: LangCode): Promise<void> {
  if (!ENABLED_LANGUAGES.includes(lang)) return
  await initI18n()
  await loadLanguage(lang)
  await i18n.changeLanguage(lang)
  applyToPage(lang)
  try { localStorage.setItem(LANG_STORAGE_KEY, lang) } catch { /* storage blocked */ }
  writeToAddress(lang)
}

/** One text in a given language without switching the page (pages and pictures that are built ahead of time). */
export async function tIn(lang: LangCode, key: string, options?: Record<string, unknown>): Promise<string> {
  await initI18n()
  await loadLanguage(lang)
  return String(i18n.getFixedT(lang)(key as never, options as never))
}

export default i18n

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Polyfill Blob.prototype.text — jsdom does not implement this Blob API method.
if (typeof Blob !== 'undefined' && !Blob.prototype.text) {
  Blob.prototype.text = function (): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(this as Blob)
    })
  }
}

afterEach(() => {
  cleanup()
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

global.ResizeObserver = vi.fn().mockImplementation(function () {
  return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }
})

// Newer Node versions expose an experimental global `localStorage` that, without --localstorage-file,
// is unusable and shadows jsdom's. Swap in an in-memory Storage so the tests behave the same everywhere.
if (typeof localStorage === 'undefined' || typeof localStorage.clear !== 'function') {
  const data = new Map<string, string>()
  const memoryStorage: Storage = {
    get length() { return data.size },
    clear: () => data.clear(),
    getItem: (k) => (data.has(k) ? data.get(k)! : null),
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => { data.delete(k) },
    setItem: (k, v) => { data.set(k, String(v)) },
  }
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true })
  Object.defineProperty(window, 'localStorage', { value: memoryStorage, configurable: true })
}

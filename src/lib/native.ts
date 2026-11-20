import { Capacitor, registerPlugin } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { loadIndex } from './content'
import { localEpochDay } from './day'
import { pickForDay, installSeedFallback } from './dailyPicker'
import type { Palette, Theme } from './types'

export type WidgetSize = 'small' | 'medium' | 'large'

export interface NativeSettings {
  notifyEnabled: boolean
  /** "HH:mm", 24h */
  notifyTime: string
  notifyEvening: boolean
  /** "HH:mm", 24h — used when notifyEvening is true */
  notifyEveningTime: string
  theme: Theme
  palette: Palette
  /** Present on native; true in debug builds. */
  debug?: boolean
}

interface WidgetBridgePlugin {
  getToday(): Promise<{ id: number; slug: string; epochDay: number }>
  getSettings(): Promise<NativeSettings>
  setSettings(options: NativeSettings): Promise<void>
  requestNotificationPermission(): Promise<{ granted: boolean }>
  scheduleDaily(): Promise<void>
  cancelDaily(): Promise<void>
  refreshWidgets(): Promise<void>
  openBatterySettings(): Promise<void>
  getLaunchUrl(): Promise<{ url: string | null }>
  openWidgetConfig(options: { size: WidgetSize }): Promise<{ opened: boolean }>
  fireTestNotification(): Promise<void>
}

const bridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge')

export const isNative = Capacitor.isNativePlatform()

const DEFAULT_SETTINGS: NativeSettings = {
  notifyEnabled: false,
  notifyTime: '08:00',
  notifyEvening: false,
  notifyEveningTime: '21:00',
  theme: 'auto',
  palette: 'mint',
}

const KEYS = {
  settings: 'settings',
  seed: 'installSeed',
  onboarded: 'onboarded',
  favorites: 'favorites',
  scroll: 'libraryScroll',
}

async function readSeed(): Promise<number> {
  const { value } = await Preferences.get({ key: KEYS.seed })
  if (value) {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  const random = new Uint32Array(1)
  crypto.getRandomValues(random)
  const seed = (random[0] | 0) || installSeedFallback
  await Preferences.set({ key: KEYS.seed, value: String(seed) })
  return seed
}

export const settings = {
  async get(): Promise<NativeSettings> {
    if (isNative) {
      try {
        const stored = await bridge.getSettings()
        // Older native builds did not send notifyEveningTime; keep the default
        // instead of handing an undefined time to the sheet.
        return { ...DEFAULT_SETTINGS, ...stored }
      } catch {
        return DEFAULT_SETTINGS
      }
    }
    const { value } = await Preferences.get({ key: KEYS.settings })
    if (!value) return DEFAULT_SETTINGS
    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(value) as Partial<NativeSettings>) }
    } catch {
      return DEFAULT_SETTINGS
    }
  },

  async set(next: NativeSettings): Promise<void> {
    if (isNative) {
      await bridge.setSettings(next)
      await bridge.refreshWidgets()
      if (next.notifyEnabled) await bridge.scheduleDaily()
      else await bridge.cancelDaily()
      return
    }
    await Preferences.set({ key: KEYS.settings, value: JSON.stringify(next) })
  },
}

export const today = {
  async pick(slugPool?: string[]): Promise<{ id: number; slug: string }> {
    if (slugPool?.length) {
      const index = await loadIndex()
      const ids = index.filter((entry) => slugPool.includes(entry.slug)).map((entry) => entry.id)
      const seed = await readSeed()
      const id = pickForDay(ids, seed, localEpochDay())
      const entry = index.find((candidate) => candidate.id === id)
      if (entry) return { id: entry.id, slug: entry.slug }
    }

    if (isNative) {
      try {
        const result = await bridge.getToday()
        return { id: result.id, slug: result.slug }
      } catch {
        // fall through to the local mirror
      }
    }

    const index = await loadIndex()
    const seed = await readSeed()
    const id = pickForDay(
      index.map((entry) => entry.id),
      seed,
      localEpochDay(),
    )
    const entry = index.find((candidate) => candidate.id === id) ?? index[0]
    return { id: entry.id, slug: entry.slug }
  },
}

export const notifications = {
  async requestPermission(): Promise<boolean> {
    if (isNative) {
      try {
        const result = await bridge.requestNotificationPermission()
        return result.granted
      } catch {
        return false
      }
    }
    if (typeof Notification === 'undefined') return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    return (await Notification.requestPermission()) === 'granted'
  },

  async openBatterySettings(): Promise<void> {
    if (isNative) await bridge.openBatterySettings().catch(() => undefined)
  },

  async fireTest(): Promise<void> {
    if (isNative) {
      await bridge.fireTestNotification().catch(() => undefined)
      return
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const index = await loadIndex()
      const { pick } = today
      const picked = await pick()
      const entry = index.find((candidate) => candidate.slug === picked.slug)
      if (entry) new Notification(entry.notification.title, { body: entry.notification.body })
    }
  },
}

export const widget = {
  async refresh(): Promise<void> {
    if (isNative) await bridge.refreshWidgets().catch(() => undefined)
  },
  /** Opens the add-widget screen for one size; the native side pins from there. */
  async openConfig(size: WidgetSize): Promise<boolean> {
    if (!isNative) return false
    try {
      return (await bridge.openWidgetConfig({ size })).opened
    } catch {
      return false
    }
  },
}

export async function launchSlug(): Promise<string | null> {
  const fromUrl = (url: string | null | undefined): string | null => {
    if (!url) return null
    const match = url.match(/(?:justincase:\/\/howto\/|#\/howto\/)([a-z0-9-]+)/i)
    return match ? match[1] : null
  }

  if (isNative) {
    try {
      const { url } = await bridge.getLaunchUrl()
      const slug = fromUrl(url)
      if (slug) return slug
    } catch {
      // ignore, fall back to hash
    }
  }
  return fromUrl(window.location.hash)
}

/**
 * Native deep links (justincase://howto/<slug>) arrive as `appUrlOpen` events.
 * Hash changes are the router's job — listening to them here as well would
 * turn every in-app navigation into a new "deep link" and loop forever.
 */
export async function listenForLinks(handler: (slug: string) => void): Promise<() => void> {
  if (!isNative) return () => undefined

  const { App } = await import('@capacitor/app')
  const listener = await App.addListener('appUrlOpen', (event) => {
    const match = event.url.match(/justincase:\/\/howto\/([a-z0-9-]+)/i)
    if (match) handler(match[1])
  })
  return () => {
    void listener.remove()
  }
}

export const local = {
  async getOnboarded(): Promise<boolean> {
    return (await Preferences.get({ key: KEYS.onboarded })).value === 'true'
  },
  async setOnboarded(): Promise<void> {
    await Preferences.set({ key: KEYS.onboarded, value: 'true' })
  },
  async getFavorites(): Promise<number[]> {
    const { value } = await Preferences.get({ key: KEYS.favorites })
    if (!value) return []
    try {
      return JSON.parse(value) as number[]
    } catch {
      return []
    }
  },
  async setFavorites(ids: number[]): Promise<void> {
    await Preferences.set({ key: KEYS.favorites, value: JSON.stringify(ids) })
  },
  async getScroll(): Promise<number> {
    return Number((await Preferences.get({ key: KEYS.scroll })).value ?? 0) || 0
  },
  async setScroll(value: number): Promise<void> {
    await Preferences.set({ key: KEYS.scroll, value: String(Math.round(value)) })
  },
}

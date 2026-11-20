import type { HowTo, IndexEntry } from './types'

const BASE = 'content'

let indexPromise: Promise<IndexEntry[]> | null = null
const entries = new Map<string, Promise<HowTo>>()

export function loadIndex(): Promise<IndexEntry[]> {
  if (!indexPromise) {
    indexPromise = fetch(`${BASE}/index.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`content index: ${response.status}`)
        return response.json() as Promise<IndexEntry[]>
      })
      .catch((error) => {
        indexPromise = null
        throw error
      })
  }
  return indexPromise
}

export function loadEntry(slug: string): Promise<HowTo> {
  let entry = entries.get(slug)
  if (!entry) {
    entry = fetch(`${BASE}/howtos/${slug}.json`).then((response) => {
      if (!response.ok) throw new Error(`content entry ${slug}: ${response.status}`)
      return response.json() as Promise<HowTo>
    })
    entries.set(slug, entry)
    entry.catch(() => entries.delete(slug))
  }
  return entry
}

export function preloadEntry(slug: string): void {
  void loadEntry(slug).catch(() => undefined)
}

export function imageUrl(file: string, widgetVariant = false): string {
  const path = widgetVariant ? file.replace(/\.png$/, '_w.png') : file
  return `${BASE}/${path}`
}

export function chapterIds(index: IndexEntry[]): string[] {
  return Array.from(new Set(index.map((entry) => entry.chapter)))
}

/** Word-boundary truncation so widget and notification text never ends mid-word. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const boundary = cut.lastIndexOf(' ')
  const base = boundary > max * 0.6 ? cut.slice(0, boundary) : cut
  return `${base.replace(/[,;:.\s]+$/, '')}…`
}

export function todayLabel(date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

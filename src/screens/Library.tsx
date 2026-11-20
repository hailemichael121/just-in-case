import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronRight, Grid, List, Search, X } from 'lucide-react'
import { Art } from '../ui/Art'
import { loadEntry } from '../lib/content'
import { local } from '../lib/native'
import { navigate } from '../lib/router'
import { tap } from '../lib/haptics'
import type { IndexEntry } from '../lib/types'

type ViewMode = 'list' | 'grid'

interface LibraryProps {
  index: IndexEntry[] | null
  favorites: number[]
  onOpen: (slug: string) => void
}

export function Library({ index, favorites, onOpen }: LibraryProps) {
  const [query, setQuery] = useState('')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [fullText, setFullText] = useState<Record<number, string>>({})
  const restored = useRef(false)

  // Search runs over title + full text; the entries are bundled, so this is a
  // single local pass and stays instant.
  useEffect(() => {
    if (!index) return
    let alive = true
    void Promise.all(
      index.map((entry) =>
        loadEntry(entry.slug)
          .then((full) => [entry.id, full.full_text] as const)
          .catch(() => [entry.id, ''] as const),
      ),
    ).then((pairs) => {
      if (alive) setFullText(Object.fromEntries(pairs))
    })
    return () => {
      alive = false
    }
  }, [index])

  useEffect(() => {
    if (!index || restored.current) return
    restored.current = true
    void local.getScroll().then((value) => {
      if (value > 0) window.scrollTo({ top: value })
    })
  }, [index])

  useEffect(() => {
    let frame = 0
    const save = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => void local.setScroll(window.scrollY))
    }
    window.addEventListener('scroll', save, { passive: true })
    return () => {
      window.removeEventListener('scroll', save)
      cancelAnimationFrame(frame)
      void local.setScroll(window.scrollY)
    }
  }, [])

  const needle = query.trim().toLowerCase()

  const groups = useMemo(() => {
    if (!index) return []
    const visible = index.filter((entry) => {
      if (onlyFavorites && !favorites.includes(entry.id)) return false
      if (!needle) return true
      const haystack = `${entry.title}\n${fullText[entry.id] ?? ''}`.toLowerCase()
      return haystack.includes(needle)
    })
    const order: string[] = []
    const buckets = new Map<string, IndexEntry[]>()
    for (const entry of visible) {
      if (!buckets.has(entry.chapter)) {
        buckets.set(entry.chapter, [])
        order.push(entry.chapter)
      }
      buckets.get(entry.chapter)!.push(entry)
    }
    return order.map((chapter) => ({ chapter, entries: buckets.get(chapter)! }))
  }, [index, favorites, fullText, needle, onlyFavorites])

  const empty = index !== null && groups.length === 0

  const goHome = () => {
    tap()
    navigate({ name: 'today' })
  }

  return (
    <section className="screen screen--head">
      <div className="screen__head">
        <button className="icon-btn" onClick={goHome} aria-label="Back">
          <ArrowLeft size={19} />
        </button>
        <h1 className="eyebrow" style={{ fontSize: 11 }}>
          <img className="brand-mark" src="/img/app-icon.png" alt="" width={24} height={24} />
          Library
        </h1>
        <span className="small muted">{index ? `${index.length} how-tos` : ''}</span>
      </div>

      <div className="search glass">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the handbook"
          aria-label="Search the handbook"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button className="search__clear" onClick={() => setQuery('')} aria-label="Clear search">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="library__toolbar">
        <div className="chips">
          <button
            className={`chip ${!onlyFavorites ? 'chip--on' : ''}`}
            onClick={() => setOnlyFavorites(false)}
            aria-pressed={!onlyFavorites}
          >
            All
          </button>
          <button
            className={`chip ${onlyFavorites ? 'chip--on' : ''}`}
            onClick={() => setOnlyFavorites((value) => !value)}
            aria-pressed={onlyFavorites}
          >
            Favorites{favorites.length ? ` · ${favorites.length}` : ''}
          </button>
        </div>
        <div className="view-toggle" role="group" aria-label="View mode">
          <button
            className={`view-toggle__btn ${viewMode === 'list' ? 'view-toggle__btn--on' : ''}`}
            onClick={() => setViewMode('list')}
            aria-pressed={viewMode === 'list'}
            aria-label="List view"
          >
            <List size={18} />
          </button>
          <button
            className={`view-toggle__btn ${viewMode === 'grid' ? 'view-toggle__btn--on' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-pressed={viewMode === 'grid'}
            aria-label="Grid view"
          >
            <Grid size={18} />
          </button>
        </div>
      </div>

      {index === null && (
        <div className="rows" style={{ marginTop: 24 }} aria-hidden="true">
          {Array.from({ length: 6 }).map((_, indexKey) => (
            <div key={indexKey} className="skeleton" style={{ height: 62 }} />
          ))}
        </div>
      )}

      {empty && (
        <p className="empty">
          {onlyFavorites && !needle ? 'No favorites yet — tap the heart while reading.' : 'Nothing for that.'}
        </p>
      )}

      {viewMode === 'list' ? (
        <div className="library-list">
          {groups.map((group) => (
            <div className="library-chapter" key={group.chapter}>
              <h2 className="library-chapter__label">{group.chapter}</h2>
              <div className="library-chapter__items">
                {group.entries.map((entry) => (
                  <button className="library-item" key={entry.id} onClick={() => onOpen(entry.slug)}>
                    <Art file={entry.thumbnail} ratio={1} className="library-item__thumb" />
                    <span className="library-item__title">{entry.title}</span>
                    <ChevronRight className="library-item__chevron" size={16} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="library-grid">
          {groups.map((group) => (
            <div className="library-chapter" key={group.chapter}>
              <h2 className="library-chapter__label">{group.chapter}</h2>
              <div className="library-chapter__grid">
                {group.entries.map((entry) => (
                  <button className="library-card" key={entry.id} onClick={() => onOpen(entry.slug)}>
                    <Art file={entry.thumbnail} ratio={4/3} className="library-card__image" priority />
                    <div className="library-card__content">
                      <span className="library-card__title">{entry.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
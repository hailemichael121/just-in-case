import { useRef, useState, useEffect, type PointerEvent as ReactPointerEvent } from 'react'
import { local } from '../lib/native'
import { Menu } from 'lucide-react'
import type { IndexEntry } from '../lib/types'
import { Art } from '../ui/Art'
import { navigate } from '../lib/router'
import { tap, heavy } from '../lib/haptics'

interface TodayProps {
  entry: IndexEntry | null
  onOpen: (slug: string) => void
  onAnother: () => void
  /** Pool of entries for "another" pick — used to render next card behind. */
  pool?: IndexEntry[]
  currentIndex?: number
  /** False while onboarding / notification sheet is up — swipe hint waits until this is true. */
  swipeHintReady?: boolean
  /** True when the Today tab is the active route — hint replays if user leaves without swiping. */
  homeActive?: boolean
}

/** Pixels of horizontal travel before a swipe counts. */
const SWIPE_THRESHOLD = 52
/** Max rotation in degrees at max drag. */
const MAX_ROTATION = 18
/** Max translate in px at max drag. */
const MAX_TRANSLATE = 120

function stopCardGesture(event: ReactPointerEvent | React.MouseEvent) {
  event.stopPropagation()
}

export function Today({
  entry,
  onOpen,
  onAnother,
  pool = [],
  currentIndex = 0,
  swipeHintReady = true,
  homeActive = true,
}: TodayProps) {
  const drag = useRef<{ x: number; y: number; id: number; hapticGiven: boolean } | null>(null)
  const [dx, setDx] = useState(0)
  const [exitDirection, setExitDirection] = useState<-1 | 0 | 1>(0)
  const [hint, setHint] = useState<{ x: number; rot: number; icon: number } | null>(null)
  const hintCancel = useRef<(() => void) | null>(null)
  const hintCompleted = useRef(false)
  const flingInFlight = useRef(false)

  const markHintSeen = () => {
    hintCompleted.current = true
    void local.setHomeSwipeHintSeen()
  }

  const flingCardAway = (direction: -1 | 1, markSwipeHint = false) => {
    if (flingInFlight.current || exitDirection !== 0 || !entry) return
    flingInFlight.current = true
    heavy()
    if (markSwipeHint) markHintSeen()
    setExitDirection(direction)
    window.setTimeout(() => {
      flingInFlight.current = false
      setExitDirection(0)
      setDx(0)
      onAnother()
    }, 220)
  }

  /**
   * Swipe the card sideways for another how-to. The listeners live on window
   * for the duration of the drag, so the gesture still completes when the
   * finger leaves the card — and buttons keep their normal clicks.
   */
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if ((event.target as HTMLElement).closest('button')) return
    if (exitDirection !== 0) return
    if (hintCancel.current) {
      hintCancel.current()
      hintCancel.current = null
    }
    drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId, hapticGiven: false }
    setDx(0)

    const move = (moveEvent: PointerEvent) => {
      const origin = drag.current
      if (!origin || moveEvent.pointerId !== origin.id) return
      const deltaX = moveEvent.clientX - origin.x
      const deltaY = moveEvent.clientY - origin.y
      // A vertical drag belongs to the page, not the card.
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 12) {
        drag.current = null
        setDx(0)
        return
      }
      const clamped = Math.max(-MAX_TRANSLATE, Math.min(MAX_TRANSLATE, deltaX))
      setDx(clamped)

      // Haptic feedback once the card is clearly bent
      if (!origin.hapticGiven && Math.abs(clamped) > MAX_TRANSLATE * 0.5) {
        drag.current = { ...origin, hapticGiven: true }
        heavy()
      }
    }

    const finish = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      const origin = drag.current
      drag.current = null
      if (!origin || upEvent.type === 'pointercancel') {
        setDx(0)
        return
      }
      const travel = upEvent.clientX - origin.x
      if (Math.abs(travel) < SWIPE_THRESHOLD) {
        setDx(0)
        return
      }
      flingCardAway(travel < 0 ? -1 : 1, true)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }

  useEffect(() => {
    if (!entry || !swipeHintReady || !homeActive) return
    let cancelled = false

    const stopHint = (markSeen: boolean) => {
      cancelled = true
      setHint(null)
      hintCancel.current = null
      if (markSeen) markHintSeen()
    }

    void (async () => {
      if (hintCompleted.current) return
      const seen = await local.getHomeSwipeHintSeen()
      if (seen || cancelled) {
        hintCompleted.current = true
        return
      }
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) {
        markHintSeen()
        return
      }

      const run = async () => {
        for (let i = 0; i < 2; i++) {
          if (cancelled || hintCompleted.current) return
          setHint({ x: 18, rot: 10, icon: 1 })
          await new Promise((r) => setTimeout(r, 400))
          if (cancelled || hintCompleted.current) return
          setHint({ x: 0, rot: 0, icon: 1 })
          await new Promise((r) => setTimeout(r, 400))
          if (cancelled || hintCompleted.current) return
          setHint({ x: -18, rot: -10, icon: 1 })
          await new Promise((r) => setTimeout(r, 400))
          if (cancelled || hintCompleted.current) return
          setHint({ x: 0, rot: 0, icon: 1 })
          await new Promise((r) => setTimeout(r, 400))
        }
        setHint({ x: 0, rot: 0, icon: 0 })
        await new Promise((r) => setTimeout(r, 300))
        if (!cancelled && !hintCompleted.current) {
          setHint(null)
          markHintSeen()
        }
      }

      hintCancel.current = () => stopHint(false)
      void run()
    })()

    return () => {
      if (hintCancel.current) {
        hintCancel.current()
        hintCancel.current = null
      } else {
        cancelled = true
        setHint(null)
      }
    }
  }, [entry, swipeHintReady, homeActive])

  const next = entry && pool.length ? pool[(currentIndex + 1) % pool.length] ?? null : null
  const dragging = dx !== 0
  const progress = dragging
    ? Math.min(Math.abs(dx) / MAX_TRANSLATE, 1)
    : exitDirection !== 0
      ? 1
      : 0
  const rotation = dragging ? (dx / MAX_TRANSLATE) * MAX_ROTATION : 0

  const openEntry = (slug: string) => {
    tap()
    onOpen(slug)
  }

  return (
    <section className="screen screen--today screen--head" aria-busy={!entry}>
      <div className="screen__head">
        <span className="eyebrow">
          <img className="brand-mark" src="/img/app-icon.png" alt="" width={24} height={24} />
          {entry ? entry.chapter : 'Today'}
        </span>
        <button
          className="icon-btn"
          onClick={() => {
            tap()
            navigate({ name: 'library' })
          }}
          aria-label="Library"
        >
          <Menu size={20} />
        </button>
      </div>

      {entry ? (
        <div className="today-stack">
          {next && (dragging || exitDirection !== 0) && (
            <article
              key={`next-${next.slug}`}
              className="today-card glass today-card--behind"
              style={{
                transform: `translateX(${exitDirection * 10}px) scale(${0.94 + progress * 0.05})`,
                opacity: 0.2 + progress * 0.45,
              }}
              aria-hidden="true"
            >
              <h1 className="today-title">{next.title}</h1>
              <p className="today-desc">{next.short_description}</p>
              <div className="today-art">
                <Art file={next.thumbnail} ratio={2.3} />
              </div>
              <div className="today-actions" style={{ visibility: 'hidden' }}>
                <button className="btn btn--primary">Read</button>
                <button className="btn btn--ghost">Another one</button>
              </div>
            </article>
          )}

          {hint && hint.icon > 0 && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '-2.5rem',
                left: '50%',
                transform: 'translateX(-50%)',
                opacity: hint.icon,
                transition: 'opacity 260ms ease-out',
                pointerEvents: 'none',
                zIndex: 2,
                color: 'var(--accent, #3b82f6)',
              }}
            >
              <svg width="40" height="24" viewBox="0 0 40 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                <path d="M6 14 C12 4, 24 4, 30 12" />
                <path d="M26 8 L30 12 L26 16" />
              </svg>
            </div>
          )}

          <article
            key={entry.slug}
            className={`today-card glass${dragging ? ' today-card--dragging' : ''}`}
            onPointerDown={onPointerDown}
            onDoubleClick={(e) => {
              if ((e.target as HTMLElement).closest('button')) return
              openEntry(entry.slug)
            }}
            style={
              exitDirection !== 0
                ? {
                    transform: `translateX(${exitDirection * (window.innerWidth + 140)}px) rotate(${exitDirection * 26}deg)`,
                    opacity: 0,
                    transition: 'transform 220ms cubic-bezier(0.4, 0, 1, 1), opacity 220ms ease-out',
                    zIndex: 1,
                  }
                : dragging
                  ? {
                      transform: `translateX(${dx}px) rotate(${rotation}deg)`,
                      opacity: 1 - progress * 0.25,
                      transition: 'none',
                      zIndex: 1,
                    }
                  : hint
                    ? {
                        transform: `translateX(${hint.x}px) rotate(${hint.rot}deg)`,
                        transition: 'transform 260ms ease-out',
                        zIndex: 1,
                      }
                    : undefined
            }
          >
            <h1 className="today-title">{entry.title}</h1>
            <p className="today-desc">{entry.short_description}</p>

            <div className="today-art">
              <Art file={entry.thumbnail} ratio={2.3} priority />
            </div>

            <div className="today-actions">
              <button
                type="button"
                className="btn btn--primary"
                onPointerDown={stopCardGesture}
                onClick={(e) => {
                  stopCardGesture(e)
                  openEntry(entry.slug)
                }}
              >
                Read
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={exitDirection !== 0}
                onPointerDown={stopCardGesture}
                onClick={(e) => {
                  stopCardGesture(e)
                  flingCardAway(1)
                }}
              >
                Another one
              </button>
            </div>
          </article>
        </div>
      ) : (
        <div className="today-card glass" aria-hidden="true">
          <div className="skeleton" style={{ height: 18, width: '40%' }} />
          <div className="skeleton" style={{ height: 34, width: '92%', marginTop: 16 }} />
          <div className="skeleton" style={{ height: 34, width: '64%', marginTop: 8 }} />
          <div className="skeleton" style={{ height: 150, marginTop: 24 }} />
          <div className="skeleton" style={{ height: 52, marginTop: 24, borderRadius: 999 }} />
        </div>
      )}

    </section>
  )
}
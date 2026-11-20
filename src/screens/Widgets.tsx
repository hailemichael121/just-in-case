import { useState } from 'react'
import { ArrowLeft, Check, LayoutGrid } from 'lucide-react'
import { Art } from '../ui/Art'
import { isNative, widget } from '../lib/native'
import { tap } from '../lib/haptics'
import { truncate } from '../lib/content'
import type { IndexEntry } from '../lib/types'

interface WidgetsProps {
  index: IndexEntry[] | null
  onBack: () => void
  onOpen: (slug: string) => void
}

type Size = 'small' | 'medium' | 'large'

const SIZES: { value: Size; label: string; dims: string; note: string }[] = [
  { value: 'small', label: 'Small', dims: '2 × 2', note: 'Title and the drawing. The quietest one.' },
  { value: 'medium', label: 'Medium', dims: '4 × 2', note: 'Title, the first line, and the drawing.' },
  { value: 'large', label: 'Large', dims: '4 × 4', note: 'The whole picture, with room to breathe.' },
]

const GUIDE: { image?: string; mock?: 'picker'; alt: string; title: string; body: string }[] = [
  {
    image: '1-home.webp',
    alt: 'An empty Android home screen',
    title: 'Long-press an empty spot',
    body: 'Hold anywhere on the home screen until a menu rises. On some phones it is a two-finger pinch.',
  },
  {
    image: '2-menu.webp',
    alt: 'The home screen menu with Widgets',
    title: 'Open Widgets',
    body: 'Choose Widgets in that menu. The launcher opens its list of widgets you can place.',
  },
  {
    mock: 'picker',
    alt: 'The widget picker showing Daily Drop',
    title: 'Find Daily Drop',
    body: 'Scroll to Daily Drop, then drag a preview to the size you want — small, medium or large.',
  },
  {
    image: '3-pin.webp',
    alt: 'The add-to-home-screen confirmation',
    title: 'Confirm and drop it',
    body: 'Tap Add to home screen, or drag the preview. Tap the widget any time to open today’s how-to.',
  },
  {
    image: '4-settings.webp',
    alt: 'The widget settings screen',
    title: 'Make it yours',
    body: 'Long-press the widget for Widget settings: content, glass, text size and topic.',
  },
]

export function Widgets({ index, onBack, onOpen }: WidgetsProps) {
  const [hint, setHint] = useState<string | null>(null)
  const [adding, setAdding] = useState<Size | null>(null)

  const entry =
    index?.find((candidate) => candidate.image_count > 0 && candidate.title.length < 40) ??
    index?.find((candidate) => candidate.image_count > 0) ??
    index?.[0] ??
    null

  const addWidget = async (size: Size) => {
    tap()
    setAdding(size)
    try {
      const opened = await widget.openConfig(size)
      setHint(
        opened
          ? 'Pick the glass, text size and topic, then tap Add to home screen.'
          : 'Long-press an empty spot on your home screen, then choose Widgets.',
      )
    } finally {
      setAdding(null)
    }
  }

  return (
    <section className="screen screen--widgets">
      <div className="detail__bar">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={19} />
        </button>
        <span className="eyebrow">
          <LayoutGrid size={13} aria-hidden="true" />
          Home screen
        </span>
      </div>

      <h1 className="widgets__title">One how-to, always within reach.</h1>
      <p className="widgets__lede">
        Three sizes, one glass. The widget picks a fresh how-to every day, so the home screen is
        never the same twice.
      </p>

      {hint && <p className="widgets__hint">{hint}</p>}
      {!isNative && (
        <p className="widgets__hint">Widgets ship with the Android app. Everything else is live here.</p>
      )}

      <div className="widget-list">
        {SIZES.map((size) => (
          <div className="widget-item" key={size.value}>
            <div className={`widget-stage widget-stage--${size.value}`}>
              {entry ? <WidgetMock size={size.value} entry={entry} /> : <div className="skeleton" style={{ width: '100%', height: 140 }} />}
            </div>
            <div className="widget-item__head">
              <h2 className="widget-item__label">{size.label}</h2>
              <span className="widget-item__dims">{size.dims}</span>
            </div>
            <p className="widget-item__note">{size.note}</p>
            {isNative && (
              <button
                className="btn btn--primary widget-item__add"
                onClick={() => addWidget(size.value)}
                disabled={adding === size.value}
              >
                {adding === size.value ? 'Opening…' : `Add ${size.label.toLowerCase()}`}
              </button>
            )}
          </div>
        ))}
      </div>

      <h2 className="guide__title">How to add it</h2>
      <ol className="guide">
        {GUIDE.map((step, index) => (
          <li className="guide__step" key={step.title}>
            <figure className={`guide__figure ${step.mock ? 'guide__figure--mock' : ''}`}>
              {step.mock === 'picker' ? (
                <PickerMock />
              ) : (
                <img src={`/img/guide/${step.image}`} alt={step.alt} loading="lazy" decoding="async" />
              )}
            </figure>
            <div className="guide__copy">
              <span className="guide__num" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="guide__heading">{step.title}</h3>
              <p className="guide__body">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="widget-tip">
        <Check size={16} aria-hidden="true" />
        <p>
          <strong>Three separate widgets.</strong> Small, medium and large are different widget
          types, so you can place each where it suits — and remove one without touching the others.
        </p>
      </div>

      {entry && (
        <button className="row widget-cta" onClick={() => onOpen(entry.slug)}>
          <span className="row__title">
            <span className="eyebrow">Today’s how-to</span>
            <span style={{ display: 'block', marginTop: 6 }}>{entry.title}</span>
          </span>
          <Check size={16} className="row__chevron" aria-hidden="true" />
        </button>
      )}
    </section>
  )
}

function PickerMock() {
  return (
    <div className="picker-mock" aria-hidden="true">
      <div className="picker-mock__search">Search</div>
      <div className="picker-mock__row">
        <span className="picker-mock__icon">W</span>
        <span className="picker-mock__text">
          <b>Daily Drop</b>
          <small>1 widget</small>
        </span>
      </div>
      <div className="picker-mock__sizes">
        <span className="picker-mock__size">Small · 2 × 2</span>
        <span className="picker-mock__size">Medium · 4 × 2</span>
        <span className="picker-mock__size">Large · 4 × 4</span>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <span className="widget-mock__brand">
      <img src="/img/app-icon.png" alt="" width={14} height={14} />
      Today
    </span>
  )
}

function WidgetMock({ size, entry }: { size: Size; entry: IndexEntry }) {
  const title = entry.title
  const body = truncate(entry.short_description, size === 'large' ? 120 : 64)

  return (
    <div
      className={`widget-mock glass widget-mock--${size}`}
      role="img"
      aria-label={`${size} widget preview: ${title}`}
    >
      <Brand />
      {size === 'medium' ? (
        <span className="widget-mock__row">
          <span className="widget-mock__text">
            <span className="widget-mock__title">{title}</span>
            <span className="widget-mock__body">{body}</span>
          </span>
          <Art file={entry.thumbnail} ratio={1} className="widget-mock__art" priority />
        </span>
      ) : (
        <>
          <span className="widget-mock__title">{title}</span>
          {size === 'large' ? <span className="widget-mock__body">{body}</span> : null}
          <Art file={entry.thumbnail} ratio={size === 'large' ? 2.1 : 1} className="widget-mock__art" priority />
        </>
      )}
    </div>
  )
}
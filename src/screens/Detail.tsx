import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Heart } from 'lucide-react'
import { loadEntry } from '../lib/content'
import type { Block, HowTo, IndexEntry } from '../lib/types'
import { Art } from '../ui/Art'

interface DetailProps {
  slug: string
  index: IndexEntry[] | null
  isFavorite: boolean
  onToggleFavorite: () => void
  onOpen: (slug: string) => void
  onBack: () => void
}

type StepBlock = Extract<Block, { type: 'step' }>

export function Detail({ slug, index, isFavorite, onToggleFavorite, onOpen, onBack }: DetailProps) {
  const [entry, setEntry] = useState<HowTo | null>(null)
  const [error, setError] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let alive = true
    setEntry(null)
    setError(false)
    void loadEntry(slug)
      .then((full) => alive && setEntry(full))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [slug])

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / max)))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [entry])

  const steps = entry ? entry.content.filter(isStep) : []
  const keys = steps.slice(0, 3)
  const related = entry ? pickRelated(entry, index) : []
  const minutes = entry ? readMinutes(entry) : 0
  const startsWithImage = entry?.content[0]?.type === 'image'

  return (
    <>
      <div className="read-progress" aria-hidden="true">
        <div className="read-progress__bar" style={{ transform: `scaleX(${progress})` }} />
      </div>

      <section className="screen screen--detail detail">
        <div className="detail__bar">
          <button className="icon-btn" onClick={onBack} aria-label="Back">
            <ArrowLeft size={19} />
          </button>
          <button
            className={`icon-btn ${isFavorite ? 'icon-btn--active' : ''}`}
            onClick={onToggleFavorite}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={isFavorite}
            disabled={!entry}
          >
            <Heart size={19} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        {error && <p className="empty">Could not open this one.</p>}

        {!entry && !error && (
          <div aria-hidden="true" style={{ marginTop: 26 }}>
            <div className="skeleton" style={{ height: 14, width: '30%' }} />
            <div className="skeleton" style={{ height: 38, width: '94%', marginTop: 18 }} />
            <div className="skeleton" style={{ height: 38, width: '70%', marginTop: 10 }} />
            <div className="skeleton" style={{ height: 140, marginTop: 28 }} />
          </div>
        )}

        {entry && (
          <>
            <header className="detail__hero">
              <span className="eyebrow detail__chapter">
                <span className="chapter-dot" aria-hidden="true" />
                {entry.chapter}
              </span>
              <h1 className="detail__title">{entry.title}</h1>
              <p className="detail__lede">{entry.short_description}</p>
              <p className="detail__meta">
                <span>{entry.step_count} steps</span>
                <span aria-hidden="true">·</span>
                <span>
                  {entry.image_count} {entry.image_count === 1 ? 'drawing' : 'drawings'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{minutes} min read</span>
              </p>
            </header>

            {!startsWithImage && (
              <figure className="detail__cover">
                <Art file={entry.thumbnail} ratio={2.4} alt={`Illustration for ${entry.title}`} priority />
              </figure>
            )}

            {keys.length > 0 && (
              <section className="detail__keys" aria-labelledby="keys-title">
                <h2 className="detail__subhead" id="keys-title">
                  In short
                </h2>
                <div className="keygrid">
                  {keys.map((step, position) => (
                    <div className="keycard" key={`${step.number}-${position}`}>
                      <span className="keycard__num" aria-hidden="true">
                        {String(position + 1).padStart(2, '0')}
                      </span>
                      <span className="keycard__text">{step.headline}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="detail__body">{renderBlocks(entry.content)}</div>

            {related.length > 0 && (
              <section className="related" aria-labelledby="related-title">
                <h2 className="detail__subhead" id="related-title">
                  Keep reading
                </h2>
                <div className="related__grid">
                  {related.map((item) => (
                    <button className="related-card" key={item.slug} onClick={() => onOpen(item.slug)}>
                      <Art file={item.thumbnail} ratio={2} className="related-card__art" alt="" />
                      <span className="eyebrow related-card__chapter">{item.chapter}</span>
                      <span className="related-card__title">{item.title}</span>
                      <ArrowRight size={15} className="related-card__arrow" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            <p className="detail__source">
              From <em>The Worst-Case Scenario Survival Handbook</em>.
            </p>
          </>
        )}
      </section>
    </>
  )
}

function isStep(block: Block): block is StepBlock {
  return block.type === 'step'
}

function readMinutes(entry: HowTo): number {
  const words = entry.full_text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(2, Math.round(words / 180))
}

function pickRelated(entry: HowTo, index: IndexEntry[] | null): IndexEntry[] {
  if (!index?.length) return []
  const sameChapter = index.filter((item) => item.slug !== entry.slug && item.chapter === entry.chapter)
  const rest = index.filter((item) => item.slug !== entry.slug && item.chapter !== entry.chapter)
  return [...sameChapter, ...rest].slice(0, 2)
}

function renderBlocks(blocks: Block[]): ReactNode[] {
  const nodes: ReactNode[] = []
  let bullets: string[] = []

  const flushBullets = () => {
    if (!bullets.length) return
    nodes.push(
      <ul key={`ul-${nodes.length}`}>
        {bullets.map((text, index) => (
          <li key={index}>{text}</li>
        ))}
      </ul>,
    )
    bullets = []
  }

  blocks.forEach((block, index) => {
    // Skip the first paragraph block (intro like "Always keep your sword...") to avoid duplication
    if (index === 0 && block.type === 'paragraph') return
    if (block.type === 'bullet') {
      if (block.text.trim()) bullets.push(block.text)
      return
    }
    flushBullets()

    switch (block.type) {
      case 'step': {
        const { headline, rest } = splitStep(block.headline, block.text)
        nodes.push(
          <div className="step" key={index}>
            <span className="step__number" aria-hidden="true">
              {String(block.number).padStart(2, '0')}
            </span>
            <h2 className="step__headline">{headline}</h2>
            {rest && <p className="step__text">{rest}</p>}
          </div>,
        )
        break
      }
      case 'heading':
        nodes.push(
          <h2 className="subhead" key={index}>
            {block.text}
          </h2>,
        )
        break
      case 'paragraph':
        nodes.push(
          <p className="prose" key={index}>
            {block.text}
          </p>,
        )
        break
      case 'caption':
        nodes.push(
          <p className="caption" key={index}>
            {block.text}
          </p>,
        )
        break
      case 'image':
        nodes.push(
          <figure key={index}>
            <Art
              file={block.file}
              width={block.width_px}
              height={block.height_px}
              className="art--band"
              alt={block.caption ?? undefined}
            />
            {block.caption && block.caption.trim() && <figcaption>{block.caption}</figcaption>}
          </figure>,
        )
        break
    }
  })

  flushBullets()
  return nodes
}

/**
 * The extractor often repeats the headline as the first sentence of the step
 * text. Show the headline once and keep only the real explanation underneath.
 */
function splitStep(headlineText: string, text: string): { headline: string; rest: string } {
  const headline = headlineText.trim()
  const body = text.trim()
  if (!body) return { headline, rest: '' }
  const norm = (value: string) => value.replace(/[\s\u2014\u2013-]+/g, ' ').toLowerCase().trim()
  const normalizedBody = norm(body)
  const normalizedHeadline = norm(headline)
  if (normalizedBody === normalizedHeadline) return { headline, rest: '' }
  if (normalizedBody.startsWith(normalizedHeadline)) {
    return { headline, rest: body.slice(headline.length).replace(/^[\s.:;,\u2014\u2013-]+/, '') }
  }
  return { headline, rest: body }
}

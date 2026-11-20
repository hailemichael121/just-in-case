import { useEffect, useState } from 'react'
import { loadEntry } from '../lib/content'
import { Art } from '../ui/Art'
import type { HowTo, IndexEntry } from '../lib/types'

/** Debug-only: every entry at a glance, to eyeball content quirks. */
export function Qa({ index }: { index: IndexEntry[] | null }) {
  if (!import.meta.env.DEV) return <p className="empty">Debug builds only.</p>

  return (
    <section className="screen screen--head">
      <div className="screen__head">
        <h1 className="eyebrow">Content QA</h1>
        <span className="small muted">{index?.length ?? 0}</span>
      </div>
      <div className="qa-grid" style={{ marginTop: 20 }}>
        {index?.map((entry) => <QaCard key={entry.id} entry={entry} />)}
      </div>
    </section>
  )
}

function QaCard({ entry }: { entry: IndexEntry }) {
  const [full, setFull] = useState<HowTo | null>(null)

  useEffect(() => {
    let alive = true
    void loadEntry(entry.slug).then((loaded) => alive && setFull(loaded))
    return () => {
      alive = false
    }
  }, [entry.slug])

  const steps = full?.content.filter((block) => block.type === 'step') ?? []
  const prose = full && steps.length === 0

  return (
    <article className="qa-card glass">
      <h3>{entry.title}</h3>
      <p className="small muted">
        {entry.chapter} · {steps.length} steps · {entry.image_count} images
        {prose ? ' · prose only' : ''}
      </p>
      {full && (
        <>
          <p className="small muted" style={{ lineHeight: 1.5 }}>
            {entry.short_description}
          </p>
          <div style={{ marginTop: 12 }}>
            <Art file={entry.thumbnail} ratio={2.4} />
          </div>
          <ul className="small muted" style={{ lineHeight: 1.5, paddingLeft: 18 }}>
            {(steps.length ? steps : full.content.filter((b) => b.type === 'paragraph'))
              .slice(0, 3)
              .map((block, indexKey) => (
                <li key={indexKey}>
                  {'headline' in block ? block.headline : 'text' in block ? block.text : ''}
                </li>
              ))}
          </ul>
        </>
      )}
    </article>
  )
}

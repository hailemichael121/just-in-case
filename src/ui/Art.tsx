import { imageUrl } from '../lib/content'

interface ArtProps {
  file: string
  caption?: string | null
  alt?: string
  width?: number
  height?: number
  /** Fixed box for widget-style previews; otherwise uses the artwork ratio. */
  ratio?: number
  className?: string
  priority?: boolean
}

/**
 * The illustrations are black line art on white. The build produces a
 * luminance→alpha variant (`*_w.png`): transparent paper, off-white lines that
 * float on dark glass. Light theme inverts it back to dark ink. Never a white
 * rectangle, and no blend modes fighting the glass.
 */
export function Art({ file, caption, alt, width, height, ratio, className, priority }: ArtProps) {
  const source = imageUrl(file, true)
  const aspect = ratio ?? (width && height ? width / height : 2.4)

  return (
    <figure
      className={['art', className].filter(Boolean).join(' ')}
      style={{ margin: 0, aspectRatio: String(aspect) }}
    >
      <img
        src={source}
        alt={alt ?? (caption ? caption : 'Illustration')}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        style={{ aspectRatio: String(aspect) }}
      />
    </figure>
  )
}

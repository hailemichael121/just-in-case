export type Chapter =
  | 'Great Escapes and Entrances'
  | 'Defense'
  | 'The Untamed Outdoors'
  | 'Emergency Medicine'
  | 'Travel and Adventure'
  | (string & {})

export interface IndexEntry {
  id: number
  slug: string
  title: string
  chapter: Chapter
  short_description: string
  notification: { title: string; body: string }
  step_count: number
  image_count: number
  thumbnail: string
  pdf_pages: number[]
}

export type Block =
  | { type: 'step'; number: number; headline: string; text: string; page?: number }
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'caption'; text: string }
  | {
      type: 'image'
      file: string
      caption: string | null
      width_px: number
      height_px: number
    }

export interface HowTo extends IndexEntry {
  content: Block[]
  full_text: string
}

export type Theme = 'auto' | 'dark' | 'light' | 'charcoal' | 'dracula'

/** One accent story across the app, the sheet, and the home-screen widget. */
export type Palette = 'mint' | 'liquid' | 'charcoal' | 'dracula'

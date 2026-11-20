import type { Palette, Theme } from './types'

export type ResolvedTheme = 'dark' | 'light' | 'charcoal' | 'dracula'

const media = window.matchMedia('(prefers-color-scheme: light)')

const THEME_COLORS: Record<ResolvedTheme, string> = {
  dark: '#141416',
  light: '#F7F6F3',
  charcoal: '#08090A',
  dracula: '#282A36',
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'auto') return media.matches ? 'light' : 'dark'
  return theme
}

export function applyTheme(theme: Theme, palette: Palette = 'mint'): () => void {
  const root = document.documentElement
  const paint = () => {
    const resolved = resolveTheme(theme)
    root.dataset.theme = resolved
    root.dataset.palette = palette
    root.style.colorScheme = resolved === 'light' ? 'light' : 'dark'
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[resolved])
  }

  paint()
  if (theme !== 'auto') return () => undefined

  const onChange = () => paint()
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

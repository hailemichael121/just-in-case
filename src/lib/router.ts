import { useCallback, useEffect, useState } from 'react'

export type Route =
  | { name: 'today' }
  | { name: 'library' }
  | { name: 'detail'; slug: string }
  | { name: 'qa' }
  | { name: 'widgets' }

function read(): Route {
  const hash = window.location.hash
  const detail = hash.match(/^#\/howto\/([a-z0-9-]+)/i)
  if (detail) return { name: 'detail', slug: detail[1] }
  if (hash.startsWith('#/library')) return { name: 'library' }
  if (hash.startsWith('#/widgets')) return { name: 'widgets' }
  if (hash.startsWith('#/qa')) return { name: 'qa' }
  return { name: 'today' }
}

function write(route: Route): string {
  switch (route.name) {
    case 'detail':
      return `#/howto/${route.slug}`
    case 'library':
      return '#/library'
    case 'widgets':
      return '#/widgets'
    case 'qa':
      return '#/qa'
    default:
      return '#/today'
  }
}

export function navigate(route: Route): void {
  const next = write(route)
  const commit = () => {
    if (window.location.hash !== next) window.location.hash = next
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }
  const doc = document as Document & {
    startViewTransition?: (callback: () => void) => unknown
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduced && typeof doc.startViewTransition === 'function') doc.startViewTransition(commit)
  else commit()
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(read)

  useEffect(() => {
    const onChange = () => setRoute(read())
    window.addEventListener('hashchange', onChange)
    window.addEventListener('popstate', onChange)
    return () => {
      window.removeEventListener('hashchange', onChange)
      window.removeEventListener('popstate', onChange)
    }
  }, [])

  return route
}

/** Re-render after a deep link arrives without a hash change. */
export function useRouteSync(): (route: Route) => void {
  return useCallback((route: Route) => {
    if (window.location.hash !== write(route)) window.location.hash = write(route)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }, [])
}

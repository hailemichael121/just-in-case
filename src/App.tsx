import { useCallback, useEffect, useRef, useState } from 'react'
import { BookOpen, LayoutGrid, Settings2 } from 'lucide-react'
import { SplashScreen } from '@capacitor/splash-screen'
import { App as CapApp } from '@capacitor/app'
import { Detail } from './screens/Detail'
import { Library } from './screens/Library'
import { Today } from './screens/Today'
import { Qa } from './screens/Qa'
import { OnboardingSheet } from './sheets/OnboardingSheet'
import { SettingsSheet } from './sheets/SettingsSheet'
import { WidgetsSheet } from './sheets/WidgetsSheet'
import { loadIndex, preloadEntry } from './lib/content'
import { applyTheme } from './lib/theme'
import { tap } from './lib/haptics'
import { navigate, useRoute } from './lib/router'
import {
  isNative,
  launchSlug,
  listenForLinks,
  local,
  settings as settingsApi,
  today as todayApi,
  widget,
  type NativeSettings,
} from './lib/native'
import type { IndexEntry } from './lib/types'

const DEFAULT_SETTINGS: NativeSettings = {
  notifyEnabled: false,
  notifyTime: '08:00',
  notifyEvening: false,
  notifyEveningTime: '21:00',
  theme: 'light',
  palette: 'charcoal',
}

export default function App() {
  const route = useRoute()
  const [index, setIndex] = useState<IndexEntry[] | null>(null)
  const [todayEntry, setTodayEntry] = useState<IndexEntry | null>(null)
  const [favorites, setFavorites] = useState<number[]>([])
  const [prefs, setPrefs] = useState<NativeSettings>(DEFAULT_SETTINGS)
  const [onboarding, setOnboarding] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [widgetsOpen, setWidgetsOpen] = useState(false)
  const [fatal, setFatal] = useState(false)
  const [ready, setReady] = useState(false)
  const mountedAt = useRef(performance.now())

  // boot: content, today's pick, local state
  useEffect(() => {
    let alive = true
    ;(async () => {
      const [loadedIndex, picked, savedFavorites, savedPrefs, onboarded] = await Promise.all([
        loadIndex(),
        todayApi.pick(),
        local.getFavorites(),
        settingsApi.get(),
        local.getOnboarded(),
      ])
      if (!alive) return
      setIndex(loadedIndex)
      setFavorites(savedFavorites)
      setPrefs(savedPrefs)
      setTodayEntry(
        loadedIndex.find((entry) => entry.slug === picked.slug) ?? loadedIndex[0] ?? null,
      )
      preloadEntry(picked.slug)
      if (!onboarded) setOnboarding(true)
      void widget.refresh()
      if (alive) setReady(true)
    })().catch(() => {
      if (alive) {
        setFatal(true)
        setReady(true)
      }
    })
    return () => {
      alive = false
    }
  }, [])

  // theme
  useEffect(() => applyTheme(prefs.theme, prefs.palette), [prefs.theme, prefs.palette])

  // Deep link #/widgets opens the sheet over Today, not a separate screen.
  useEffect(() => {
    if (route.name !== 'widgets') return
    setWidgetsOpen(true)
    navigate({ name: 'today' })
  }, [route.name])

  // Android hardware back closes sheets instead of leaving the app
  useEffect(() => {
    if (!isNative || (!settingsOpen && !widgetsOpen)) return
    let dispose: (() => void) | undefined
    void CapApp.addListener('backButton', () => {
      if (settingsOpen) setSettingsOpen(false)
      else if (widgetsOpen) setWidgetsOpen(false)
    }).then((h) => {
      dispose = () => void h.remove()
    })
    return () => dispose?.()
  }, [settingsOpen, widgetsOpen])

  // deep links, cold and warm
  useEffect(() => {
    let dispose: (() => void) | undefined
    void launchSlug().then((slug) => {
      if (slug) navigate({ name: 'detail', slug })
    })
    void listenForLinks((slug) => navigate({ name: 'detail', slug })).then((cleanup) => {
      dispose = cleanup
    })
    return () => dispose?.()
  }, [])

  // splash handoff: the one native splash stays until the first screen is ready
  useEffect(() => {
    if (!ready) return
    const elapsed = performance.now() - mountedAt.current
    const timer = window.setTimeout(() => {
      if (isNative) void SplashScreen.hide({ fadeOutDuration: 180 }).catch(() => undefined)
    }, Math.max(0, 420 - elapsed))
    return () => window.clearTimeout(timer)
  }, [ready])

  // safety net: never leave the splash up if boot stalls
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (isNative) void SplashScreen.hide({ fadeOutDuration: 180 }).catch(() => undefined)
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (route.name !== 'library') window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [route])

  const changePrefs = useCallback((next: NativeSettings) => {
    setPrefs(next)
    void settingsApi.set(next).catch(() => undefined)
  }, [])

  const finishOnboarding = useCallback(() => {
    setOnboarding(false)
    void local.setOnboarded()
  }, [])

  const toggleFavorite = useCallback(
    (id: number) => {
      tap()
      setFavorites((current) => {
        const next = current.includes(id)
          ? current.filter((value) => value !== id)
          : [...current, id]
        void local.setFavorites(next)
        return next
      })
    },
    [],
  )

  const anotherOne = useCallback(() => {
    if (!index?.length) return
    const pool = index.filter((entry) => entry.id !== todayEntry?.id)
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? index[0]
    setTodayEntry(pick)
    preloadEntry(pick.slug)
    tap()
  }, [index, todayEntry])

  const detailEntry = route.name === 'detail' ? index?.find((entry) => entry.slug === route.slug) : undefined

  return (
    <>
      <div className="backdrop" aria-hidden="true">
        <div className="backdrop__blob backdrop__blob--1" />
        <div className="backdrop__blob backdrop__blob--2" />
        <div className="backdrop__blob backdrop__blob--3" />
      </div>

      <div className="shell">
        {fatal && (
          <section className="screen">
            <p className="empty">Content could not be loaded. Reinstall or resync the app.</p>
          </section>
        )}

        {!fatal && route.name === 'detail' && (
          <Detail
            slug={route.slug}
            index={index}
            isFavorite={Boolean(detailEntry && favorites.includes(detailEntry.id))}
            onToggleFavorite={() => detailEntry && toggleFavorite(detailEntry.id)}
            onOpen={(slug) => navigate({ name: 'detail', slug })}
            onBack={() => (window.history.length > 1 ? window.history.back() : navigate({ name: 'today' }))}
          />
        )}

        {!fatal && route.name === 'library' && (
          <Library index={index} favorites={favorites} onOpen={(slug) => navigate({ name: 'detail', slug })} />
        )}

        {!fatal && route.name === 'qa' && <Qa index={index} />}

        {!fatal && route.name === 'today' && (
          <Today
            entry={todayEntry}
            onOpen={(slug) => navigate({ name: 'detail', slug })}
            onAnother={anotherOne}
            pool={index ?? []}
            currentIndex={todayEntry ? index?.findIndex((e) => e.id === todayEntry.id) ?? 0 : 0}
            swipeHintReady={!onboarding}
            homeActive={route.name === 'today'}
          />
        )}

        <nav className="nav glass" aria-label="Main">
          <button
            className={`nav__item ${route.name === 'today' && !widgetsOpen ? 'nav__item--on' : ''}`}
            onClick={() => {
              tap()
              navigate({ name: 'today' })
            }}
            aria-label="Today"
            aria-current={route.name === 'today' ? 'page' : undefined}
          >
            <BookOpen size={21} />
          </button>
          <button
            className={`nav__item ${widgetsOpen ? 'nav__item--on' : ''}`}
            onClick={() => {
              tap()
              setWidgetsOpen(true)
            }}
            aria-label="Widgets"
            aria-current={route.name === 'widgets' ? 'page' : undefined}
          >
            <LayoutGrid size={20} />
          </button>
          <button
            className="nav__item"
            onClick={() => {
              tap()
              setSettingsOpen(true)
            }}
            aria-label="Settings"
            aria-haspopup="dialog"
          >
            <Settings2 size={20} />
          </button>
        </nav>
      </div>

      <SettingsSheet
        open={settingsOpen}
        settings={prefs}
        debug={Boolean(prefs.debug)}
        onChange={changePrefs}
        onClose={() => setSettingsOpen(false)}
        onOpenWidgets={() => {
          setSettingsOpen(false)
          setWidgetsOpen(true)
        }}
      />

      <WidgetsSheet
        open={widgetsOpen}
        index={index}
        onClose={() => setWidgetsOpen(false)}
        onOpen={(slug) => {
          setWidgetsOpen(false)
          navigate({ name: 'detail', slug })
        }}
      />

      <OnboardingSheet
        open={onboarding}
        onDone={finishOnboarding}
        onEnableNotifications={() => changePrefs({ ...prefs, notifyEnabled: true })}
      />
    </>
  )
}

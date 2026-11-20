# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] — 2026-11-20

The widget release: three sizes you can place individually, a brand mark on
every card, a quieter library, and a download page with a checksum.

### Added

- **Three widget types** — Small (2×2), Medium (4×2) and Large (4×4) are
  separate providers (`SmallWidgetProvider`, `MediumWidgetProvider`,
  `LargeWidgetProvider`) sharing one `BaseWidgetProvider`, so the launcher lists
  them individually and each keeps its own layout and preview.
- **Add-from-the-app widget flow** — `WidgetConfigActivity` doubles as an
  "add widget" screen when it has no widget id: size chips, a live preview, then
  `Add to home screen` through `requestPinAppWidget`. Choices are parked as a
  pending config for that size (`WidgetPinnedReceiver`, 10-minute expiry).
- **Brand line on every widget** — the app mark and "Today" at the top-left of
  the small, medium and large card, replacing the old coloured dot.
- **Widgets screen** (`#/widgets`) — the three sizes drawn with today's entry,
  an add button for each, and a five-step illustrated guide.
- **Downloads page** — direct APK with size, SHA-256 and a `SHA256SUMS`
  manifest, plus links to the GitHub repository and releases.

### Changed

- **Widget settings** — three glass styles (Clear / Frosted / Smoked), three
  content modes (Text / Image + text / Image), three text sizes and a topic
  filter. The extra size and the Liquid/Paper glass are gone.
- **Library** — chapter headings are rules in a single ledger, not cards: 44px
  thumbnails, hairline dividers, no boxes.
- **Site** — product images sit at phone scale, the widget and library scenes
  were re-rendered to match the app, and the copy was cut back.

## [1.0.0] — 2026-11-17

The first complete release: the daily how-to app with its home-screen widget,
daily notification and reader.

### Added

- **Web app** (Vite + React 19 + TypeScript, plain CSS): Today card, Library
  with chapters and favorites, step-by-step Detail reader with artwork and read
  progress, onboarding sheet, settings sheet, QA route (`#/qa`) that renders a
  whole picker cycle.
- **Daily pick** — one shared spec, two implementations:
  `src/lib/dailyPicker.ts` and `core/DailyPicker.kt` (mulberry32 shuffle per
  cycle, no repeats until the pool is exhausted, no cross-cycle bridge). Both
  verified against `test/golden/daily-picker.csv` (60 days, seed `0x5eed1234`)
  by `npm test` and `DailyPickerTest`.
- **Home-screen widget** (`HowToWidgetProvider`): 3 size layouts
  (small / medium / large) chosen from the widget's actual cell size; 3 glass
  presets (clear / frosted / smoked); 3 text sizes; 3 content modes
  (text / image + text / image); per-widget topic filter; tinted `≤480px`
  line-art images (`*_w.png`); opens the day's entry via a
  `worstcase://howto/<slug>` deep link.
- **Widget configuration** (`WidgetConfigActivity`): content / glass / text
  size / topic chips with a live preview of today's entry; saves per-widget-id
  config and re-renders immediately.
- **Daily notification** (`DailyScheduler`, `DailyReceiver`, `BootReceiver`,
  `Notifier`): one how-to at the chosen local time, exact alarm when
  `SCHEDULE_EXACT_ALARM` is granted with an inexact device-waking fallback,
  re-armed after reboot, timezone and clock changes; notification channel,
  big-text style with step headlines, illustration as large icon, deep link
  into the detail screen; permission flow with a settings fallback.
- **WidgetBridge plugin** — the single JS↔native contract: `getToday`,
  `getSettings` / `setSettings`, `requestNotificationPermission`,
  `scheduleDaily` / `cancelDaily`, `refreshWidgets`, `requestPinWidget`
  (Android 12+ pin dialog), `openBatterySettings`, `getLaunchUrl`,
  `openWidgetConfig`, `fireTestNotification`.
- **Deep links** — `worstcase://howto/<slug>` from widget and notification,
  cold and warm, via an intent-filter on `MainActivity` and the Capacitor App
  plugin's `appUrlOpen` event.
- **Theming** — auto / dark / light, resolved on native and shared with the
  widget's frosted/smoked glass; light theme is a real paper-and-ink theme.
- **Icons & splash** — generated adaptive + legacy launcher icons
  (`scripts/make-icons.mjs`), animated droplet splash vector, seamless
  native-splash → web handoff.
- **Onboarding** — first-run sheet (notifications, add widget, skip) with the
  choice persisted.
- **Content pipeline** — `scripts/sync-content.mjs` (40 entries, 75
  illustrations into web + Android assets), `scripts/make-widget-images.mjs`
  (widget image variants), `scripts/generate-golden.ts` (golden CSV for both
  pickers), all driven by `npm run sync`.
- **Tests** — TypeScript picker golden test (`vitest`), Kotlin JVM picker test
  and logic tests (`DailyPickerTest`), on-device instrumented smoke test
  (`CoreSmokeTest`: bundled assets, notification channel, scheduler math).
- **Docs** — `README.md`, `DISCOVERY.md` (desktop scan + decisions),
  `docs/ios-plan.md`.

### Technical notes

- Capacitor 8.6, Android `minSdk 24` / `compileSdk` / `targetSdk` 36, JDK 21,
  Kotlin 2.2.
- The WebView is only the reader; the widget and notification run natively
  from bundled assets and SharedPreferences before the app is ever opened.
- Widget layouts avoid plain `<View>` children (not in the RemoteViews host
  whitelist — the launcher refuses to inflate them); the glass "dot" is an
  `ImageView` with a vector src.
- Kotlin stdlib jdk7/jdk8 artifacts are excluded from androidTest classpaths
  (they duplicate classes with stdlib ≥ 1.8).
- Fixed during bring-up: the warm deep-link listener no longer mirrors
  `hashchange` (that feedback looped against the router's own navigation);
  the Kotlin mulberry32 needed the `61 | t` term to match the TypeScript
  reference exactly.
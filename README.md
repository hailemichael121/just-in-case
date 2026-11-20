# Just in Case — one survival how-to a day

One survival how-to a day, as a charcoal home-screen widget, a daily
notification, and a quiet reader. Built with Vite + React + TypeScript, packaged
for Android with Capacitor 8, native layer in Kotlin.

![Today](docs/logo.png)

**Download:** [Just-in-Case-1.1.0.apk](portfolio/downloads/Just-in-Case-1.1.0.apk)
· [site](https://justincase-widget.netlify.app/) ·
[releases](https://github.com/hailemichael121/just-in-case/releases) ·
Android 8.0+, side-loaded, offline.

## What it does

- **Today** — the day's how-to on a glass card, with artwork, chapter label and
  date. One primary action (Read) and an escape hatch (Another one).
- **Library** — all 40 entries with search-friendly chapter grouping, favorites,
  and scroll restoration.
- **Reader** — an editorial detail page: chapter overline, lede, key steps,
  serif reading text, a "Good to know" callout, related reads, the original
  illustrations, read progress and favorites.
- **Home-screen widget** — three separate widget types, each with its own
  provider: Small (2×2), Medium (4×2) and Large (4×4). The app mark and "Today"
  sit at the top left of every card. 3 glass presets (clear / frosted /
  smoked), 3 text sizes, 3 content modes (text / image+text / image), per-widget
  topic filter, reconfigurable, tinted line-art images.
- **Widgets** — an in-app gallery of all three sizes; each card opens the
  add-widget flow for that size (pick the glass, text size and topic, then pin
  it straight to the home screen), with a short illustrated guide for the
  long-press route.
- **Daily notification** — one how-to at a time you choose, exact alarm when the
  permission is granted (inexact but device-waking fallback), re-armed after
  reboot and timezone changes.
- **Deep links** — `justincase://howto/<slug>` from widget and notification into
  the right detail screen.
- **Onboarding** — first-run sheet offering notifications and the widget.
- **Settings** — daily notification toggle + time, theme (auto/dark/light),
  battery-optimization hint, test notification.

## The one rule: the pick is shared

The same entry is shown on the Today screen, the widget and the notification,
and it never repeats until every entry in the pool has been shown. The daily
pick is implemented twice, from the same spec:

- `src/lib/dailyPicker.ts` — TypeScript reference (browser, QA route).
- `android/app/src/main/java/com/justincase/app/core/DailyPicker.kt` — Kotlin,
  used by the widget, the notification and the native `getToday` bridge call.

Both must reproduce `test/golden/daily-picker.csv` exactly:

- `npm test` → `test/dailyPicker.test.ts` (TypeScript, 60 golden days).
- `npm run android:test` → `DailyPickerTest` (Kotlin, same CSV, copied to
  `android/app/src/test/resources/` by `scripts/generate-golden.ts`).

The install seed is generated once on first launch and persisted; both layers
read it from the same place (Kotlin: `Prefs.installSeed`, TS: `Preferences`
key `installSeed`, kept in sync by the bridge).

## Content pipeline

`content-src/howtos_out/` is the generated how-to content (40 entries, 75
illustrations, `index.json` + per-entry JSON). `scripts/sync-content.mjs`
copies it into:

- `public/content/` — the web app (`npm run dev`, `vite preview`).
- `android/app/src/main/assets/content/` — the WebView app **and** the native
  widget / notification, which read the same assets before the WebView ever
  runs.

`scripts/make-widget-images.mjs` derives `*_w.png` variants: ≤480px,
luminance→alpha, tinted `#f4f1ea`, so line art floats on dark glass instead of
being a white rectangle. The same variants feed the widget, notification large
icon and the in-app artwork (light theme inverts them back to dark ink).

Regenerate everything with:

```bash
npm run sync           # content + widget image variants
node scripts/generate-golden.ts   # golden CSV (TS + Kotlin resources)
```

## Build & run

```bash
npm install
npm run dev            # web app at :5173 (browser, mock native)
npm run build          # typecheck + production web build
npm test               # TypeScript picker golden test

npm run mobile:build   # sync content + build + cap sync
npm run android:assemble   # debug APK
npm run android:test       # Kotlin JVM tests (golden picker + logic)
npm run android:install    # build + install on a connected device/emulator
```

Requirements: Node 22+, JDK 21, Android SDK 36 (`~/Android/Sdk` here).

On-device instrumented smoke test (assets bundled, channel, scheduler):

```bash
cd android && ./gradlew assembleDebugAndroidTest
adb install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb shell am instrument -w com.justincase.app.test/androidx.test.runner.AndroidJUnitRunner
```

## Architecture

```
src/                    web layer (React 19, plain CSS, no Tailwind)
  screens/              Today, Library, Detail, Qa
  sheets/               Settings, Onboarding
  ui/                   Art (glass-aware images), Sheet
  lib/
    dailyPicker.ts      TS reference implementation of the daily pick
    native.ts           the single Capacitor bridge surface (WidgetBridge)
    content.ts          index/entry loading, image variants, truncation
    router.ts           hash router (#/today, #/library, #/howto/:slug)
    theme.ts            auto/dark/light application
    day.ts              timezone-safe epoch-day helpers
  styles/               tokens, glass, app, motion (all CSS custom properties)
scripts/
  sync-content.mjs      copy howtos into web + android assets
  make-widget-images.mjs  *_w.png widget variants
  generate-golden.ts    golden CSV for both pickers
  make-icons.mjs        launcher icons (adaptive + legacy)
android/app/src/main/java/com/justincase/app/
  MainActivity.kt       BridgeActivity + WidgetBridge registration
  bridge/WidgetBridgePlugin.kt  the whole JS↔native contract
  core/Prefs.kt         SharedPreferences (seed, notify settings, per-widget config)
  core/DailyPicker.kt   Kotlin daily pick (mulberry32, cycle shuffle)
  core/HowToRepository.kt  asset-backed index/entries (no WebView needed)
  core/Notifier.kt      channel + daily notification (big text, deep link)
  notify/DailyScheduler.kt  exact/inexact alarm + boot/time receivers
  widget/HowToWidgetProvider.kt  base provider + Small/Medium/Large, pending config
  widget/WidgetConfigActivity.kt  add + reconfigure UI with live preview
  widget/WidgetPinnedReceiver.kt  pin result → per-widget config
  widget/WidgetRendering.kt  layout/glass/text-size helpers
android/app/src/test/   JVM unit tests (Kotlin)
android/app/src/androidTest/  on-device smoke test
```

The WebView is only the reader UI. The picker, the notification and the widget
all run natively from the bundled assets and SharedPreferences, so the home
screen widget is correct even before the app has ever been opened.

## Native surface (WidgetBridge)

| Method | Purpose |
| --- | --- |
| `getToday()` | `{id, slug, epochDay}` from the native picker |
| `getSettings()` / `setSettings()` | notify toggle/time, theme, debug flag |
| `requestNotificationPermission()` | POST_NOTIFICATIONS flow with settings fallback |
| `scheduleDaily()` / `cancelDaily()` | arm/disarm the daily alarm |
| `refreshWidgets()` | re-render every hosted widget |
| `openBatterySettings()` | battery-optimization screen for alarm reliability |
| `getLaunchUrl()` | cold-start deep link |
| `openWidgetConfig({ size })` | add-widget flow for one size (pin handled natively) |
| `fireTestNotification()` | settings-screen test notification |

## Design notes

- Dark-first glassmorphism: `#0B0D14` base, mint `#7CE3C4` accent, translucent
  cards with `backdrop-filter: blur(26px) saturate(170%)` and 1px sheen. One
  accent — mint — so nothing fights the green mark.
- Light theme is a real theme (warm paper `#F4F1EA`, ink `#1C1C1E`, green ink
  accent), not an inverted dark theme; the tinted widget images invert cleanly.
- Typography is Manrope Variable (bundled via `@fontsource`), self-hosted.
- Motion is short and GPU-cheap (view transitions where available,
  `prefers-reduced-motion` respected).
- The widget glass is plain layer-list drawables (gradient + stroke + top
  sheen) so it themes like the app without `RenderEffect` (API 31+).

## iOS

See [`docs/ios-plan.md`](docs/ios-plan.md). The web layer is shared as-is; the
plan covers WidgetKit, `UserNotifications`, the App Group handoff and the
notification-service parity requirements.
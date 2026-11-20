# iOS plan

The web layer (`src/`) is platform-agnostic and ships unchanged inside a
Capacitor iOS shell. This document lists what has to be built natively on iOS
to reach feature parity with the Android app, and where each Android piece maps.

## Stack

- Xcode 16+, iOS 16+ deployment target (SwiftUI widgets need 16+ for App Intents
  timeline reloads; iOS 17+ adds interactive widgets — treat 16 as the floor).
- Capacitor 8 iOS (`npx cap add ios`), same `capacitor.config.ts`.
- Swift for the plugin, widget and notification code. No third-party
  dependencies beyond Capacitor.

## 1. Data parity

| Android | iOS |
| --- | --- |
| `assets/content/` read by `HowToRepository` | The same `public/content` bundle, read from the app group container (App Group `group.com.worstcase.app`) so the widget extension can read it too. `content` sync must copy into `ios/App/App/public/content` (Capacitor does this) **and** into the shared group on first launch. |
| `Prefs` (SharedPreferences) | `UserDefaults` with the App Group suite + a thin `Prefs.swift` mirroring the key names (`installSeed`, `notifyEnabled`, `notifyTime`, `theme`, `w<widgetId>_*` not needed on iOS — widget config uses per-widget `@AppStorage`). |
| `DailyPicker.kt` | `DailyPicker.swift` — same mulberry32 + cycle shuffle. Keep the golden CSV as the shared contract; add a Swift XCTest that parses the same `daily-picker.csv` (copy it into the test bundle). |
| `HowToRepository` (index/entries) | `ContentRepository.swift` decoding the bundled `index.json` into `Codable` structs (`IndexEntry`, `HowTo`, `Block`). |

## 2. Widget (WidgetKit)

- **Widget extension target** (`WorstCaseWidget`) with a **static intent
  configuration** (`DailyWidget`) and App Group access.
- One `TimelineProvider`:
  - `TimelineEntry` = the day's entry (title, body, image file name, glass
    preset, content mode, text size).
  - `getSnapshot` / `getTimeline` read `Prefs` + the shared content bundle,
    resolve the pick with `DailyPicker`, and return a single entry with
    `.never` reload policy; schedule the next reload at the next local
    midnight (widget timeline reload via `WidgetCenter.shared.reloadAllTimelines`
    from the app/notification when the day changes).
- Three families, matching the Android layouts:
  - `systemSmall` — dot + title (text mode) or artwork (image mode).
  - `systemMedium` — title + 2-line body + trailing artwork.
  - `systemLarge` — artwork on top, title, 4-line body.
- Glass: a `GlassBackground` view using a `Material` (.ultraThin / .regular /
  .thick mapped to clear / frosted / smoked; dusk and liquid as gradient and
  ultra-thin overlays) + 1px stroke + top sheen gradient, 28pt corner radius.
- Text size: `.footnote` / `.caption`-based scale factors matching the Android
  small/medium/large (0.88 / 1.0 / 1.16).
- Topic filter: `@AppStorage("w<widgetId>_topic")`-equivalent — WidgetKit
  supports per-widget configuration through the App Intent; persist in the
  shared defaults.
- Deep link: `widgetURL(URL(string: "worstcase://howto/\(slug)"))`; the app
  handles it in `App.onOpenURL` and via Capacitor's `appUrlOpen`.
- Preview: `#Preview` for all three families × glass presets × content modes.

## 3. Daily notification

- `UNUserNotificationCenter` with the `daily` category; request
  `UNAuthorizationOptions([.alert, .sound, .badge])` from the bridge.
- `DailyScheduler.swift`: compute the next occurrence of `notifyTime` with
  `Calendar`; schedule one `UNCalendarNotificationTrigger` (repeats: false),
  re-arm on each fire (in `UNUserNotificationCenterDelegate`), on
  `didFinishLaunching`, and on `NSSystemTimeZoneDidChange` /
  `UIApplication.significantTimeChangeNotification`.
- Notification content: title = entry `notification.title`, body = body +
  first three step headlines, thumbnail = the `*_w.png` variant as
  `UNNotificationAttachment` (CGImage → file in the Caches dir), category
  identifier with a custom "Open" action, deep link via
  `UNUserNotificationCenterDelegate.didReceive` → `open worstcase://howto/...`.
- `requestNotificationPermission` bridge maps to
  `requestAuthorization(options:)`; the denied-settings fallback opens
  `UIApplication.openSettingsURLString`.
- **Note:** iOS delivers the daily notification as a local notification, so
  the "exact alarm / battery optimization" machinery (Android
  `SCHEDULE_EXACT_ALARM`, `openBatterySettings`) has no iOS equivalent — the
  system owns timing. `openBatterySettings` should no-op or open the app's
  notification settings instead.

## 4. Bridge plugin (`WidgetBridgePlugin.swift`)

Mirror the Android plugin method-for-method (see README table):

| JS method | iOS implementation |
| --- | --- |
| `getToday()` | resolve pick with shared defaults + repo, return `{id, slug, epochDay}` |
| `getSettings()` / `setSettings()` | shared defaults; on change, reload widgets + reschedule notifications |
| `requestNotificationPermission()` | `UNUserNotificationCenter.requestAuthorization` |
| `scheduleDaily()` / `cancelDaily()` | remove pending requests with identifier `daily-howto` / schedule one |
| `refreshWidgets()` | `WidgetCenter.shared.reloadAllTimelines(ofKind:)` |
| `requestPinWidget()` | iOS 16+: no public pin API — present an "Add to Home Screen" instruction sheet (or a `UIApplicationShortcut`? no) — resolve `{requested: false}` and let the web layer show the long-press hint it already has. |
| `openBatterySettings()` | open the app's system settings page (notifications) or no-op |
| `getLaunchUrl()` | `UIApplicationDelegate` launch options / `App.onOpenURL` — Capacitor's App plugin already exposes `getLaunchUrl`; return it from the same surface |
| `openWidgetConfig()` | not applicable on iOS (widgets are configured in the widget gallery) — resolve |
| `fireTestNotification()` | post the daily notification immediately |

Register the plugin in `AppDelegate.application(didFinishLaunchingWithOptions:)`
via `CapApp-SPM`/`Capacitor` bridge registration, and handle
`application(_:open:options:)` for `worstcase://howto/<slug>`.

## 5. Theme parity

- The web layer already resolves auto/dark/light from `settings.theme`.
- iOS widget tint: `.regular` material reads light/dark appearance
  automatically; the App Intent can pass a resolved `ColorScheme` so the
  widget matches the in-app choice (store `theme` in the shared defaults and
  resolve at render time with `Environment(\.colorScheme)` + `@AppStorage`).

## 6. Build & CI

- `npm run mobile:build` gains an `ios` leg: `npx cap sync ios`.
- XcodeGen or the committed `.xcodeproj`; bundle id `com.worstcase.app`.
- `xcodebuild test -scheme WorstCase` runs the Swift picker golden test.
- Release: TestFlight build with the widget extension; the notification
  entitlement is implicit (local notifications need no capability).

## 7. Open questions / deviations from Android

- **Exact scheduling** is an Android-only concept; iOS best-effort delivery
  should be documented in the settings copy ("around the time you choose").
- **Per-widget reconfiguration** uses the widget gallery's "Edit Widget"
  (App Intents) instead of a dedicated config activity; the config UI in
  `WidgetConfigActivity` has no iOS counterpart and is not needed.
- **Pin request** is Android 12+ only; on iOS the settings "Add widget" hint
  already tells the user to long-press the home screen.
- **Widget image budget**: use the same `*_w.png` variants (≤480px,
  luminance→alpha) — WidgetKit accepts `UIImage` in `ImageRenderer`; memory
  limits are comparable to RemoteViews bitmaps.

## 8. Acceptance checklist (parity with Android 1.0.0)

- [ ] Today/Library/Detail render identically (same content, fonts, glass).
- [ ] Daily pick matches the golden CSV for 60 days (Swift XCTest).
- [ ] Widget: 3 families × 3 glass × 3 text sizes × 3 content modes render.
- [ ] Widget deep link opens the right detail.
- [ ] Daily notification at the chosen time; tap opens the entry.
- [ ] Warm + cold deep links (`worstcase://howto/<slug>`).
- [ ] Theme auto/dark/light in app and widget.
- [ ] `npm run build && xcodebuild build` green; instrumented UI smoke test
      on a simulator.
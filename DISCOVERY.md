# Discovery

Scan run from `~/Desktop` (read-only):

```
find ~/Desktop -maxdepth 3 -name "capacitor.config.*" -not -path "*/node_modules/*"
```

Hits: `Kakeibo`, `Replyline`, `GebetaSaccoApp`, `mobile_apps/aba-gizalign`,
`mobile_apps/new_project_telegram`, `mobile_apps/mezgebe-zema-zekdus-yared`.

## What the existing projects agree on

| Property | Kakeibo | Replyline | GebetaSacco | aba-gizalign | telegram | mezgebe |
| --- | --- | --- | --- | --- | --- | --- |
| Web stack | Vite + React + TS | Vite + React | Vite + React | Vite + React | Vite + React | Vite + React |
| Package manager | npm (`package-lock.json`) | npm | npm | npm | npm | bun |
| Capacitor | 6.x | 6.x | 6.x | 8.x | 6.x | 8.x |
| webDir | `dist` | `dist` | `dist` | `dist` | `dist` | `dist` |
| appId pattern | `com.kakeibo.app` | `com.replyline.app` | `com.gebeta.sacco` | `com.aba.gizalign` | `com.ethiopianorthodox.library` | `com.mezgebe.zema.app` |
| CSS | plain CSS variables | plain CSS | plain CSS | plain CSS | plain CSS | plain CSS |
| Android SDK | min 22 / compile 34 / target 34 | — | — | — | — | min 24 / compile 36 / target 36 |
| Native language | Java | Java | Java | Java | Java | Java |

House conventions picked up: `src/` with `screens/`, `ui/`, `lib/`, `styles/`;
plain CSS custom properties (no Tailwind); `lucide-react` icons;
`@fontsource` bundled fonts (Kakeibo ships Plus Jakarta Sans);
npm scripts named `dev / build / typecheck / mobile:build / android:*`;
`capacitor.config.ts` with `SplashScreen` and `StatusBar` plugin blocks;
Android widget already exists in Kakeibo (`KakeiboWidgetProvider` + `*_widget_info.xml`)
— same approach reused here, not copied.

## Decisions

- **Stack: Vite + React + TypeScript, plain CSS variables, npm.**
  This is what every project on this Desktop uses; moving to Flutter or React Native
  would throw away the house stack and is not needed — the product's only native
  surfaces (app widget, daily alarm, splash) are Kotlin either way, and Capacitor
  lets them sit next to the same web UI these projects already maintain.
- **Capacitor 8.6** (current release; the two most recent projects on this machine
  already run Cap 8 on SDK 36, which is installed here). Android `minSdk 26`
  (widgets need reliable RemoteViews; 26 is enough for `setAndAllowWhileIdle` +
  themed icons), `compileSdk/targetSdk 36`.
- **appId `com.worstcase.app`** — same reverse-domain shape as `com.kakeibo.app`.
- **Kotlin, not Java,** for everything native (`MainActivity`, bridge plugin,
  widget, alarm, picker). Kotlin is not used in the reference projects, but it is
  the language the widget/notification code wants (coroutines-free, but typed
  data classes and null-safety make the content parsing short) and it is the
  current Google default. Documented deviation.
- **RemoteViews + XML layouts** for the widget (no Glance — nothing on this
  Desktop uses it, and RemoteViews has the widest OEM launcher support).
- Re-implemented, not copied: `capacitor.config.ts` shape, npm script naming,
  `widget_info.xml` metadata + `APPWIDGET_UPDATE` receiver wiring from Kakeibo.

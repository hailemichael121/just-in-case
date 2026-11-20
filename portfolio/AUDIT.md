# Audit — Just in Case site, v2

## Removed from the old page

- Every gradient: hero blobs, gradient text, gradient buttons, badges and
  swatches. The page is flat paper and flat ink.
- The blurred glass header and cards. The header is opaque paper with one
  hairline rule; nothing uses `backdrop-filter`.
- Pills on navigation, buttons, badges, chips, theme toggle and palette buttons.
  Links are text with an underline; buttons use a 6px corner.
- Hover lift, scale, bounce and growing shadows. Hover changes colour or
  underline only.
- The icon-in-rounded-square feature card grid, the statistic band with huge
  numerals, the theme selector and the five-palette picker.
- The fake phone with placeholder art and the fake “screenshots”. Product
  visuals now come from the app token scenes: hero, widget set, appcreens.
- Claims the app does not have: extra widget sizes, five glass styles,
  “exact-alarm scheduling”, Dracula/Charcoal themes, React marketing.
- Dead links (`#source`, `#privacy`, `#license`, twitter, Play Store root,
  invented mailto) and the Google Fonts request.
- `© 2025`; the year is written by script at load, defaulting to 2026.
- The broken logo mask; the real logo SVG is used as an image.
- Hype copy and exclamation marks.

## Reused from Kakeibo

- Palette and hairlines: `--paper`, `--paper-deep`, `--ink`, `--muted`, the two
  line strengths.
- Type stack: Plus Jakarta Sans for UI and headings, Instrument Serif for
  numerals, italics and quotes, both self-hosted as `woff2`.
- Fluid `clamp()` sizes, 1140px wrap, 48px margins, sections split by hairline
  rules.
- Hero with copy and one visual; `.chapter` with the big serif number; the
  vertical `.timeline`; `.privacy-list`; ruled download rows; underlined text
  links; footer with brand, columns and meta; skip link; focus-visible ring.
- Mobile “Menu” toggle behaviour and the copy-to-clipboard pattern.
- The Netlify publish method (plain folder, CLI deploy, `netlify.toml`).

## Deliberate differences

- One accent only, muted rust `#A94F2E`, used for the beacon dot, small
  numerals, italic hero line and link hover.
- No paper grain, no radial background, no soft card shadows.
- Reveal is opacity-only at 300ms and is skipped entirely under reduced motion.
- The hero visual is the product itself on a dark panel, not illustration.
- The small browser-tab note below the hero is kept as a light detail.

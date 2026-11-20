# Just in Case — site

A small static site for the Just in Case Android widget app. No frameworks, no
external requests. The only build step is the optional image renderer in
`scripts/render-mockups.mjs`.

Pages: `index.html`, `downloads.html`, `about.html`. `story.html` is a redirect
to `about.html` for the old URL.

## Preview

```bash
cd portfolio
npx serve .          # or: python3 -m http.server 8000
```

## Deploy to Netlify

The Kakeibo project deploys a plain folder with the Netlify CLI, pinned with a
`.netlify/state.json` site id. This site uses the same method:

```bash
cd portfolio
npx netlify deploy --dir . --prod --no-build --site justincase-widget
```

Or link once and let the CLI remember the site:

```bash
npx netlify link
npx netlify deploy --dir . --prod --no-build
```

`netlify.toml` sets clean URLs (`/about`, `/downloads`), keeps `/story` working,
adds cache headers and a real 404. Drag-and-drop of the folder into the Netlify
dashboard also works.

Live URL: <https://justincase-widget.netlify.app/>

`SITE_URL` is the one place to change if the site moves. The canonical links are
root-relative (`/`, `about.html`, `downloads.html`); the absolute Open Graph
image and URL in `index.html` point at `https://justincase-widget.netlify.app/`.

## Download mode

`downloads.html` has `<body data-mode="soon">`. In `soon` the page shows a
dashed “Coming soon” row and no file link or hash; in `live` it shows the real
link, size and SHA-256. The default is `soon` because the APK contains the
book’s text and illustrations, and publishing it for anyone to download is
distribution of copyrighted material. Switch to `live` only if the owner has
permission, or after the content has been replaced with material the owner may
distribute.

To publish a real build:

1. Put the APK and `SHA256SUMS` in `assets/` (the manifest uses the plain
   `sha256sum` output format).
2. Compute the hash with `sha256sum Just-In-Case.apk`.
3. Replace the TODO values in `downloads.html` and set `body data-mode="live"`.

## Product images

`assets/hero-scene.webp` and the other product visuals are rendered from the
HTML scenes in `mockups/scenes/` with the app’s own dark tokens. They show
original sample content, not scans or quoted text from the book.

```bash
cd portfolio
npm run mockups
```

The renderer uses headless Chromium (`google-chrome`, override with `CHROME_BIN`)
and `sharp`, fixed viewports, 2x pixel density and WebP quality 82. It is
deterministic: the committed scenes regenerate the same files. Budgets: hero
110 KB max, every other image 70 KB max, total 600 KB. Current total is about
348 KB.

No colour is used inside the product scenes beyond greys. The only radius above
8px on the site belongs to those images; the page chrome uses 0–8px corners.
`border-radius: 50%` is not used anywhere; the timeline dots are 7px squares.

## TODO — facts the owner must supply

- APK download URL, file size, version (page currently says 1.1.0) and SHA-256.
- Confirmation that distributing the book-derived text and art is permitted.
- A real contact address, if one should appear on the site.
- Public source repository URL, if it should be linked.
- Final custom domain, if it is not `justincase-widget.netlify.app`.
- Replace the neutral placeholder in the download row when the build is live.

Nothing on the site invents a statistic, a testimonial, a hash or a link. Where
a fact is unknown the page says “Coming soon” and this list carries the TODO.

## Checks

```bash
grep -rnE "gradient|backdrop-filter|box-shadow|translateY|scale\\(|border-radius:\\s*(999|9999|50%)" styles.css index.html downloads.html about.html site.js
grep -rnE "fonts\\.googleapis|fonts\\.gstatic|https?://(twitter|x)\\.com|#source|#privacy|#license|justincase\\.app|Dracula|Charcoal" *.html styles.css site.js
grep -rniE "revolution|seamless|cutting-edge|unlock|game-changer|save your life|bestselling" *.html
grep -c "data-art" index.html
ls -l assets/*.webp && du -ch assets/*.webp | tail -1
grep -rnoE "(src|href)=\"https?://[^\"]+\"" *.html
```

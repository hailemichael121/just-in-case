#!/usr/bin/env node
// Builds the widget image variant: the source illustrations are black line art on
// white, which would show as a white box on glass. This flattens the page to
// transparency (luminance -> alpha) and tints the lines off-white so they float on
// the widget. Max edge 480px keeps RemoteViews well under the binder bitmap limit.
import { mkdir, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCES = [
  path.join(root, 'public/content/images'),
  path.join(root, 'android/app/src/main/assets/content/images'),
]
// _w: light ink for glass. _d: dark ink for the paper widget.
const VARIANTS = [
  { suffix: '_w', tint: { r: 244, g: 241, b: 234 } },
  { suffix: '_d', tint: { r: 27, g: 26, b: 23 } },
]
const MAX_EDGE = 480

async function variant(file, tint) {
  const { data, info } = await sharp(file)
    .flatten({ background: '#ffffff' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const out = Buffer.alloc(info.width * info.height * 4)
  for (let i = 0, p = 0; i < data.length; i += 1, p += 4) {
    const lum = data[i]
    out[p] = tint.r
    out[p + 1] = tint.g
    out[p + 2] = tint.b
    out[p + 3] = 255 - lum
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    // Drop the transparent scan margin so the drawing fills the card instead of
    // floating in a wide empty box. `trim` keeps a 1px safe border of line art.
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function run() {
  let count = 0
  for (const dir of SOURCES) {
    if (!existsSync(dir)) {
      console.warn(`skip (not synced yet): ${path.relative(root, dir)}`)
      continue
    }
      const folders = await readdir(dir, { withFileTypes: true })
      for (const folder of folders) {
        if (!folder.isDirectory()) continue
        const folderPath = path.join(dir, folder.name)
        for (const name of await readdir(folderPath)) {
          if (!name.endsWith('.png') || /_[wd]\.png$/.test(name)) continue
          const source = path.join(folderPath, name)
          for (const { suffix, tint } of VARIANTS) {
            const target = path.join(folderPath, name.replace(/\.png$/, `${suffix}.png`))
            const buffer = await variant(source, tint)
            await sharp(buffer).toFile(target)
            count += 1
          }
        }
      }
    }
    console.log(
      `widget image variants: ${count} files (≤${MAX_EDGE}px, light #f4f1ea + dark #1b1a17)`,
    )
  await mkdir(path.join(root, 'public/content'), { recursive: true })
  const assetsDir = path.join(root, 'android/app/src/main/assets/content/images')
  if (existsSync(assetsDir)) {
    const size = await stat(assetsDir)
    console.log(`assets images: ${path.relative(root, assetsDir)} (${size.isDirectory() ? 'ok' : '?'})`)
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})

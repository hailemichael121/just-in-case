#!/usr/bin/env node
// App icon, notification icon and splash mark, all cut from the mountain logo:
//   just-in-case-logo-assets/logo_assets/mountain-j/white/mountain-j_white_transparent.png -> shape
// The silhouette is white and composited on the app's ink colour at every density,
// so the launcher icon, the adaptive foreground and the splash always match.
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const res = path.join(root, 'android/app/src/main/res')
const assets = path.join(root, 'just-in-case-logo-assets/logo_assets/mountain-j/white')

const INK = '#000000'

const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)))

/** White silhouette with an alpha channel, for the app icon mark. */
async function whiteMark() {
  const white = await silhouette(path.join(assets, 'mountain-j_white_transparent.png'))
  return sharp(white).png().toBuffer()
}

/** White silhouette with an alpha channel, for the status-bar notification icon. */
async function silhouette(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const out = Buffer.alloc(info.width * info.height * 4)
  for (let i = 0, p = 0; i < data.length; i += 4, p += 4) {
    out[p] = 255
    out[p + 1] = 255
    out[p + 2] = 255
    out[p + 3] = data[i + 3]
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer()
}

/** Trim to the visible mark, so every density gets the same optical size. */
async function trim(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let minX = info.width
  let minY = info.height
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] > 12) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  const pad = 6
  const left = Math.max(0, minX - pad)
  const top = Math.max(0, minY - pad)
  const width = Math.min(info.width - left, maxX - minX + 1 + pad * 2)
  const height = Math.min(info.height - top, maxY - minY + 1 + pad * 2)
  return sharp(buffer).extract({ left, top, width, height }).png().toBuffer()
}

/** Composite the mark on a transparent square at `fill` of the canvas. */
async function place(mark, size, fill) {
  const inner = Math.max(8, Math.round(size * fill))
  const scaled = await sharp(mark)
    .resize(inner, inner, { fit: 'inside' })
    .png()
    .toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4, background: '#00000000' } })
    .composite([{ input: scaled, gravity: 'centre' }])
    .png()
    .toBuffer()
}

/** Multi-size .ico wrapping PNG entries, so the browser tab never shows a blank icon. */
async function ico(mark) {
  const sizes = [16, 32, 48]
  const pngs = await Promise.all(
    sizes.map(async (size) => sharp(await plate(mark, size, 0.6, 'square')).png().toBuffer()),
  )
  const header = Buffer.alloc(6 + sizes.length * 16)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(sizes.length, 4)
  let offset = header.length
  sizes.forEach((size, index) => {
    const entry = 6 + index * 16
    header.writeUInt8(size, entry)
    header.writeUInt8(size, entry + 1)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(pngs[index].length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += pngs[index].length
  })
  return Buffer.concat([header, ...pngs])
}

/** Full icon: mark on a rounded (or circular) ink plate. */
async function plate(mark, size, fill, shape) {
  const radius = shape === 'circle' ? size / 2 : Math.round(size * 0.225)
  const background = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect width="${size}" height="${size}" rx="${radius}" fill="${INK}"/>` +
      `</svg>`,
  )
  const inner = await place(mark, size, fill)
  return sharp({ create: { width: size, height: size, channels: 4, background: '#00000000' } })
    .composite([{ input: background, gravity: 'centre' }, { input: inner, gravity: 'centre' }])
    .png()
    .toBuffer()
}

const densities = [
  ['mdpi', 48],
  ['hdpi', 72],
  ['xhdpi', 96],
  ['xxhdpi', 144],
  ['xxxhdpi', 192],
]

async function run() {
  const mark = await trim(await whiteMark())
  const white = await trim(await silhouette(path.join(assets, 'mountain-j_white_transparent.png')))

  // Adaptive foreground: 108dp canvas, the mark inside the 66dp safe zone.
  const foregroundDir = path.join(res, 'drawable-nodpi')
  await mkdir(foregroundDir, { recursive: true })
  await sharp(await place(mark, 432, 0.62)).toFile(path.join(foregroundDir, 'ic_launcher_foreground.png'))

  // Legacy launcher icons and the splash mark.
  for (const [density, size] of densities) {
    const dir = path.join(res, `mipmap-${density}`)
    await mkdir(dir, { recursive: true })
    await sharp(await plate(mark, size, 0.6, 'square')).toFile(path.join(dir, 'ic_launcher.png'))
    await sharp(await plate(mark, size, 0.56, 'circle')).toFile(path.join(dir, 'ic_launcher_round.png'))
  }

  // Splash: 240dp plate; the system shows the middle 160dp, so keep the mark small.
  await sharp(await place(mark, 240, 0.56)).toFile(path.join(foregroundDir, 'ic_splash_drop.png'))

  // Notification: white silhouette, 24dp at nodpi resolution.
  await sharp(await place(white, 96, 0.92)).toFile(path.join(foregroundDir, 'ic_notif_drop.png'))

  // Docs + web icons.
  await mkdir(path.join(root, 'docs'), { recursive: true })
  await sharp(await plate(mark, 512, 0.6, 'square')).toFile(path.join(root, 'docs/icon-512.png'))
  await sharp(await place(mark, 192, 0.9)).toFile(path.join(root, 'docs/logo.png'))
  await sharp(await place(mark, 192, 0.9)).toFile(path.join(root, 'public/img/brand-mark.png'))
  await sharp(await plate(mark, 192, 0.6, 'square')).toFile(path.join(root, 'public/img/app-icon.png'))
  await sharp(await plate(mark, 192, 0.6, 'square')).toFile(path.join(root, 'public/icon-192.png'))
  await sharp(await plate(mark, 180, 0.6, 'square')).toFile(path.join(root, 'public/apple-touch-icon.png'))
  await sharp(await plate(mark, 512, 0.6, 'square')).toFile(path.join(root, 'public/icon-512.png'))

  const markPng = await place(mark, 192, 0.72)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <rect width="192" height="192" rx="44" fill="${INK}"/>
  <image href="data:image/png;base64,${markPng.toString('base64')}" width="192" height="192"/>
</svg>
`
  await writeFile(path.join(root, 'public/favicon.svg'), svg)
  await writeFile(path.join(root, 'public/favicon.ico'), await ico(mark))

  console.log('icons: adaptive foreground, legacy mipmaps, splash, notification, web icons')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
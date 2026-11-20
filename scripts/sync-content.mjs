#!/usr/bin/env node
// Validates the extracted how-to content and copies it into the web app and the
// Android asset bundle. Content is produced by the user's `extract_howtos.py`;
// this script never rewrites the data, it only checks and copies.
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(root, 'content-src/howtos_out')
const WEB = path.join(root, 'public/content')
const ANDROID = path.join(root, 'android/app/src/main/assets/content')

const errors = []
const warnings = []

function check(condition, message) {
  if (!condition) errors.push(message)
}

async function main() {
  if (!existsSync(SRC)) {
    console.error(`Missing content source: ${SRC}`)
    process.exit(1)
  }

  const index = JSON.parse(await readFile(path.join(SRC, 'index.json'), 'utf8'))
  check(Array.isArray(index), 'index.json must be an array')
  check(index.length === 40, `expected 40 entries in index.json, found ${index.length}`)

  const slugs = new Set()
  let imageCount = 0

  for (const entry of index) {
    const where = `entry ${entry.id ?? '?'}`
    for (const key of ['id', 'slug', 'title', 'chapter', 'thumbnail']) {
      check(entry[key] !== undefined && entry[key] !== null, `${where}: missing "${key}"`)
    }
    check(!slugs.has(entry.slug), `${where}: duplicate slug ${entry.slug}`)
    slugs.add(entry.slug)

    const file = path.join(SRC, 'howtos', `${entry.slug}.json`)
    if (!existsSync(file)) {
      errors.push(`${where}: missing ${path.relative(SRC, file)}`)
      continue
    }
    const full = JSON.parse(await readFile(file, 'utf8'))
    check(Array.isArray(full.content) && full.content.length > 0, `${where}: empty content[]`)

    const isProse = full.content.every((block) => block.type !== 'step')
    if (isProse) warnings.push(`${where}: prose-only entry (no numbered steps) — ${entry.slug}`)

    for (const block of full.content) {
      if (block.type === 'image') {
        const image = path.join(SRC, block.file)
        if (!existsSync(image)) errors.push(`${where}: missing image ${block.file}`)
        else imageCount += 1
      }
    }
  }

  const onDisk = new Set(await readdir(path.join(SRC, 'howtos')))
  for (const extra of onDisk) {
    if (!slugs.has(extra.replace(/\.json$/, ''))) warnings.push(`orphan file howtos/${extra}`)
  }

  if (errors.length) {
    console.error(`Content validation failed with ${errors.length} error(s):`)
    for (const error of errors) console.error(`  - ${error}`)
    process.exit(1)
  }

  for (const target of [WEB, ANDROID]) {
    await rm(path.join(target, 'howtos'), { recursive: true, force: true })
    await rm(path.join(target, 'images'), { recursive: true, force: true })
    await mkdir(target, { recursive: true })
    await writeFile(path.join(target, 'index.json'), JSON.stringify(index, null, 2) + '\n')
    await cp(path.join(SRC, 'howtos'), path.join(target, 'howtos'), { recursive: true })
    await cp(path.join(SRC, 'images'), path.join(target, 'images'), { recursive: true })
  }

  for (const warning of warnings) console.warn(`  ! ${warning}`)
  const totalImages = (await readdir(path.join(SRC, 'images'))).length
  console.log(`40 entries, ${imageCount} images in ${totalImages} folders, 0 errors`)
  console.log(`synced → public/content, android/app/src/main/assets/content`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

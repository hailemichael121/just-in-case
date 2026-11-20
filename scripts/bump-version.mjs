#!/usr/bin/env node
/**
 * Bump the app version in one place and mirror it into Android.
 *
 *   node scripts/bump-version.mjs             # patch (1.1.0 -> 1.1.1)
 *   node scripts/bump-version.mjs --minor     # 1.1.0 -> 1.2.0
 *   node scripts/bump-version.mjs --major     # 1.1.0 -> 2.0.0
 *   node scripts/bump-version.mjs --set 1.4.0 # explicit
 *
 * versionCode always increments, even when --set repeats the current version,
 * so an explicit re-release can still be installed over the old build.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const packagePath = join(root, 'package.json')
const lockPath = join(root, 'package-lock.json')
const gradlePath = join(root, 'android/app/build.gradle')

const args = process.argv.slice(2)
const explicitIndex = Math.max(args.indexOf('--set'), args.indexOf('--version'))
let requested = null

if (explicitIndex !== -1) {
  requested = args[explicitIndex + 1]
  if (!requested) fail('--set needs a version, e.g. --set 1.2.0')
  if (!/^\d+\.\d+\.\d+$/.test(requested)) fail(`"${requested}" is not a semver version`)
} else {
  const kind = args.includes('--major')
    ? 'major'
    : args.includes('--minor')
      ? 'minor'
      : 'patch'
  requested = bump(readVersion(), kind)
}

const next = requested
writeJson(packagePath, (json) => {
  json.version = next
})
writeJson(lockPath, (json) => {
  json.version = next
  if (json.packages?.['']) json.packages[''].version = next
})
const versionCode = bumpGradle(next)

console.log(`Just In Case ${next} (android versionCode ${versionCode})`)

function readVersion() {
  return JSON.parse(readFileSync(packagePath, 'utf8')).version
}

function bump(version, kind) {
  const [major, minor, patch] = version.split('.').map(Number)
  if (kind === 'major') return `${major + 1}.0.0`
  if (kind === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

function writeJson(path, mutate) {
  const json = JSON.parse(readFileSync(path, 'utf8'))
  mutate(json)
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`)
}

function bumpGradle(version) {
  let gradle
  try {
    gradle = readFileSync(gradlePath, 'utf8')
  } catch {
    return 'not found'
  }

  const codeMatch = gradle.match(/versionCode\s+(\d+)/)
  const nextCode = codeMatch ? Number(codeMatch[1]) + 1 : 1

  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${nextCode}`)
  if (/versionName\s+"[^"]*"/.test(gradle)) {
    gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${version}"`)
  } else {
    gradle = gradle.replace(/(versionCode\s+\d+)/, `$1\n        versionName "${version}"`)
  }

  writeFileSync(gradlePath, gradle)
  return nextCode
}

function fail(message) {
  console.error(`bump-version: ${message}`)
  process.exit(1)
}

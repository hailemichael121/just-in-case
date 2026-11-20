// Regenerates the golden CSV from the TypeScript picker.
// Run with: node scripts/generate-golden.ts   (Node 24 strips the types)
// The Kotlin unit test (DailyPickerTest) asserts DailyPicker reproduces the
// android/app/src/test/resources copy exactly.
import { mkdir, writeFile } from 'node:fs/promises'
import { pickForDay } from '../src/lib/dailyPicker.ts'

const SEED = 0x5eed1234
const START_DAY = 20700 // 2026-09-03 UTC — arbitrary, just a stable anchor
const DAYS = 60
const POOL = Array.from({ length: 40 }, (_, i) => i + 1)

const lines = ['epochDay,id']
for (let i = 0; i < DAYS; i += 1) {
  const day = START_DAY + i
  lines.push(`${day},${pickForDay(POOL, SEED, day)}`)
}
const csv = lines.join('\n') + '\n'

await writeFile(new URL('../test/golden/daily-picker.csv', import.meta.url), csv)
await mkdir(new URL('../android/app/src/test/resources/', import.meta.url), { recursive: true })
await writeFile(new URL('../android/app/src/test/resources/daily-picker.csv', import.meta.url), csv)
console.log(`wrote ${DAYS} golden days (seed 0x${SEED.toString(16)})`)
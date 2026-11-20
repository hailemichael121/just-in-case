import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cycleOrder, pickForDay } from '../src/lib/dailyPicker'

const SEED = 0x5eed1234
const POOL = Array.from({ length: 40 }, (_, i) => i + 1)

const golden = readFileSync(new URL('./golden/daily-picker.csv', import.meta.url), 'utf8')
  .trim()
  .split('\n')
  .slice(1)
  .map((line) => {
    const [epochDay, id] = line.split(',').map(Number)
    return { epochDay, id }
  })

describe('daily picker', () => {
  it('reproduces the golden file exactly', () => {
    const actual = golden.map((row) => pickForDay(POOL, SEED, row.epochDay))
    expect(actual).toEqual(golden.map((row) => row.id))
  })

  it('shows every entry exactly once per cycle', () => {
    const cycle = Math.floor(golden[0].epochDay / POOL.length)
    const order = cycleOrder(POOL, SEED, cycle)
    expect([...order].sort((a, b) => a - b)).toEqual(POOL)
  })

  it('never repeats across a cycle boundary', () => {
    const first = golden[0].epochDay
    const boundary = (Math.floor(first / POOL.length) + 1) * POOL.length
    const lastOfCycle = pickForDay(POOL, SEED, boundary - 1)
    const firstOfNext = pickForDay(POOL, SEED, boundary)
    expect(firstOfNext).not.toBe(lastOfCycle)
  })

  it('is deterministic for the same day and differs with another seed', () => {
    expect(pickForDay(POOL, SEED, 20999)).toBe(pickForDay(POOL, SEED, 20999))
    const a = cycleOrder(POOL, SEED, 600)
    const b = cycleOrder(POOL, SEED + 1, 600)
    expect(a).not.toEqual(b)
  })
})

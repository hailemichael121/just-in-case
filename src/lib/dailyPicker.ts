// The daily pick — single source of truth in Kotlin (DailyPicker.kt); this is the
// browser mirror used by `npm run dev`, the QA route and the golden test. Both
// implementations must reproduce test/golden/daily-picker.csv exactly.
//
// Rules: no entry repeats until every entry in the pool has been shown. Order for
// each cycle is a Fisher–Yates shuffle seeded by (installSeed + cycle). Day 0 of a
// cycle never repeats the last entry of the previous cycle.

export function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(ids: readonly number[], seed: number): number[] {
  const random = mulberry32(seed)
  const list = [...ids]
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const swap = list[i]
    list[i] = list[j]
    list[j] = swap
  }
  return list
}

function orderForCycle(ids: readonly number[], installSeed: number, cycle: number): number[] {
  const order = shuffle(ids, (installSeed + cycle) | 0)
  if (cycle > 0 && order.length > 1) {
    const previous = shuffle(ids, (installSeed + cycle - 1) | 0)
    if (order[0] === previous[previous.length - 1]) {
      const swap = order[0]
      order[0] = order[1]
      order[1] = swap
    }
  }
  return order
}

/** Id shown on a given local day, for a pool of ids (already filtered by topic). */
export function pickForDay(ids: readonly number[], installSeed: number, epochDay: number): number {
  if (ids.length === 0) throw new Error('empty pool')
  const size = ids.length
  const cycle = Math.floor(epochDay / size)
  const position = epochDay - cycle * size
  return orderForCycle(ids, installSeed, cycle)[position]
}

/** Full cycle order, used by the QA route to eyeball a whole cycle at once. */
export function cycleOrder(ids: readonly number[], installSeed: number, cycle: number): number[] {
  return orderForCycle(ids, installSeed, cycle)
}

export const installSeedFallback = 0x5eed1234

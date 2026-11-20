package com.justincase.app.core

/**
 * The daily pick — the single source of truth for which entry the widget, the
 * notification and the Today screen show. The Kotlin implementation and the
 * TypeScript mirror (src/lib/dailyPicker.ts) must both reproduce
 * test/golden/daily-picker.csv exactly; DailyPickerTest enforces the Kotlin half.
 */
object DailyPicker {

    fun pick(pool: List<Int>, installSeed: Int, epochDay: Long): Int {
        require(pool.isNotEmpty()) { "empty pool" }
        val size = pool.size.toLong()
        val cycle = Math.floorDiv(epochDay, size)
        val position = Math.floorMod(epochDay, size).toInt()
        return orderForCycle(pool, installSeed, cycle)[position]
    }

    fun orderForCycle(ids: List<Int>, installSeed: Int, cycle: Long): MutableList<Int> {
        val order = shuffle(ids, (installSeed + cycle).toInt())
        if (cycle > 0L && order.size > 1) {
            val previous = shuffle(ids, (installSeed + cycle - 1L).toInt())
            if (order[0] == previous[previous.size - 1]) {
                val swap = order[0]
                order[0] = order[1]
                order[1] = swap
            }
        }
        return order
    }

    private fun shuffle(ids: List<Int>, seed: Int): MutableList<Int> {
        val random = mulberry32(seed)
        val list = ids.toMutableList()
        for (i in list.size - 1 downTo 1) {
            val j = (random() * (i + 1)).toInt()
            val swap = list[i]
            list[i] = list[j]
            list[j] = swap
        }
        return list
    }

    /** Bit-identical to the JS reference implementation. */
    fun mulberry32(seed: Int): () -> Double {
        var a = seed
        return {
            a += 0x6D2B79F5
            var t = (a xor (a ushr 15)) * (1 or a)
            t = (t + (t xor (t ushr 7)) * (61 or t)) xor t
            ((t xor (t ushr 14)).toUInt().toDouble()) / 4294967296.0
        }
    }
}

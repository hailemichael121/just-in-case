package com.justincase.app.widget

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.justincase.app.R

/** Shared choices between the RemoteViews provider and the config-screen preview. */
object WidgetRendering {

    /** Options from AppWidgetManager are in dp, which is exactly what we compare against. */
    fun layoutFor(minWidthDp: Int, minHeightDp: Int): Int = when {
        minWidthDp < 160 || minHeightDp < 110 -> R.layout.widget_small
        minWidthDp < 260 || minHeightDp < 160 -> R.layout.widget_medium
        else -> R.layout.widget_large
    }

    fun glassRes(glass: String): Int = when (glass) {
        "clear" -> R.drawable.widget_glass_clear
        "smoked" -> R.drawable.widget_glass_smoked
        else -> R.drawable.widget_glass_frosted
    }

    fun titleColor(glass: String): Int = 0xFFF6F7F9.toInt()

    fun bodyColor(glass: String): Int = 0xFFBFC6D2.toInt()

    fun imageVariant(glass: String): String = "_w.png"

    fun textScale(textSize: String): Float = when (textSize) {
        "small" -> 0.88f
        "large" -> 1.16f
        else -> 1.0f
    }

    /** Word-boundary truncation so remote text never ends mid-word. */
    fun truncate(text: String, max: Int): String {
        if (text.length <= max) return text
        val cut = text.substring(0, max - 1)
        val boundary = cut.lastIndexOf(' ')
        val base = if (boundary > max * 0.6) cut.substring(0, boundary) else cut
        return base.trimEnd(*charArrayOf(',', ';', ':', '.', ' ', '—', '–')) + "…"
    }

    /** Downsampled asset decode; widget images live at <=480px, so 2x sampling is enough. */
    fun loadBitmap(context: Context, path: String, targetPx: Int): Bitmap? = runCatching {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        context.assets.open(path).use { BitmapFactory.decodeStream(it, null, bounds) }
        var sample = 1
        while (bounds.outWidth / (sample * 2) >= targetPx || bounds.outHeight / (sample * 2) >= targetPx) {
            sample *= 2
        }
        val options = BitmapFactory.Options().apply { inSampleSize = sample }
        context.assets.open(path).use { BitmapFactory.decodeStream(it, null, options) }
    }.getOrNull()
}
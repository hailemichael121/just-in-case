package com.justincase.app.core

import android.content.Context
import java.security.SecureRandom

/** Single place for persisted state. Native owns the picker and notification settings. */
object Prefs {
    private const val FILE = "worst_case"
    private const val WIDGET_FILE = "worst_case_widgets"

    private const val KEY_SEED = "installSeed"
    private const val KEY_NOTIFY_ENABLED = "notifyEnabled"
    private const val KEY_NOTIFY_TIME = "notifyTime"
    private const val KEY_NOTIFY_EVENING = "notifyEvening"
    private const val KEY_NOTIFY_EVENING_TIME = "notifyEveningTime"
    private const val KEY_THEME = "theme"
    private const val KEY_PALETTE = "palette"

    const val DEFAULT_TIME = "08:00"
    const val DEFAULT_EVENING_TIME = "21:00"

    /** How long a not-yet-placed widget keeps its chosen look. */
    private const val PENDING_TTL_MS = 10 * 60 * 1000L

    private fun sp(context: Context) =
        context.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    private fun widgetSp(context: Context) =
        context.getSharedPreferences(WIDGET_FILE, Context.MODE_PRIVATE)

    /** Created once at first launch; changing it would reshuffle everyone's deck. */
    fun installSeed(context: Context): Int {
        val prefs = sp(context)
        val existing = prefs.getInt(KEY_SEED, 0)
        if (existing != 0) return existing
        var seed = SecureRandom().nextInt()
        if (seed == 0) seed = 0x5EED1234.toInt()
        prefs.edit().putInt(KEY_SEED, seed).apply()
        return seed
    }

    fun notifyEnabled(context: Context): Boolean =
        sp(context).getBoolean(KEY_NOTIFY_ENABLED, false)

    fun saveNotifyEnabled(context: Context, value: Boolean) {
        sp(context).edit().putBoolean(KEY_NOTIFY_ENABLED, value).apply()
    }

    fun notifyTime(context: Context): String =
        sp(context).getString(KEY_NOTIFY_TIME, DEFAULT_TIME) ?: DEFAULT_TIME

    fun saveNotifyTime(context: Context, value: String) {
        sp(context).edit().putString(KEY_NOTIFY_TIME, value).apply()
    }

    fun notifyEvening(context: Context): Boolean =
        sp(context).getBoolean(KEY_NOTIFY_EVENING, false)

    fun saveNotifyEvening(context: Context, value: Boolean) {
        sp(context).edit().putBoolean(KEY_NOTIFY_EVENING, value).apply()
    }

    fun notifyEveningTime(context: Context): String =
        sp(context).getString(KEY_NOTIFY_EVENING_TIME, DEFAULT_EVENING_TIME) ?: DEFAULT_EVENING_TIME

    fun saveNotifyEveningTime(context: Context, value: String) {
        sp(context).edit().putString(KEY_NOTIFY_EVENING_TIME, value).apply()
    }

    fun theme(context: Context): String =
        sp(context).getString(KEY_THEME, "light") ?: "light"

    fun saveTheme(context: Context, value: String) {
        sp(context).edit().putString(KEY_THEME, value).apply()
    }

    /** "mint" or "liquid" — one accent story for the app and the widget. */
    fun palette(context: Context): String =
        sp(context).getString(KEY_PALETTE, "mint") ?: "mint"

    fun savePalette(context: Context, value: String) {
        sp(context).edit().putString(KEY_PALETTE, value).apply()
    }

    data class WidgetConfig(
        val content: String = "image_text",
        val glass: String = "frosted",
        val textSize: String = "medium",
        val topic: String = "all",
    )

    fun widgetConfig(context: Context, appWidgetId: Int): WidgetConfig {
        val prefs = widgetSp(context)
        return WidgetConfig(
            content = prefs.getString("w${appWidgetId}_content", "image_text") ?: "image_text",
            glass = prefs.getString("w${appWidgetId}_glass", "frosted") ?: "frosted",
            textSize = prefs.getString("w${appWidgetId}_text", "medium") ?: "medium",
            topic = prefs.getString("w${appWidgetId}_topic", "all") ?: "all",
        )
    }

    fun saveWidgetConfig(context: Context, appWidgetId: Int, config: WidgetConfig) {
        widgetSp(context).edit()
            .putString("w${appWidgetId}_content", config.content)
            .putString("w${appWidgetId}_glass", config.glass)
            .putString("w${appWidgetId}_text", config.textSize)
            .putString("w${appWidgetId}_topic", config.topic)
            .apply()
    }

    fun deleteWidget(context: Context, appWidgetId: Int) {
        val prefs = widgetSp(context)
        prefs.edit()
            .remove("w${appWidgetId}_content")
            .remove("w${appWidgetId}_glass")
            .remove("w${appWidgetId}_text")
            .remove("w${appWidgetId}_topic")
            .apply()
    }

    /** True when this widget already carries a stored configuration. */
    fun hasWidgetConfig(context: Context, appWidgetId: Int): Boolean =
        widgetSp(context).contains("w${appWidgetId}_glass")

    // --- Pending config: choices made in the app before the launcher has
    // assigned a widget id. Scoped per size so a stale choice from a cancelled
    // pin can only ever land on a widget of the same type. ---

    private fun pendingKey(size: String, field: String) = "pending_${size}_$field"

    fun savePendingWidgetConfig(context: Context, size: String, config: WidgetConfig) {
        widgetSp(context).edit()
            .putString(pendingKey(size, "content"), config.content)
            .putString(pendingKey(size, "glass"), config.glass)
            .putString(pendingKey(size, "text"), config.textSize)
            .putString(pendingKey(size, "topic"), config.topic)
            .putLong(pendingKey(size, "at"), System.currentTimeMillis())
            .apply()
    }

    /** Returns the pending config once, so the widget that lands adopts it. */
    fun consumePendingWidgetConfig(context: Context, size: String): WidgetConfig? {
        val prefs = widgetSp(context)
        if (!prefs.contains(pendingKey(size, "glass"))) return null
        // A cancelled pin leaves a choice behind; let it go stale rather than
        // silently styling some later widget.
        val at = prefs.getLong(pendingKey(size, "at"), 0L)
        if (at == 0L || System.currentTimeMillis() - at > PENDING_TTL_MS) {
            clearPendingWidgetConfig(context, size)
            return null
        }
        val config = WidgetConfig(
            content = prefs.getString(pendingKey(size, "content"), "image_text") ?: "image_text",
            glass = prefs.getString(pendingKey(size, "glass"), "frosted") ?: "frosted",
            textSize = prefs.getString(pendingKey(size, "text"), "medium") ?: "medium",
            topic = prefs.getString(pendingKey(size, "topic"), "all") ?: "all",
        )
        prefs.edit()
            .remove(pendingKey(size, "content"))
            .remove(pendingKey(size, "glass"))
            .remove(pendingKey(size, "text"))
            .remove(pendingKey(size, "topic"))
            .remove(pendingKey(size, "at"))
            .apply()
        return config
    }

    fun clearPendingWidgetConfig(context: Context, size: String) {
        val prefs = widgetSp(context)
        prefs.edit()
            .remove(pendingKey(size, "content"))
            .remove(pendingKey(size, "glass"))
            .remove(pendingKey(size, "text"))
            .remove(pendingKey(size, "topic"))
            .remove(pendingKey(size, "at"))
            .apply()
    }
}
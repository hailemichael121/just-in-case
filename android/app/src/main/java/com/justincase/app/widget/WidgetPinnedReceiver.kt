package com.justincase.app.widget

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.justincase.app.core.Prefs

/**
 * Runs after the launcher accepts a pin request.
 *
 * The widget id is not guaranteed to arrive here, so the screen that started
 * the pin also parks the chosen content / glass / text size / topic as a
 * pending config for that widget type; the first provider update adopts it.
 * When an id does arrive, the config is written straight onto the widget.
 */
class WidgetPinnedReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID,
        )
        if (id == AppWidgetManager.INVALID_APPWIDGET_ID) {
            WidgetRefresh.all(context)
            return
        }

        val size = intent.getStringExtra(EXTRA_WIDGET_SIZE) ?: "medium"
        Prefs.saveWidgetConfig(
            context,
            id,
            Prefs.WidgetConfig(
                content = intent.getStringExtra(EXTRA_CONTENT) ?: "image_text",
                glass = intent.getStringExtra(EXTRA_GLASS) ?: "frosted",
                textSize = intent.getStringExtra(EXTRA_TEXT_SIZE) ?: "medium",
                topic = intent.getStringExtra(EXTRA_TOPIC) ?: "all",
            ),
        )
        Prefs.clearPendingWidgetConfig(context, size)
        WidgetRefresh.all(context)
    }

    companion object {
        const val EXTRA_WIDGET_SIZE = "widgetSize"
        const val EXTRA_GLASS = "glass"
        const val EXTRA_CONTENT = "content"
        const val EXTRA_TEXT_SIZE = "textSize"
        const val EXTRA_TOPIC = "topic"
    }
}
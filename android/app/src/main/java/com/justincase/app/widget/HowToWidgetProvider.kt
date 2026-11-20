package com.justincase.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.TypedValue
import android.view.View
import android.widget.RemoteViews
import com.justincase.app.MainActivity
import com.justincase.app.R
import com.justincase.app.core.HowToRepository
import com.justincase.app.core.Prefs
import java.time.LocalDate

/**
 * Three widget types, one per provider, so the launcher lists them separately:
 * Small (2×2), Medium (4×1) and Large (4×3). Each provider keeps its own layout;
 * content mode, glass, text size and topic stay per widget id in Prefs.
 */
abstract class BaseWidgetProvider : AppWidgetProvider() {

    protected abstract val layoutRes: Int

    /** SharedPreferences namespace used by pending (pre-pin) configs. */
    protected abstract val sizeKey: String

    override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
        appWidgetIds.forEach { id -> updateWidget(context, manager, id) }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        appWidgetIds.forEach { Prefs.deleteWidget(context, it) }
    }

    open fun getLayoutRes(config: Prefs.WidgetConfig): Int = layoutRes

    fun updateWidget(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
        // A widget placed from the launcher has its own saved config; a widget
        // pinned from the app may only have a pending one to adopt.
        val config = if (Prefs.hasWidgetConfig(context, appWidgetId)) {
            Prefs.widgetConfig(context, appWidgetId)
        } else {
            val adopted = Prefs.consumePendingWidgetConfig(context, sizeKey)
            if (adopted != null) {
                // Make it stick: the launcher may update this widget again at any
                // time, and the pending slot is gone after the first adoption.
                Prefs.saveWidgetConfig(context, appWidgetId, adopted)
                adopted
            } else {
                Prefs.widgetConfig(context, appWidgetId)
            }
        }

        val layout = getLayoutRes(config)
        val repo = HowToRepository(context)
        val entry = repo.today(Prefs.installSeed(context), LocalDate.now().toEpochDay(), config.topic)

        val views = RemoteViews(context.packageName, layout)
        val scale = WidgetRendering.textScale(config.textSize)
        val showImage = config.content != "text"
        val showText = config.content != "image"

        views.setInt(R.id.widget_root, "setBackgroundResource", WidgetRendering.glassRes(config.glass))
        views.setTextColor(R.id.widget_title, WidgetRendering.titleColor(config.glass))
        views.setTextColor(R.id.widget_brand, WidgetRendering.bodyColor(config.glass))
        if (layout != R.layout.widget_small) {
            views.setTextColor(R.id.widget_body, WidgetRendering.bodyColor(config.glass))
        }

        views.setViewVisibility(R.id.widget_image, if (showImage) View.VISIBLE else View.GONE)
        views.setViewVisibility(R.id.widget_title, if (showText) View.VISIBLE else View.GONE)
        if (layout != R.layout.widget_small) {
            views.setViewVisibility(R.id.widget_body, if (showText) View.VISIBLE else View.GONE)
        }

        val titleBasePx = when (layout) {
            R.layout.widget_small -> context.resources.getDimension(R.dimen.widget_title_small)
            R.layout.widget_medium -> context.resources.getDimension(R.dimen.widget_title_medium)
            else -> context.resources.getDimension(R.dimen.widget_title_large)
        }
        views.setTextViewText(R.id.widget_title, entry.title)
        views.setTextViewTextSize(R.id.widget_title, TypedValue.COMPLEX_UNIT_PX, titleBasePx * scale)

        // No-op when the layout has no body view (small): RemoteViews would
        // throw if we touched a view id that is not in the inflated layout.
        if (layout != R.layout.widget_small) {
            val bodyBasePx = context.resources.getDimension(R.dimen.widget_body)
            views.setTextViewText(R.id.widget_body, WidgetRendering.truncate(entry.description, 130))
            views.setTextViewTextSize(R.id.widget_body, TypedValue.COMPLEX_UNIT_PX, bodyBasePx * scale)
        }

        if (showImage) {
            val bitmap = WidgetRendering.loadBitmap(
                context,
                repo.widgetImagePath(entry.thumbnail, WidgetRendering.imageVariant(config.glass)),
                480,
            )
            if (bitmap != null) {
                views.setImageViewBitmap(R.id.widget_image, bitmap)
            } else {
                views.setViewVisibility(R.id.widget_image, View.GONE)
            }
        }

        val tap = PendingIntent.getActivity(
            context,
            appWidgetId,
            Intent(context, MainActivity::class.java)
                .setData(Uri.parse("justincase://howto/${entry.slug}"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        views.setOnClickPendingIntent(R.id.widget_root, tap)

        runCatching { manager.updateAppWidget(appWidgetId, views) }
    }
}

class SmallWidgetProvider : BaseWidgetProvider() {
    override val layoutRes: Int = R.layout.widget_small
    override val sizeKey: String = "small"
}

class MediumWidgetProvider : BaseWidgetProvider() {
    override val layoutRes: Int = R.layout.widget_medium
    override val sizeKey: String = "medium"
}

class LargeWidgetProvider : BaseWidgetProvider() {
    override val layoutRes: Int = R.layout.widget_large
    override val sizeKey: String = "large"
}

/** Re-renders every installed widget, whatever its type. */
object WidgetRefresh {

    private val providers = listOf(SmallWidgetProvider(), MediumWidgetProvider(), LargeWidgetProvider())

    fun all(context: Context) {
        val manager = AppWidgetManager.getInstance(context) ?: return
        providers.forEach { provider ->
            val ids = manager.getAppWidgetIds(
                android.content.ComponentName(context, provider.javaClass),
            )
            ids.forEach { id -> provider.updateWidget(context, manager, id) }
        }
    }
}
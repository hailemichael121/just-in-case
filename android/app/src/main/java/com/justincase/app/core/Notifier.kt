package com.justincase.app.core

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.justincase.app.MainActivity
import com.justincase.app.R

/** Builds and posts the daily how-to notification. Uses only asset content, no WebView. */
object Notifier {

    const val CHANNEL_ID = "daily"
    private const val NOTIFICATION_ID = 1001

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.notification_channel_name),
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = context.getString(R.string.notification_channel_description)
            enableVibration(true)
        }
        manager.createNotificationChannel(channel)
    }

    /** Today's entry, resolved by the same picker the widget uses. */
    fun showDaily(context: Context) {
        val repo = HowToRepository(context)
        showEntry(context, repo, repo.today(Prefs.installSeed(context)))
    }

    fun showEntry(context: Context, repo: HowToRepository, entry: HowToSummary) {
        ensureChannel(context)
        val accent = when (Prefs.palette(context)) {
            "liquid" -> 0xFF5EEAD4.toInt()
            else -> 0xFF7CE3C4.toInt()
        }

val open = PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java)
                .setData(Uri.parse("justincase://howto/${entry.slug}"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val steps = repo.stepHeadlines(entry.slug, limit = 3)
        val expanded = buildString {
            append(entry.notifyBody)
            steps.forEachIndexed { index, headline ->
                append("\n\n${index + 1}. $headline")
            }
        }

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notif_drop)
            .setContentTitle(entry.notifyTitle)
            .setContentText(entry.notifyBody)
            .setStyle(NotificationCompat.BigTextStyle().bigText(expanded))
            .setContentIntent(open)
            .setAutoCancel(true)
            .setColor(accent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)

        val icon = runCatching {
            val opts = BitmapFactory.Options().apply { inSampleSize = 2 }
            context.assets.open(repo.widgetImagePath(entry.thumbnail)).use {
                BitmapFactory.decodeStream(it, null, opts)
            }
        }.getOrNull()
        if (icon != null) builder.setLargeIcon(icon)

        runCatching {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build())
        }
    }
}
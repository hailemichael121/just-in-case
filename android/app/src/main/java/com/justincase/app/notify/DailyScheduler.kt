package com.justincase.app.notify

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.justincase.app.core.Notifier
import com.justincase.app.core.Prefs
import com.justincase.app.widget.WidgetRefresh
import java.util.Calendar

/**
 * Two alarms a day: one at the user's chosen morning time, one at their chosen
 * evening time. Evening notification is optional and off by default. Re-armed after each fire
 * (and after reboot / timezone change). Falls back to an inexact but device-waking
 * alarm when the exact-alarm permission is not granted.
 */
object DailyScheduler {

    const val ACTION_DAILY = "com.justincase.app.notify.DAILY"
    const val ACTION_EVENING = "com.justincase.app.notify.EVENING"
    private const val REQUEST_CODE_DAILY = 1001
    private const val REQUEST_CODE_EVENING = 1002
    private const val TAG = "DailyScheduler"

    private fun alarmIntent(context: Context, action: String): Intent =
        Intent(context, DailyReceiver::class.java).setAction(action)

    private fun pendingIntent(context: Context, action: String, requestCode: Int) = android.app.PendingIntent.getBroadcast(
        context,
        requestCode,
        alarmIntent(context, action),
        android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE,
    )

    /** Next occurrence of "HH:mm" (local), today if still ahead, otherwise tomorrow. */
    fun nextTrigger(time: String): Long {
        val (hour, minute) = runCatching {
            val parts = time.split(":")
            parts[0].toInt() to parts[1].toInt()
        }.getOrDefault(8 to 0)
        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        if (calendar.timeInMillis <= System.currentTimeMillis()) {
            calendar.add(Calendar.DAY_OF_YEAR, 1)
        }
        return calendar.timeInMillis
    }

    /** Next occurrence of the user's evening time. */
    private fun nextEveningTrigger(context: Context): Long = nextTrigger(Prefs.notifyEveningTime(context))

    fun schedule(context: Context) {
        if (!Prefs.notifyEnabled(context)) return
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        // Morning notification
        val morningTrigger = nextTrigger(Prefs.notifyTime(context))
        val morningPending = pendingIntent(context, ACTION_DAILY, REQUEST_CODE_DAILY)
        runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) {
                manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, morningTrigger, morningPending)
            } else {
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, morningTrigger, morningPending)
            }
        }.onFailure { error ->
            Log.w(TAG, "exact alarm unavailable, using inexact", error)
            manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, morningTrigger, morningPending)
        }

        // Evening notification - only if enabled
        if (Prefs.notifyEvening(context)) {
            val eveningTrigger = nextEveningTrigger(context)
            val eveningPending = pendingIntent(context, ACTION_EVENING, REQUEST_CODE_EVENING)
            runCatching {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) {
                    manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, eveningTrigger, eveningPending)
                } else {
                    manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, eveningTrigger, eveningPending)
                }
            }.onFailure { error ->
                Log.w(TAG, "exact evening alarm unavailable, using inexact", error)
                manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, eveningTrigger, eveningPending)
            }
        } else {
            cancelEvening(context)
        }
    }

    fun cancel(context: Context) {
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        manager.cancel(pendingIntent(context, ACTION_DAILY, REQUEST_CODE_DAILY))
        cancelEvening(context)
    }

    private fun cancelEvening(context: Context) {
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        manager.cancel(pendingIntent(context, ACTION_EVENING, REQUEST_CODE_EVENING))
    }
}

/** Fires the notification and arms tomorrow's. */
class DailyReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action != DailyScheduler.ACTION_DAILY && action != DailyScheduler.ACTION_EVENING) return
        if (!Prefs.notifyEnabled(context)) return
        Notifier.showDaily(context)
        WidgetRefresh.all(context)
        DailyScheduler.schedule(context)
    }
}

/** Re-arm after reboot, timezone or clock changes so the daily time stays true. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_TIMEZONE_CHANGED,
            Intent.ACTION_TIME_CHANGED -> DailyScheduler.schedule(context)
        }
    }
}
package com.justincase.app.bridge

import android.Manifest
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequest
import androidx.work.WorkManager
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.justincase.app.core.HowToRepository
import com.justincase.app.core.Notifier
import com.justincase.app.core.Prefs
import com.justincase.app.notify.DailyScheduler
import com.justincase.app.widget.WidgetPinnedReceiver
import com.justincase.app.widget.WidgetRefresh
import com.justincase.app.widget.WidgetConfigActivity
import com.justincase.app.widget.WidgetRefreshWorker
import java.time.LocalDate
import java.util.concurrent.TimeUnit

private const val PERMISSION_ALIAS = "notifications"

/**
 * The one bridge surface the web layer talks to. Everything here is asset- and
 * SharedPreferences-backed so the widget, the notification and the Today screen
 * agree even before the WebView has ever run.
 */
@CapacitorPlugin(
    name = "WidgetBridge",
    permissions = [Permission(alias = PERMISSION_ALIAS, strings = [Manifest.permission.POST_NOTIFICATIONS])],
)
class WidgetBridgePlugin : Plugin() {

    @PluginMethod
    fun getToday(call: PluginCall) {
        val repo = HowToRepository(context)
        val entry = repo.today(Prefs.installSeed(context))
        call.resolve(
            JSObject()
                .put("id", entry.id)
                .put("slug", entry.slug)
                .put("epochDay", LocalDate.now().toEpochDay()),
        )
    }

    @PluginMethod
    fun getSettings(call: PluginCall) {
        val debug = (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
        call.resolve(
            JSObject()
                .put("notifyEnabled", Prefs.notifyEnabled(context))
                .put("notifyTime", Prefs.notifyTime(context))
                .put("notifyEvening", Prefs.notifyEvening(context))
                .put("notifyEveningTime", Prefs.notifyEveningTime(context))
                .put("theme", Prefs.theme(context))
                .put("palette", Prefs.palette(context))
                .put("debug", debug),
        )
    }

    @PluginMethod
    fun setSettings(call: PluginCall) {
        call.getBoolean("notifyEnabled")?.let { Prefs.saveNotifyEnabled(context, it) }
        call.getString("notifyTime")?.let { Prefs.saveNotifyTime(context, it) }
        call.getBoolean("notifyEvening")?.let { Prefs.saveNotifyEvening(context, it) }
        call.getString("notifyEveningTime")?.let { Prefs.saveNotifyEveningTime(context, it) }
        call.getString("theme")?.let { Prefs.saveTheme(context, it) }
        call.getString("palette")?.let { Prefs.savePalette(context, it) }

        if (Prefs.notifyEnabled(context)) {
            DailyScheduler.schedule(context)
            scheduleWidgetPeriodicRefresh(context)
        } else {
            DailyScheduler.cancel(context)
            cancelWidgetPeriodicRefresh(context)
        }
        WidgetRefresh.all(context)
        call.resolve()
    }

    @PluginMethod
    fun requestNotificationPermission(call: PluginCall) {
        val granted = NotificationManagerCompat.from(context).areNotificationsEnabled()
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            call.resolve(JSObject().put("granted", granted))
            return
        }
        when (getPermissionState(PERMISSION_ALIAS)) {
            PermissionState.GRANTED -> call.resolve(JSObject().put("granted", granted))
            PermissionState.DENIED -> {
                // Re-asking will not show a dialog anymore; send the user to the right screen.
                openNotificationSettings()
                call.resolve(JSObject().put("granted", granted))
            }
            else -> requestPermissionForAlias(PERMISSION_ALIAS, call, "notificationPermissionResult")
        }
    }

    @PermissionCallback
    fun notificationPermissionResult(call: PluginCall) {
        val granted = NotificationManagerCompat.from(context).areNotificationsEnabled()
        call.resolve(JSObject().put("granted", granted))
    }

    @PluginMethod
    fun scheduleDaily(call: PluginCall) {
        DailyScheduler.schedule(context)
        scheduleWidgetPeriodicRefresh(context)
        call.resolve()
    }

    @PluginMethod
    fun cancelDaily(call: PluginCall) {
        DailyScheduler.cancel(context)
        cancelWidgetPeriodicRefresh(context)
        call.resolve()
    }

    @PluginMethod
    fun refreshWidgets(call: PluginCall) {
        WidgetRefresh.all(context)
        call.resolve()
    }

    @PluginMethod
    fun openWidgetConfig(call: PluginCall) {
        // No widget id: this opens the "add a widget" flow for the chosen size.
        val size = call.getString("size") ?: "medium"
        val intent = Intent(context, WidgetConfigActivity::class.java)
            .putExtra(WidgetPinnedReceiver.EXTRA_WIDGET_SIZE, size)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val started = runCatching { context.startActivity(intent) }.isSuccess
        call.resolve(JSObject().put("opened", started))
    }

    @PluginMethod
    fun openBatterySettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { context.startActivity(intent) }
        call.resolve()
    }

    @PluginMethod
    fun getLaunchUrl(call: PluginCall) {
        val url = getActivity().intent?.dataString
        val result = JSObject()
        if (url != null) result.put("url", url)
        call.resolve(result)
    }

    @PluginMethod
    fun fireTestNotification(call: PluginCall) {
        Notifier.showDaily(context)
        call.resolve()
    }

    private fun scheduleWidgetPeriodicRefresh(context: Context) {
        val workRequest = PeriodicWorkRequest.Builder(WidgetRefreshWorker::class.java, WidgetRefreshWorker.INTERVAL_HOURS, TimeUnit.HOURS)
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            WidgetRefreshWorker.WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )
    }

    private fun cancelWidgetPeriodicRefresh(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(WidgetRefreshWorker.WORK_NAME)
    }

    private fun openNotificationSettings() {
        val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { context.startActivity(intent) }
    }

}
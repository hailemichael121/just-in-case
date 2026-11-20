package com.worstcase.app

import android.app.NotificationManager
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.worstcase.app.core.HowToRepository
import com.worstcase.app.core.Notifier
import com.worstcase.app.notify.DailyScheduler
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/** On-device smoke test: bundled assets, notification channel, alarm math. */
@RunWith(AndroidJUnit4::class)
class CoreSmokeTest {

    private val context: Context
        get() = ApplicationProvider.getApplicationContext()

    @Test
    fun contentAssetsAreBundled() {
        val repo = HowToRepository(context)
        assertEquals(40, repo.index.size)
        val entry = repo.bySlug("01-how-to-escape-from-quicksand")
        assertNotNull(entry)
        assertTrue(repo.stepHeadlines("01-how-to-escape-from-quicksand").isNotEmpty())
        val images = context.assets.list("content/images/01-how-to-escape-from-quicksand")
        assertNotNull(images)
        assertTrue(images!!.contains("01.png"))
        assertTrue(images.contains("01_w.png"))
    }

    @Test
    fun notificationChannelIsCreated() {
        Notifier.ensureChannel(context)
        val manager = context.getSystemService(NotificationManager::class.java)
        assertNotNull(manager.getNotificationChannel(Notifier.CHANNEL_ID))
    }

    @Test
    fun schedulerPicksNextOccurrence() {
        val tomorrow = DailyScheduler.nextTrigger("00:00")
        assertTrue("00:00 should be in the future", tomorrow > System.currentTimeMillis())
        assertTrue("00:00 should be within 24h", tomorrow - System.currentTimeMillis() <= 86_400_000L + 60_000L)
    }
}
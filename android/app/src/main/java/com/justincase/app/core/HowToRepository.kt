package com.justincase.app.core

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate

data class HowToSummary(
    val id: Int,
    val slug: String,
    val title: String,
    val chapter: String,
    val description: String,
    val thumbnail: String,
    val stepCount: Int,
    val imageCount: Int,
    val notifyTitle: String,
    val notifyBody: String,
)

/**
 * Reads the bundled content straight from assets, so widgets and notifications work
 * before the app has ever been opened since boot (no WebView involved).
 */
class HowToRepository(private val context: Context) {

    companion object {
        const val ROOT = "content"
    }

    val index: List<HowToSummary> by lazy { readIndex() }

    fun chapters(): List<String> = index.map { it.chapter }.distinct()

    fun bySlug(slug: String): HowToSummary? = index.firstOrNull { it.slug == slug }

    fun today(seed: Int, epochDay: Long = LocalDate.now().toEpochDay(), topic: String = "all"): HowToSummary {
        val pool = if (topic == "all") index else index.filter { it.chapter == topic }
        val usable = pool.ifEmpty { index }
        if (usable.isEmpty()) error("content index is empty")
        val id = DailyPicker.pick(usable.map { it.id }, seed, epochDay)
        return usable.first { it.id == id }
    }

    /** First few step headlines, used for the expanded notification and widget body. */
    fun stepHeadlines(slug: String, limit: Int = 3): List<String> {
        val content = full(slug)?.optJSONArray("content") ?: return emptyList()
        val headlines = mutableListOf<String>()
        for (i in 0 until content.length()) {
            val block = content.optJSONObject(i) ?: continue
            if (block.optString("type") == "step") {
                val headline = block.optString("headline").ifBlank {
                    block.optString("text").take(120)
                }
                if (headline.isNotBlank()) headlines.add(headline)
            }
            if (headlines.size >= limit) break
        }
        return headlines
    }

    fun full(slug: String): JSONObject? = runCatching {
        val text = context.assets.open("$ROOT/howtos/$slug.json").bufferedReader().use { it.readText() }
        JSONObject(text)
    }.getOrNull()

    /** "images/…/01_w.png" — the transparent, tinted variant for widget bitmaps. */
    fun widgetImagePath(thumbnail: String, variant: String = "_w.png"): String =
        "$ROOT/" + thumbnail.replace(Regex("\\.png$"), variant)

    private fun readIndex(): List<HowToSummary> = runCatching {
        val text = context.assets.open("$ROOT/index.json").bufferedReader().use { it.readText() }
        val array = JSONArray(text)
        buildList {
            for (i in 0 until array.length()) {
                val entry = array.getJSONObject(i)
                val notification = entry.optJSONObject("notification")
                add(
                    HowToSummary(
                        id = entry.getInt("id"),
                        slug = entry.getString("slug"),
                        title = entry.getString("title"),
                        chapter = entry.optString("chapter", ""),
                        description = entry.optString("short_description", ""),
                        thumbnail = entry.optString("thumbnail", ""),
                        stepCount = entry.optInt("step_count", 0),
                        imageCount = entry.optInt("image_count", 0),
                        notifyTitle = notification?.optString("title")?.ifBlank { null }
                            ?: entry.getString("title"),
                        notifyBody = notification?.optString("body") ?: entry.optString("short_description", ""),
                    ),
                )
            }
        }
    }.getOrElse { emptyList() }
}

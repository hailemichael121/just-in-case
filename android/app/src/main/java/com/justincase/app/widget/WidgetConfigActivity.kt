package com.justincase.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.RadioButton
import android.widget.RadioGroup
import android.text.TextUtils
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.justincase.app.R
import com.justincase.app.core.HowToRepository
import com.justincase.app.core.Prefs
import java.time.LocalDate

/**
 * Two jobs in one screen.
 *
 *  - Placed from the launcher: the system hands us a real widget id, so this is
 *    the per-widget settings sheet (size is fixed by the provider chosen).
 *  - Added from the app: there is no id yet, so the screen doubles as the
 *    "add widget" flow — pick a size, tune it, then Add asks the launcher to
 *    pin it with the chosen content / glass / text size / topic.
 */
class WidgetConfigActivity : AppCompatActivity() {

    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private lateinit var repo: HowToRepository

    private var content = "image_text"
    private var glass = "frosted"
    private var textSize = "medium"
    private var topic = "all"
    private var size = "medium"

    private val isNewWidget: Boolean
        get() = appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_widget_config)
        bind()
    }

    /** The launcher may reuse a visible instance for a different widget. */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        bind()
    }

    private fun bind() {
        appWidgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID,
        )
        content = "image_text"
        glass = "frosted"
        textSize = "medium"
        topic = "all"
        size = "medium"
        repo = HowToRepository(this)
        setResult(RESULT_CANCELED)

        if (isNewWidget) {
            size = intent?.getStringExtra(WidgetPinnedReceiver.EXTRA_WIDGET_SIZE) ?: "medium"
        } else {
            val saved = Prefs.widgetConfig(this, appWidgetId)
            content = when (saved.content) {
                "text", "image" -> saved.content
                else -> "image_text"
            }
            glass = when (saved.glass) {
                "clear", "smoked" -> saved.glass
                else -> "frosted"
            }
            textSize = saved.textSize
            topic = saved.topic
            size = detectSize()
        }

        val sizeGroup = findViewById<RadioGroup>(R.id.group_size)
        sizeGroup.visibility = if (isNewWidget) View.VISIBLE else View.GONE
        findViewById<View>(R.id.label_size).visibility = sizeGroup.visibility
        findViewById<TextView>(R.id.config_lede).setText(
            if (isNewWidget) R.string.widget_config_lede_new else R.string.widget_config_lede,
        )
        findViewById<View>(R.id.btn_done).setOnClickListener { commit() }
        findViewById<View>(R.id.btn_cancel).setOnClickListener { finish() }

        findViewById<TextView>(R.id.btn_done).text =
            getString(if (isNewWidget) R.string.widget_add_to_home else R.string.action_done)

        renderAll()
    }

    /** Which provider owns this id? Used only for the preview of a placed widget. */
    private fun detectSize(): String {
        val manager = AppWidgetManager.getInstance(this) ?: return "medium"
        return SIZES.firstOrNull { (_, provider) ->
            manager.getAppWidgetIds(ComponentName(this, provider)).contains(appWidgetId)
        }?.first ?: "medium"
    }

    private fun RadioGroup.chip(label: String, checked: Boolean, fill: Boolean = false, onSelect: () -> Unit) {
        val button = RadioButton(this@WidgetConfigActivity).apply {
            setText(label)
            setButtonDrawable(null)
            setBackgroundResource(R.drawable.chip_bg)
            setTextColor(ContextCompat.getColorStateList(context, R.color.chip_text))
            textSize = if (fill) 12.5f else 13.5f
            gravity = Gravity.CENTER
            setPadding(dp(if (fill) 4 else 14), dp(9), dp(if (fill) 4 else 14), dp(9))
            // Chips are one line, always: a wrapped word breaks the row height.
            setSingleLine(true)
            setMaxLines(1)
            setEllipsize(TextUtils.TruncateAt.END)
            isChecked = checked
            layoutParams = RadioGroup.LayoutParams(
                if (fill) 0 else android.view.ViewGroup.LayoutParams.WRAP_CONTENT,
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT,
                if (fill) 1f else 0f,
            ).apply { marginEnd = dp(6) }
            setOnClickListener { onSelect() }
        }
        addView(button)
    }

    private fun renderAll() {
        val sizeGroup = findViewById<RadioGroup>(R.id.group_size)
        sizeGroup.removeAllViews()
        listOf(
            getString(R.string.widget_size_small) to "small",
            getString(R.string.widget_size_medium) to "medium",
            getString(R.string.widget_size_large) to "large",
        ).forEach { (label, value) ->
            sizeGroup.chip(label, value == size) {
                size = value
                renderAll()
            }
        }

        val contentGroup = findViewById<RadioGroup>(R.id.group_content)
        contentGroup.removeAllViews()
        val contents = listOf(
            getString(R.string.widget_content_text) to "text",
            getString(R.string.widget_content_image_text) to "image_text",
            getString(R.string.widget_content_image) to "image",
        )
        contents.forEach { (label, value) ->
            contentGroup.chip(label, value == content) {
                content = value
                renderAll()
            }
        }

        val glassGroup = findViewById<RadioGroup>(R.id.group_glass)
        glassGroup.removeAllViews()
        val glasses = listOf(
            getString(R.string.widget_glass_clear) to "clear",
            getString(R.string.widget_glass_frosted) to "frosted",
            getString(R.string.widget_glass_smoked) to "smoked",
        )
        glasses.forEach { (label, value) ->
            glassGroup.chip(label, value == glass) {
                glass = value
                renderAll()
            }
        }

        val textGroup = findViewById<RadioGroup>(R.id.group_text)
        textGroup.removeAllViews()
        val sizes = listOf(
            getString(R.string.widget_text_small) to "small",
            getString(R.string.widget_text_medium) to "medium",
            getString(R.string.widget_text_large) to "large",
        )
        sizes.forEach { (label, value) ->
            textGroup.chip(label, value == textSize) {
                textSize = value
                renderAll()
            }
        }

        val topicGroup = findViewById<RadioGroup>(R.id.group_topic)
        topicGroup.removeAllViews()
        val topics = listOf(getString(R.string.widget_topic_all)) + repo.chapters()
        topics.forEach { chapter ->
            val value = if (chapter == getString(R.string.widget_topic_all)) "all" else chapter
            topicGroup.chip(chapter, value == topic) {
                topic = value
                renderAll()
            }
        }

        renderPreview()
    }

    private fun layoutFor(widgetSize: String): Int = when (widgetSize) {
        "small" -> R.layout.widget_small
        "large" -> R.layout.widget_large
        else -> R.layout.widget_medium
    }

    private fun renderPreview() {
        val container = findViewById<FrameLayout>(R.id.preview_container)
        container.removeAllViews()

        val preview = layoutInflater.inflate(layoutFor(size), container, false)
        // The preview is drawn at the shape the launcher will give it, not
        // stretched to whatever the frame happens to be: 2x2, 4x2 or 4x4.
        val available =
            resources.displayMetrics.widthPixels -
                dp(44) - // activity padding
                dp(28) // preview frame padding
        preview.layoutParams = when (size) {
            "small" -> FrameLayout.LayoutParams(dp(158), dp(158), Gravity.CENTER)
            "medium" -> FrameLayout.LayoutParams(available, available / 2, Gravity.CENTER)
            else -> FrameLayout.LayoutParams(available, available, Gravity.CENTER)
        }
        container.addView(preview)

        val entry = repo.today(Prefs.installSeed(this), LocalDate.now().toEpochDay(), topic)
        val scale = WidgetRendering.textScale(textSize)
        val showImage = content != "text"
        val showText = content != "image"

        preview.findViewById<View>(R.id.widget_root)
            .setBackgroundResource(WidgetRendering.glassRes(glass))

        preview.findViewById<TextView>(R.id.widget_brand)?.setTextColor(WidgetRendering.bodyColor(glass))

        preview.findViewById<TextView>(R.id.widget_title)?.apply {
            text = entry.title
            setTextColor(WidgetRendering.titleColor(glass))
            setTextSize(
                TypedValue.COMPLEX_UNIT_PX,
                titleBasePx() * scale,
            )
            visibility = if (showText) View.VISIBLE else View.GONE
        }

        preview.findViewById<TextView>(R.id.widget_body)?.apply {
            text = WidgetRendering.truncate(entry.description, 130)
            setTextColor(WidgetRendering.bodyColor(glass))
            setTextSize(
                TypedValue.COMPLEX_UNIT_PX,
                resources.getDimension(R.dimen.widget_body) * scale,
            )
            visibility = if (showText) View.VISIBLE else View.GONE
        }

        val image = preview.findViewById<ImageView>(R.id.widget_image)
        val bitmap = WidgetRendering.loadBitmap(
            this,
            repo.widgetImagePath(entry.thumbnail, WidgetRendering.imageVariant(glass)),
            if (size == "large") 480 else 240,
        )
        if (bitmap != null) image.setImageBitmap(bitmap)
        image?.visibility = if (showImage && bitmap != null) View.VISIBLE else View.GONE
    }

    private fun titleBasePx(): Float = when (size) {
        "small" -> resources.getDimension(R.dimen.widget_title_small)
        "large" -> resources.getDimension(R.dimen.widget_title_large)
        else -> resources.getDimension(R.dimen.widget_title_medium)
    }

    private fun config(): Prefs.WidgetConfig =
        Prefs.WidgetConfig(content = content, glass = glass, textSize = textSize, topic = topic)

    private fun commit() {
        if (isNewWidget) {
            pinNewWidget()
            return
        }
        Prefs.saveWidgetConfig(this, appWidgetId, config())
        WidgetRefresh.all(this)
        setResult(
            RESULT_OK,
            Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId),
        )
        finish()
    }

    private fun pinNewWidget() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            Toast.makeText(this, R.string.widget_pin_unsupported, Toast.LENGTH_LONG).show()
            return
        }
        val manager = AppWidgetManager.getInstance(this)
        if (manager == null) {
            Toast.makeText(this, R.string.widget_pin_unavailable, Toast.LENGTH_LONG).show()
            return
        }

        val callback = PendingIntent.getBroadcast(
            this,
            0,
            Intent(this, WidgetPinnedReceiver::class.java).apply {
                putExtra(WidgetPinnedReceiver.EXTRA_WIDGET_SIZE, size)
                putExtra(WidgetPinnedReceiver.EXTRA_CONTENT, content)
                putExtra(WidgetPinnedReceiver.EXTRA_GLASS, glass)
                putExtra(WidgetPinnedReceiver.EXTRA_TEXT_SIZE, textSize)
                putExtra(WidgetPinnedReceiver.EXTRA_TOPIC, topic)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        // Park the choices first: the launcher can place the widget (and fire the
        // provider's update) before requestPinAppWidget even returns.
        Prefs.savePendingWidgetConfig(this, size, config())

        val requested = runCatching {
            manager.requestPinAppWidget(
                ComponentName(this, providerClass(size)),
                Bundle(),
                callback,
            )
        }.getOrDefault(false)

        if (requested) {
            // The system showed the pin dialog (user may accept or cancel)
            Toast.makeText(this, R.string.widget_pin_prompt, Toast.LENGTH_SHORT).show()
        } else {
            // requestPinAppWidget returned false — either the launcher doesn't support
            // pinning, or the user previously cancelled and the system is suppressing the dialog.
            // Keep the pending config so the user can retry, and guide them to manual add.
            Toast.makeText(this, R.string.widget_pin_fallback, Toast.LENGTH_LONG).show()
            openWidgetPicker()
        }
        setResult(RESULT_OK)
        finish()
    }

    /** Opens the system widget picker as a fallback so the user can drag the widget manually. */
    private fun openWidgetPicker() {
        val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_PICK).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_PROVIDER, ComponentName(this@WidgetConfigActivity, providerClass(size)))
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        // Some launchers support this; if not, the user will have to long-press home screen.
        runCatching { startActivity(intent) }
    }

    companion object {
        private val SIZES = listOf(
            "small" to SmallWidgetProvider::class.java,
            "medium" to MediumWidgetProvider::class.java,
            "large" to LargeWidgetProvider::class.java,
        )

        private fun providerClass(widgetSize: String): Class<*> =
            SIZES.firstOrNull { it.first == widgetSize }?.second ?: MediumWidgetProvider::class.java
    }
}
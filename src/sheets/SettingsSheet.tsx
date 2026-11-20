import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight } from 'lucide-react'
import { Sheet } from '../ui/Sheet'
import { isNative, notifications, type NativeSettings } from '../lib/native'
import { tap } from '../lib/haptics'
import type { Palette, Theme } from '../lib/types'
import { TimePickerSheet } from './TimePickerSheet'

interface SettingsSheetProps {
  open: boolean
  settings: NativeSettings
  debug: boolean
  onChange: (next: NativeSettings) => void
  onClose: () => void
  onOpenWidgets: () => void
}

const THEMES: { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'charcoal', label: 'Charcoal' },
  { value: 'dracula', label: 'Dracula' },
]

const PALETTES: { value: Palette; label: string; hint: string }[] = [
  { value: 'mint', label: 'Mint', hint: 'The original sea-glass green.' },
  { value: 'liquid', label: 'Liquid', hint: 'Clearer glass, same green light.' },
  { value: 'charcoal', label: 'Charcoal', hint: 'Cool graphite greys, no green.' },
  { value: 'dracula', label: 'Dracula', hint: 'Rich purple on dark charcoal.' },
]

function formatTime12h(time24: string): string {
  const [h, m] = (time24 || '08:00').split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '—'
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export function SettingsSheet({
  open,
  settings,
  debug,
  onChange,
  onClose,
  onOpenWidgets,
}: SettingsSheetProps) {
  const [hint, setHint] = useState<string | null>(null)
  const [showAbout, setShowAbout] = useState(false)
  const [timePickerOpen, setTimePickerOpen] = useState<'morning' | 'evening' | null>(null)

  const toggleNotifications = async () => {
    tap()
    if (settings.notifyEnabled) {
      onChange({ ...settings, notifyEnabled: false })
      setHint(null)
      return
    }
    const granted = await notifications.requestPermission()
    if (!granted) {
      setHint('Notifications are off for this app in system settings.')
      return
    }
    setHint(null)
    onChange({ ...settings, notifyEnabled: true })
  }

  const addWidget = () => {
    tap()
    onOpenWidgets()
  }

  return (
    <Sheet open={open} title="Settings" onClose={onClose}>
      <h2 className="sheet__title">Settings</h2>

      <div className="setting setting--block">
        <div className="setting__label">Theme</div>
        <div className="segmented" role="group" aria-label="Theme">
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              aria-pressed={settings.theme === theme.value}
              onClick={() => {
                tap()
                onChange({ ...settings, theme: theme.value })
              }}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      <div className="setting setting--block">
        <div className="setting__label">Color</div>
        <div className="swatches" role="group" aria-label="Color">
          {PALETTES.map((palette) => (
            <button
              key={palette.value}
              className={`swatch ${settings.palette === palette.value ? 'swatch--on' : ''}`}
              aria-pressed={settings.palette === palette.value}
              onClick={() => {
                tap()
                onChange({ ...settings, palette: palette.value })
              }}
            >
              <span className={`swatch__chip swatch__chip--${palette.value}`} aria-hidden="true" />
              <span className="swatch__label">{palette.label}</span>
            </button>
          ))}
        </div>
        <p className="setting__hint setting__hint--palette">
          {PALETTES.find((palette) => palette.value === settings.palette)?.hint} The home-screen
          widget follows along.
        </p>
      </div>

      <button className="setting" onClick={addWidget}>
        <span className="setting__text">
          <span className="setting__label">Widget</span>
          <span className="setting__hint">
            {isNative ? 'Three sizes, and how to add each one.' : 'Sizes and a guide — Android app.'}
          </span>
        </span>
        <ChevronRight size={16} className="muted" aria-hidden="true" />
      </button>

      {isNative && (
        <button
          className="setting"
          onClick={() => {
            tap()
            void notifications.openBatterySettings()
          }}
        >
          <span className="setting__text">
            <span className="setting__label">Keep it on time</span>
            <span className="setting__hint">
              If the notification is late, allow the app to run in the background.
            </span>
          </span>
          <ChevronRight size={16} className="muted" aria-hidden="true" />
        </button>
      )}

      <button className="setting" onClick={() => setShowAbout((value) => !value)}>
        <span className="setting__text">
          <span className="setting__label">About & safety</span>
        </span>
        <ChevronRight
          size={16}
          className="muted"
          aria-hidden="true"
          style={{ transform: showAbout ? 'rotate(90deg)' : 'none', transition: 'transform 220ms' }}
        />
      </button>

      {showAbout && (
        <p className="setting__hint setting__hint--about">
          A daily survival how-to from <em>The Worst-Case Scenario Survival Handbook</em>.
          Private, offline, no accounts.
        </p>
      )}

      <div className="setting setting--block">
        <div className="setting__label">Notifications</div>

        <button className="setting" onClick={toggleNotifications} aria-pressed={settings.notifyEnabled}>
          <span className="setting__text">
            <span className="setting__label">Daily notification</span>
            {hint && <span className="setting__hint">{hint}</span>}
          </span>
          <span className={`toggle ${settings.notifyEnabled ? 'toggle--on' : ''}`} aria-hidden="true" />
        </button>

        {settings.notifyEnabled && (
          <button className="setting" onClick={() => {
            tap()
            setTimePickerOpen('morning')
          }}>
            <span className="setting__text">
              <span className="setting__label">Morning time</span>
              <span className="setting__hint">One how-to, once a day.</span>
            </span>
            <span className="setting__value">{formatTime12h(settings.notifyTime)}</span>
            <ChevronRight size={16} className="muted" aria-hidden="true" />
          </button>
        )}

        {settings.notifyEnabled && (
          <button className="setting" onClick={() => {
            tap()
            onChange({ ...settings, notifyEvening: !settings.notifyEvening })
          }} aria-pressed={settings.notifyEvening}>
            <span className="setting__text">
              <span className="setting__label">Evening reminder</span>
              <span className="setting__hint">A second how-to in the evening.</span>
            </span>
            <span className={`toggle ${settings.notifyEvening ? 'toggle--on' : ''}`} aria-hidden="true" />
          </button>
        )}

        {settings.notifyEnabled && settings.notifyEvening && (
          <button className="setting" onClick={() => {
            tap()
            setTimePickerOpen('evening')
          }}>
            <span className="setting__text">
              <span className="setting__label">Evening time</span>
              <span className="setting__hint">When to send the evening how-to.</span>
            </span>
            <span className="setting__value">{formatTime12h(settings.notifyEveningTime)}</span>
            <ChevronRight size={16} className="muted" aria-hidden="true" />
          </button>
        )}

      </div>

      {debug && (
        <button
          className="setting"
          onClick={() => {
            void notifications.fireTest()
          }}
        >
          <span className="setting__text">
            <span className="setting__label">Fire notification now</span>
            <span className="setting__hint">Debug builds only.</span>
          </span>
        </button>
      )}

      {timePickerOpen &&
        createPortal(
          <TimePickerSheet
            open={true}
            title={timePickerOpen === 'morning' ? 'Morning notification' : 'Evening notification'}
            value={timePickerOpen === 'morning' ? settings.notifyTime : settings.notifyEveningTime}
            onChange={(value) => onChange({
              ...settings,
              [timePickerOpen === 'morning' ? 'notifyTime' : 'notifyEveningTime']: value
            })}
            onClose={() => setTimePickerOpen(null)}
          />,
          document.body,
        )}

      <div className="sheet__actions">
        <button className="btn btn--primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Sheet>
  )
}

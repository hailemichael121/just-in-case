import { Bell, BookOpen, LayoutGrid } from 'lucide-react'
import { Sheet } from '../ui/Sheet'
import { notifications, widget } from '../lib/native'

interface OnboardingSheetProps {
  open: boolean
  onDone: () => void
  onEnableNotifications: () => void
}

export function OnboardingSheet({ open, onDone, onEnableNotifications }: OnboardingSheetProps) {
  return (
    <Sheet open={open} title="One how-to a day" onClose={onDone}>
      <h2 className="sheet__title">One how-to a day.</h2>
      <p className="sheet__lede">Small, useful, occasionally absurd. Offline, forever.</p>

      <div className="onboard__lines">
        <div className="onboard__line">
          <BookOpen size={18} aria-hidden="true" />
          <span>40 survival techniques, one per day, never repeated until the deck runs out.</span>
        </div>
        <div className="onboard__line">
          <Bell size={18} aria-hidden="true" />
          <span>A quiet reminder in the morning — optional, off by default.</span>
        </div>
        <div className="onboard__line">
          <LayoutGrid size={18} aria-hidden="true" />
          <span>Or keep it on the home screen as a glass widget.</span>
        </div>
      </div>

      <div className="sheet__actions">
        <button
          className="btn btn--primary"
          onClick={async () => {
            const granted = await notifications.requestPermission()
            if (granted) onEnableNotifications()
            onDone()
          }}
        >
          Enable notifications
        </button>
        <button
          className="btn btn--ghost"
          onClick={async () => {
            await widget.openConfig('medium')
            onDone()
          }}
        >
          Add widget
        </button>
        <button
          className="btn btn--ghost"
          style={{ borderColor: 'transparent', color: 'var(--text-faint)' }}
          onClick={onDone}
        >
          Skip
        </button>
      </div>
    </Sheet>
  )
}

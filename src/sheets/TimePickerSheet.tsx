import { useEffect, useRef, useState } from 'react'
import { Sheet } from '../ui/Sheet'
import { tap } from '../lib/haptics'

interface TimePickerSheetProps {
  open: boolean
  title: string
  value: string
  onChange: (value: string) => void
  onClose: () => void
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const PERIODS = ['AM', 'PM']

const ITEM_HEIGHT = 48
const PERSPECTIVE = 800
const ROTATE_X = 18

function Drum({ items, selectedIndex, onSelect }: { items: string[]; selectedIndex: number; onSelect: (index: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollToIndex = (index: number) => {
    const container = containerRef.current
    if (!container) return
    const offset = (index - 2) * ITEM_HEIGHT
    container.scrollTo({ top: offset, behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToIndex(selectedIndex)
  }, [selectedIndex])

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 1 : -1
    const newIndex = Math.max(0, Math.min(items.length - 1, selectedIndex + delta))
    onSelect(newIndex)
  }

  const handleTouchStart = (_e: React.TouchEvent<HTMLDivElement>) => {
    // Touch handling could be expanded for drag-to-scroll
  }

  return (
    <div
      ref={containerRef}
      className="time-drum"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      style={{ perspective: PERSPECTIVE }}
    >
      <div className="time-drum__mask" />
      <div
        className="time-drum__items"
        style={{
          transform: `translateY(${(2 - selectedIndex) * ITEM_HEIGHT}px)`,
        }}
      >
        {items.map((item, index) => (
          <div
            key={item}
            className={`time-drum__item ${index === selectedIndex ? 'time-drum__item--selected' : ''}`}
            style={{
              height: ITEM_HEIGHT,
              lineHeight: `${ITEM_HEIGHT}px`,
              transform: `rotateX(${index === selectedIndex ? 0 : index < selectedIndex ? ROTATE_X : -ROTATE_X}deg)`,
            }}
          >
            {item}
          </div>
        ))}
      </div>
      <div className="time-drum__mask time-drum__mask--bottom" />
    </div>
  )
}

export function TimePickerSheet({ open, title, value, onChange, onClose }: TimePickerSheetProps) {
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(0)
  const [period, setPeriod] = useState(0)

  useEffect(() => {
    if (!open) return
    // Values are stored as 24h "HH:mm", not as a 12h string.
    const [h, m] = (value || '08:00').split(':').map(Number)
    if (!Number.isFinite(h) || !Number.isFinite(m)) return
    setHours(Math.max(0, HOURS.indexOf(String(h % 12 || 12).padStart(2, '0'))))
    setMinutes(Math.max(0, MINUTES.indexOf(String(m).padStart(2, '0'))))
    setPeriod(h >= 12 ? 1 : 0)
  }, [open, value])

  const formatValue = () => {
    const h = parseInt(HOURS[hours], 10)
    const m = parseInt(MINUTES[minutes], 10)
    const p = PERIODS[period]
    const hour24 = p === 'PM' && h !== 12 ? h + 12 : p === 'AM' && h === 12 ? 0 : h
    return `${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const handleChange = () => {
    tap()
    onChange(formatValue())
  }

  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <div className="time-picker">
        <div className="time-picker__drums">
          <Drum items={HOURS} selectedIndex={hours} onSelect={setHours} />
          <div className="time-picker__separator" aria-hidden="true">:</div>
          <Drum items={MINUTES} selectedIndex={minutes} onSelect={setMinutes} />
          <Drum items={PERIODS} selectedIndex={period} onSelect={setPeriod} />
        </div>
        <div className="time-picker__actions">
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={() => { handleChange(); onClose() }}>
            Set
          </button>
        </div>
      </div>
    </Sheet>
  )
}
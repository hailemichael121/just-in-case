import { Sheet } from '../ui/Sheet'
import { Widgets } from '../screens/Widgets'
import type { IndexEntry } from '../lib/types'

interface WidgetsSheetProps {
  open: boolean
  index: IndexEntry[] | null
  onClose: () => void
  onOpen: (slug: string) => void
}

export function WidgetsSheet({ open, index, onClose, onOpen }: WidgetsSheetProps) {
  return (
    <Sheet open={open} title="Home screen widgets" onClose={onClose}>
      <Widgets index={index} onBack={onClose} onOpen={onOpen} embedded />
    </Sheet>
  )
}
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

/** Light tap on press. Silent no-op on the web. */
export function tap(): void {
  if (!Capacitor.isNativePlatform()) return
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined)
}

/** Stronger impact for swipe threshold / "bend" feedback. */
export function heavy(): void {
  if (!Capacitor.isNativePlatform()) return
  void Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => undefined)
}

export function select(): void {
  if (!Capacitor.isNativePlatform()) return
  void Haptics.selectionChanged().catch(() => undefined)
}

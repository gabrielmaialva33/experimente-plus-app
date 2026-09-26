import { useEffect } from 'react'
import { AccessibilityInfo, Platform } from 'react-native'

/**
 * Says a message to a screen reader, once, on both platforms.
 *
 * For what appears after an action — an error under a form, a confirmation, a
 * result — that the person did not move to and would otherwise never hear. It
 * does nothing when no screen reader is running.
 */
export function announce(message: string) {
  AccessibilityInfo.announceForAccessibility(message)
}

/**
 * Announces `message` whenever it appears or changes; nothing while it is empty.
 *
 * A message mounted in answer to an action is announced here, and the element
 * that shows it carries no live region: a live region is not reliably spoken
 * when it first mounts, iOS has none, and one that did speak would say the same
 * words twice. Where a live region is already on screen and only its content
 * changes, Android speaks it by itself: pass `spokenByLiveRegion` and only iOS
 * is told.
 */
export function useAnnouncement(
  message: string | null | undefined | false,
  { spokenByLiveRegion = false }: { spokenByLiveRegion?: boolean } = {}
) {
  useEffect(() => {
    if (!message) return
    if (spokenByLiveRegion && Platform.OS !== 'ios') return
    announce(message)
  }, [message, spokenByLiveRegion])
}

import { useEffect } from 'react'
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native'

import { useAnnouncement } from '@/components/announce'
import { useLineCap } from '@/theme/font-scale'
import { minTouch, radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * A short confirmation that something was removed, with the way back (audit
 * A57): removal is one tap, so undoing it must be one tap too. It leaves on its
 * own after a few seconds; the parent places it, usually over the list's foot.
 *
 * Those seconds are the person's, not the design's (WCAG 2.2.1): Android's
 * "time to take action" setting stretches them, and with a screen reader on
 * the bar stays until it is used or replaced — reaching "Desfazer" by swiping
 * takes longer than any fixed delay.
 */
export function UndoBar({
  message,
  onUndo,
  onDismiss,
  duration = 8000,
}: {
  message: string
  onUndo: () => void
  onDismiss: () => void
  duration?: number
}) {
  const colors = useColors()
  const lines = useLineCap(2)
  // Said once when it appears; the button beside it stays reachable.
  useAnnouncement(message)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const leave = (after: number) => {
      if (!cancelled) timer = setTimeout(onDismiss, after)
    }
    Promise.all([
      AccessibilityInfo.isScreenReaderEnabled(),
      AccessibilityInfo.getRecommendedTimeoutMillis(duration),
    ])
      .then(([reading, recommended]) => {
        if (reading) return
        leave(typeof recommended === 'number' && recommended > duration ? recommended : duration)
      })
      .catch(() => leave(duration))
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [message, onDismiss, duration])

  return (
    <View testID="undo-bar" style={[styles.bar, { backgroundColor: colors.chrome }]}>
      <Text
        accessibilityRole="alert"
        numberOfLines={lines}
        style={[styles.message, { color: colors.chromeForeground }]}
      >
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Desfazer"
        onPress={onUndo}
        hitSlop={4}
        style={styles.action}
      >
        <Text style={[styles.actionLabel, { color: colors.chromeMuted }]}>Desfazer</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    borderRadius: radius.thumb,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 52,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  message: { ...typography.meta, flex: 1 },
  action: { justifyContent: 'center', minHeight: minTouch, paddingHorizontal: spacing.md },
  actionLabel: { ...typography.label, ...textWeight('700') },
})

import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { minTouch, radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * A short confirmation that something was removed, with the way back (audit
 * A57): removal is one tap, so undoing it must be one tap too. It leaves on its
 * own after a few seconds; the parent places it, usually over the list's foot.
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

  useEffect(() => {
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [message, onDismiss, duration])

  return (
    <View testID="undo-bar" style={[styles.bar, { backgroundColor: colors.chrome }]}>
      {/* The message is announced on its own; the button beside it stays reachable. */}
      <Text
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        numberOfLines={2}
        style={[styles.message, { color: colors.chromeForeground }]}>
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Desfazer"
        onPress={onUndo}
        hitSlop={4}
        style={styles.action}>
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

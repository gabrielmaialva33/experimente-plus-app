import { Pressable, StyleSheet, Text, View } from 'react-native'

import { minTouch, radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * A filter of direction A: a 44-unit pill that fills with the brand when on.
 * Selection keeps its fixed leading slot, so it never depends on color alone,
 * and the border width never changes, so the label never moves.
 */
export function Chip({
  label,
  selected = false,
  maxWidth,
  onPress,
}: {
  label: string
  selected?: boolean
  maxWidth?: number
  onPress: () => void
}) {
  const colors = useColors()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        maxWidth != null && { maxWidth },
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.choiceBorder,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View style={styles.indicator} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {selected ? <Text style={[styles.check, { color: colors.primaryForeground }]}>✓</Text> : null}
      </View>
      <Text
        style={[
          styles.label,
          selected ? textWeight('700') : textWeight('500'),
          { color: selected ? colors.primaryForeground : colors.foreground },
        ]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    flexShrink: 0,
    gap: spacing.xs,
    maxWidth: '100%',
    minHeight: minTouch,
    minWidth: minTouch,
    paddingLeft: spacing.sm + 2,
    paddingRight: spacing.lg,
  },
  indicator: { alignItems: 'center', flexShrink: 0, justifyContent: 'center', width: 16 },
  check: { ...typography.label, ...textWeight('700') },
  label: { ...typography.label, flexShrink: 1, minWidth: 0 },
})

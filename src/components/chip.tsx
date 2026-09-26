import { Pressable, StyleSheet, Text, View } from 'react-native'

import { minTouch, radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * A filter of direction A: a 44-unit pill that fills with the brand when on.
 * A selected chip also shows a check, so selection never depends on color
 * alone. The check takes the room of the start padding only while it is
 * there: an unselected chip keeps even padding instead of an empty slot.
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
        selected && styles.chipSelected,
        maxWidth != null && { maxWidth },
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.choiceBorder,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {selected ? (
        <View
          style={styles.indicator}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={[styles.check, { color: colors.primaryForeground }]}>✓</Text>
        </View>
      ) : null}
      <Text
        style={[
          styles.label,
          selected ? textWeight('700') : textWeight('500'),
          { color: selected ? colors.primaryForeground : colors.foreground },
        ]}
      >
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
    paddingHorizontal: spacing.lg,
  },
  chipSelected: { paddingLeft: spacing.sm + 2 },
  indicator: { alignItems: 'center', flexShrink: 0, justifyContent: 'center', width: 16 },
  check: { ...typography.label, ...textWeight('700') },
  label: { ...typography.label, flexShrink: 1, minWidth: 0 },
})

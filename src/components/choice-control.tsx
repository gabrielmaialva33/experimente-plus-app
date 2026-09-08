import { Pressable, StyleSheet, Text, View } from 'react-native'

import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

interface ChoiceControlProps {
  label: string
  selected?: boolean
  disabled?: boolean
  shape?: 'pill' | 'tab' | 'segment'
  accessibilityLabel?: string
  role?: 'button' | 'radio' | 'checkbox'
  maxWidth?: number
  fill?: boolean
  compact?: boolean
  onPress: () => void
}

/** Selection has a fixed leading slot, so it never depends on color alone. */
export function ChoiceControl({ label, selected = false, disabled = false, shape = 'pill', accessibilityLabel = label, role = 'button', maxWidth, fill = false, compact = false, onPress }: ChoiceControlProps) {
  const colors = useColors()
  const borderWidth = selected ? 2 : StyleSheet.hairlineWidth

  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled, ...(role !== 'button' ? { checked: selected } : {}) }}
      disabled={disabled}
      // The row reserves this space: 40 visible units, at least 48 for touch.
      hitSlop={compact ? { top: spacing.xs, bottom: spacing.xs } : undefined}
      onPress={onPress}
      style={[
        styles.chip,
        compact && styles.compact,
        fill && styles.fill,
        maxWidth != null && { maxWidth },
        { borderRadius: shape === 'pill' ? radius.pill : shape === 'tab' ? radius.sm : radius.md },
        {
          borderWidth,
          // Reserve the same total inset when the selection outline gets stronger.
          paddingHorizontal: (compact ? spacing.sm : spacing.md) - borderWidth,
          paddingVertical: spacing.sm - borderWidth,
          opacity: disabled ? 0.5 : 1,
          backgroundColor: selected ? colors.choiceSelected : colors.choiceBackground,
          borderColor: selected ? colors.choiceSelectedBorder : colors.choiceBorder,
        },
      ]}>
      <View style={styles.indicator} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {selected ? <Text style={[styles.label, { color: colors.choiceSelectedForeground }]}>✓</Text> : null}
      </View>
      <Text
        style={[
          styles.label,
          { color: selected ? colors.choiceSelectedForeground : colors.choiceForeground, fontWeight: selected ? '700' : '500' },
        ]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 48,
    minWidth: 48,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
  },
  compact: { minHeight: 40 },
  fill: { flexGrow: 1, flexBasis: 0, minWidth: 0, justifyContent: 'center' },
  indicator: { width: 16, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.caption, fontWeight: '600', flexShrink: 1, minWidth: 0 },
})

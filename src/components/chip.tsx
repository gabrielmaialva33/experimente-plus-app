import { Pressable, StyleSheet, Text } from 'react-native'

import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

interface ChipProps {
  label: string
  selected?: boolean
  onPress: () => void
}

/** Full radius, per the two-position scale in `theme/tokens`. */
export function Chip({ label, selected = false, onPress }: ChipProps) {
  const colors = useColors()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}>
      <Text
        style={[
          styles.label,
          { color: selected ? colors.primaryForeground : colors.mutedForeground },
        ]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  label: { ...typography.caption, fontWeight: '600' },
})

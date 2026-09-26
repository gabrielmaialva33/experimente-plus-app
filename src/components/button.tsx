import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, StyleSheet, Text } from 'react-native'

import { radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export type ButtonVariant = 'primary' | 'cta' | 'outline' | 'ghost'

interface ButtonProps {
  label: string
  onPress: () => void
  /** `cta` is only for conversion; `primary` is the neutral main action. */
  variant?: ButtonVariant
  size?: 44 | 48 | 52
  icon?: keyof typeof Ionicons.glyphMap
  disabled?: boolean
  accessibilityLabel?: string
  /** Grows to the width its row gives it. */
  fill?: boolean
  /** Sits in the middle of a centred column, such as an empty state. */
  centered?: boolean
  testID?: string
}

/**
 * The pill button of direction A. A disabled button keeps its shape and a
 * readable label (audit A51), so it never reads as plain text.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 48,
  icon,
  disabled = false,
  accessibilityLabel,
  fill = false,
  centered = false,
  testID,
}: ButtonProps) {
  const colors = useColors()
  const tone = disabled
    ? variant === 'ghost'
      ? { background: 'transparent', border: 'transparent', foreground: colors.mutedForeground }
      : { background: colors.muted, border: colors.muted, foreground: colors.mutedForeground }
    : {
        primary: { background: colors.primary, border: colors.primary, foreground: colors.primaryForeground },
        cta: { background: colors.cta, border: colors.cta, foreground: colors.ctaForeground },
        outline: { background: 'transparent', border: colors.primary, foreground: colors.primary },
        ghost: { background: 'transparent', border: 'transparent', foreground: colors.primary },
      }[variant]

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        fill && styles.fill,
        centered && styles.centered,
        {
          minHeight: size,
          // A ghost has no surface to pad: its label lines up with the column it sits in.
          paddingHorizontal: variant === 'ghost' ? spacing.xs : size === 52 ? spacing.xl : size === 44 ? spacing.lg : spacing.gutter,
          backgroundColor: tone.background,
          borderColor: tone.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      {icon ? <Ionicons name={icon} size={20} color={tone.foreground} /> : null}
      <Text
        numberOfLines={1}
        style={[styles.label, size === 52 && styles.large, { color: tone.foreground }]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  fill: { alignSelf: 'stretch', flexGrow: 1 },
  centered: { alignSelf: 'center' },
  label: { ...typography.label, ...textWeight('700'), flexShrink: 1 },
  large: { fontSize: 16 },
})

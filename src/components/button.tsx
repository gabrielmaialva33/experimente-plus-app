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
  /** Where the button sits across a column: the start by default, the middle of an
   * empty state, or the end, as a secondary link under a field. Ignored with `fill`. */
  align?: 'start' | 'center' | 'end'
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
  align = 'start',
  testID,
}: ButtonProps) {
  const colors = useColors()
  const tone = disabled
    ? variant === 'ghost'
      ? { background: 'transparent', border: 'transparent', foreground: colors.mutedForeground }
      : // The border keeps the pill visible where `muted` is close to the surface (a card in dark mode).
        { background: colors.muted, border: colors.border, foreground: colors.mutedForeground }
    : {
        primary: {
          background: colors.primary,
          border: colors.primary,
          foreground: colors.primaryForeground,
        },
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
        align === 'center' && styles.center,
        align === 'end' && styles.end,
        {
          minHeight: size,
          // A ghost has no surface to pad: its label lines up with the column it sits in.
          paddingHorizontal:
            variant === 'ghost'
              ? spacing.xs
              : size === 52
                ? spacing.xl
                : size === 44
                  ? spacing.lg
                  : spacing.gutter,
          backgroundColor: tone.background,
          borderColor: tone.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={20} color={tone.foreground} /> : null}
      <Text
        numberOfLines={1}
        style={[styles.label, size === 52 && styles.large, { color: tone.foreground }]}
      >
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
  center: { alignSelf: 'center' },
  end: { alignSelf: 'flex-end' },
  label: { ...typography.label, ...textWeight('700'), flexShrink: 1 },
  large: { fontSize: 16 },
})

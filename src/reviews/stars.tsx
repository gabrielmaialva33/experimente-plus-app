import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

const STARS = [1, 2, 3, 4, 5] as const

/**
 * A rating read aloud is a number, not a row of icons.
 *
 * The icons are hidden from assistive technology and the whole row carries a
 * single label, so a screen reader says "4 de 5" instead of five separate
 * star images.
 */
export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  const colors = useColors()

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${rating} de 5`}
      style={styles.row}
      testID="review-stars">
      {STARS.map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={size}
          color={star <= rating ? colors.warning : colors.mutedForeground}
          accessible={false}
        />
      ))}
    </View>
  )
}

const RATING_LABELS: Record<number, string> = {
  1: 'Ruim',
  2: 'Fraco',
  3: 'Regular',
  4: 'Bom',
  5: 'Ótimo',
}

/** The same row, answering touch. Each star is its own 48pt target. */
export function StarsInput({
  rating,
  onChange,
  disabled,
}: {
  rating: number
  onChange: (rating: number) => void
  disabled?: boolean
}) {
  const colors = useColors()

  return (
    <View style={styles.input}>
      <View style={styles.row}>
        {STARS.map((star) => (
          <Pressable
            key={star}
            accessibilityRole="radio"
            accessibilityState={{ selected: star === rating, disabled: Boolean(disabled) }}
            accessibilityLabel={`${star} de 5, ${RATING_LABELS[star]}`}
            disabled={disabled}
            hitSlop={spacing.sm}
            onPress={() => onChange(star)}
            style={styles.target}
            testID={`star-${star}`}>
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={32}
              color={star <= rating ? colors.warning : colors.input}
              accessible={false}
            />
          </Pressable>
        ))}
      </View>
      <Text style={[styles.caption, { color: colors.mutedForeground }]}>
        {rating > 0 ? RATING_LABELS[rating] : 'Toque nas estrelas para dar sua nota'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
  input: { alignItems: 'center', gap: spacing.sm },
  target: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 },
  caption: typography.caption,
})

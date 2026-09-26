import Ionicons from '@expo/vector-icons/Ionicons'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { minTouch, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * A checkbox that always draws its box (audit A55: an unchecked term used to
 * show nothing at all). The box is 24 units inside a 44-unit target, and the
 * label is part of the target.
 */
export function Checkbox({
  label,
  checked,
  onPress,
  disabled = false,
  children,
  testID,
}: {
  label: string
  checked: boolean
  onPress: () => void
  disabled?: boolean
  /** Extra content under the label, such as links to what is being accepted. */
  children?: ReactNode
  testID?: string
}) {
  const colors = useColors()

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
        onPress={onPress}
        testID={testID}
        style={[styles.row, { opacity: disabled ? 0.6 : 1 }]}>
        <View
          testID={testID ? `${testID}-box` : undefined}
          style={[
            styles.box,
            {
              backgroundColor: checked ? colors.primary : colors.card,
              borderColor: checked ? colors.primary : colors.choiceBorder,
            },
          ]}>
          {checked ? <Ionicons name="checkmark" size={18} color={colors.primaryForeground} /> : null}
        </View>
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      </Pressable>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: minTouch },
  box: { alignItems: 'center', borderRadius: 6, borderWidth: 2, height: 24, justifyContent: 'center', width: 24 },
  label: { ...typography.body, flex: 1 },
})

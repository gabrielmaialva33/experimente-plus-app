import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { minTouch, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/** A section title with an optional hint and one action at the end of its line. */
export function SectionHeader({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string | null
  action?: { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; accessibilityLabel?: string }
}) {
  const colors = useColors()

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
          {title}
        </Text>
        {hint ? <Text style={[styles.hint, { color: colors.mutedForeground }]}>{hint}</Text> : null}
      </View>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          onPress={action.onPress}
          style={styles.action}>
          {action.icon ? <Ionicons name={action.icon} size={18} color={colors.primary} /> : null}
          <Text style={[styles.actionLabel, { color: colors.primary }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  copy: { flexShrink: 1, gap: 2 },
  title: typography.title,
  hint: typography.meta,
  action: { alignItems: 'center', flexDirection: 'row', gap: 6, minHeight: minTouch },
  actionLabel: { ...typography.label, ...textWeight('700') },
})

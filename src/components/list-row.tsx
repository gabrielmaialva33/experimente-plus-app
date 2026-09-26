import Ionicons from '@expo/vector-icons/Ionicons'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * One line of a grouped list: an icon, a name, an optional value, and a chevron
 * when it opens another screen (audit A23: links that look like a menu). The
 * destructive tone is for the one way out that cannot be undone, drawn in red
 * and without the chevron's invitation.
 */
export function ListRow({
  icon,
  label,
  value,
  onPress,
  tone = 'default',
  chevron = tone === 'default',
  accessibilityLabel,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value?: string | null
  onPress: () => void
  tone?: 'default' | 'destructive'
  chevron?: boolean
  accessibilityLabel?: string
  testID?: string
}) {
  const colors = useColors()
  const destructive = tone === 'destructive'
  const foreground = destructive ? colors.destructiveAccent : colors.foreground

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (value ? `${label}, ${value}` : label)}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.muted : 'transparent' }]}>
      <View
        style={[
          styles.icon,
          { backgroundColor: destructive ? colors.destructiveSoft : colors.primarySoft },
        ]}>
        <Ionicons
          name={icon}
          size={20}
          color={destructive ? colors.destructiveAccent : colors.primaryAccent}
        />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: foreground }]}>{label}</Text>
        {value ? (
          <Text numberOfLines={1} style={[styles.value, { color: colors.mutedForeground }]}>
            {value}
          </Text>
        ) : null}
      </View>
      {chevron ? <Ionicons testID="list-row-chevron" name="chevron-forward" size={20} color={colors.mutedForeground} /> : null}
    </Pressable>
  )
}

/** A titled group of rows on one card, separated by hairlines. */
export function ListGroup({ title, children }: { title?: string; children: ReactNode }) {
  const colors = useColors()
  return (
    <View style={styles.group}>
      {title ? (
        <Text accessibilityRole="header" style={[styles.groupTitle, { color: colors.mutedForeground }]}>
          {title}
        </Text>
      ) : null}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  icon: { alignItems: 'center', borderRadius: radius.pill, height: 36, justifyContent: 'center', width: 36 },
  copy: { flex: 1, gap: 2 },
  label: { ...typography.body, ...textWeight('600') },
  value: typography.meta,
  group: { gap: spacing.sm },
  groupTitle: typography.overline,
  card: { borderRadius: radius.card, borderWidth: 1, overflow: 'hidden', paddingVertical: spacing.xs },
})

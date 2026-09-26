import Ionicons from '@expo/vector-icons/Ionicons'
import { StyleSheet, Text, View } from 'react-native'

import { radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export type BadgeTone = 'success' | 'warning' | 'info' | 'neutral' | 'benefit'

/**
 * A pill of state or benefit. The label always carries the meaning; the tone
 * only reinforces it, and every pair meets AA.
 */
export function Badge({
  label,
  tone = 'neutral',
  icon,
  testID,
}: {
  label: string
  tone?: BadgeTone
  icon?: keyof typeof Ionicons.glyphMap
  testID?: string
}) {
  const colors = useColors()
  const appearance = {
    success: { background: colors.successSoft, foreground: colors.successAccent },
    warning: { background: colors.warningSoft, foreground: colors.warningAccent },
    info: { background: colors.infoSoft, foreground: colors.infoAccent },
    neutral: { background: colors.statusNeutral, foreground: colors.statusNeutralForeground },
    benefit: { background: colors.ctaSoft, foreground: colors.ctaAccent },
  }[tone]

  return (
    <View testID={testID} style={[styles.badge, { backgroundColor: appearance.background }]}>
      {icon ? <Ionicons name={icon} size={16} color={appearance.foreground} /> : null}
      <Text numberOfLines={1} style={[styles.label, { color: appearance.foreground }]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    maxWidth: '100%',
    minHeight: 30,
    paddingHorizontal: spacing.md,
  },
  label: { ...typography.caption, ...textWeight('700'), flexShrink: 1 },
})

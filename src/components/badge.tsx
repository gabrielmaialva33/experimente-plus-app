import Ionicons from '@expo/vector-icons/Ionicons'
import { StyleSheet, Text, View } from 'react-native'

import { decorative } from '@/components/decorative'
import { useLineCap } from '@/theme/font-scale'
import { radius, spacing, textWeight, typography, withOpacity } from '@/theme/tokens'
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
  const lines = useLineCap(1)
  // The web's outline pills: each tone keeps an edge, so a neutral pill on a
  // card of its own colour (dark mode) is still a pill and not loose text.
  const appearance = {
    success: {
      background: colors.successSoft,
      foreground: colors.successAccent,
      border: withOpacity(colors.success, 0.25),
    },
    warning: {
      background: colors.warningSoft,
      foreground: colors.warningAccent,
      border: withOpacity(colors.warning, 0.3),
    },
    info: {
      background: colors.infoSoft,
      foreground: colors.infoAccent,
      border: withOpacity(colors.info, 0.25),
    },
    neutral: {
      background: colors.statusNeutral,
      foreground: colors.statusNeutralForeground,
      border: colors.statusNeutralBorder,
    },
    benefit: {
      background: colors.ctaSoft,
      foreground: colors.ctaAccent,
      border: withOpacity(colors.cta, 0.25),
    },
  }[tone]

  return (
    <View
      testID={testID}
      style={[
        styles.badge,
        { backgroundColor: appearance.background, borderColor: appearance.border },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={16} color={appearance.foreground} {...decorative} />
      ) : null}
      <Text numberOfLines={lines} style={[styles.label, { color: appearance.foreground }]}>
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
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    maxWidth: '100%',
    minHeight: 30,
    paddingHorizontal: spacing.md,
  },
  label: { ...typography.caption, ...textWeight('700'), flexShrink: 1 },
})

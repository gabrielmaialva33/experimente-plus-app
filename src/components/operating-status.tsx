import { StyleSheet, Text, View } from 'react-native'

import { operatingStatus } from '@/catalog/operating-status'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/** The shared palette stores hex; keep the canonical border opacity explicit. */
const withOpacity = (hex: string, opacity: number) => {
  const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16))
  return `rgba(${rgb.join(', ')}, ${opacity})`
}

export function OperatingStatus({
  establishment,
}: {
  establishment: Parameters<typeof operatingStatus>[0]
}) {
  const colors = useColors()
  const { label, tone } = operatingStatus(establishment)
  const appearance = {
    muted: { backgroundColor: colors.statusNeutral, color: colors.statusNeutralForeground, borderColor: colors.statusNeutralBorder },
    warning: {
      backgroundColor: colors.warningSoft,
      color: colors.warningAccent,
      borderColor: withOpacity(colors.warning, 0.3),
    },
    info: {
      backgroundColor: colors.infoSoft,
      color: colors.infoAccent,
      borderColor: withOpacity(colors.info, 0.25),
    },
    success: {
      backgroundColor: colors.successSoft,
      color: colors.successAccent,
      borderColor: withOpacity(colors.success, 0.25),
    },
  }[tone]

  return (
    <View
      testID="operating-status"
      style={[
        styles.status,
        { backgroundColor: appearance.backgroundColor, borderColor: appearance.borderColor },
      ]}>
      <Text style={[styles.label, { color: appearance.color }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  status: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: { ...typography.caption, fontWeight: '600', flexShrink: 1 },
})

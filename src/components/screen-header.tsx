import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * The header band of direction A: the brand plane at the top of a tab root,
 * rounded where it meets the content. It reserves the status bar itself, since
 * the screens that use it hide the native header.
 */
export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  children,
}: {
  title?: string
  subtitle?: string
  /** A small line above the title, such as the wordmark row. */
  eyebrow?: ReactNode
  children?: ReactNode
}) {
  const colors = useColors()
  const insets = useSafeAreaInsets()

  return (
    <View
      testID="screen-header"
      style={[styles.band, { backgroundColor: colors.chrome, paddingTop: insets.top + spacing.gutter }]}>
      {eyebrow}
      {title ? (
        <Text accessibilityRole="header" style={[styles.title, { color: colors.chromeForeground }]}>
          {title}
        </Text>
      ) : null}
      {subtitle ? <Text style={[styles.subtitle, { color: colors.chromeMuted }]}>{subtitle}</Text> : null}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  band: {
    borderBottomLeftRadius: radius.sheet,
    borderBottomRightRadius: radius.sheet,
    gap: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.gutter,
  },
  title: { ...typography.display, fontSize: 28, lineHeight: 32 },
  subtitle: { ...typography.body, marginTop: -spacing.sm },
})

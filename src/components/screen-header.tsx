import type { ReactNode } from 'react'
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useScreenFrame } from '@/components/content-frame'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * The header band of direction A: the brand plane at the top of a tab root,
 * rounded where it meets the content. It reserves the status bar itself, since
 * the screens that use it hide the native header. The band spans the window;
 * what it holds keeps to the screen's column, so on a tablet the title and the
 * search sit over the content they lead to.
 */
export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  insetTop = true,
  onTitleLayout,
  children,
}: {
  title?: string
  subtitle?: string
  /** A small line above the title, such as the wordmark row. */
  eyebrow?: ReactNode
  /** Off when the screen paints the status bar strip itself and the band scrolls under it. */
  insetTop?: boolean
  /** Where the title sits in the band, for a compact header that takes over once it scrolls away. */
  onTitleLayout?: (event: LayoutChangeEvent) => void
  children?: ReactNode
}) {
  const colors = useColors()
  const insets = useSafeAreaInsets()
  const frame = useScreenFrame()

  return (
    <View
      testID="screen-header"
      style={[
        styles.band,
        frame.padding,
        {
          backgroundColor: colors.chrome,
          paddingTop: (insetTop ? insets.top : 0) + spacing.gutter,
        },
      ]}
    >
      {eyebrow}
      {title ? (
        <Text
          accessibilityRole="header"
          onLayout={onTitleLayout}
          style={[styles.title, { color: colors.chromeForeground }]}
        >
          {title}
        </Text>
      ) : null}
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.chromeMuted }]}>{subtitle}</Text>
      ) : null}
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
  },
  title: { ...typography.display, fontSize: 28, lineHeight: 32 },
  subtitle: { ...typography.body, marginTop: -spacing.sm },
})

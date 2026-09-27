import type { ReactNode } from 'react'
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useScreenFrame } from '@/components/content-frame'
import { minTouch, radius, spacing, typography } from '@/theme/tokens'
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
  action,
  insetTop = true,
  onTitleLayout,
  children,
}: {
  title?: string
  subtitle?: string
  /** A small line above the title, such as the wordmark row. */
  eyebrow?: ReactNode
  /**
   * One 44 control at the end of the title's line, such as help for the screen.
   * A band whose title hands over to a compact bar (`onTitleLayout`) has none.
   */
  action?: ReactNode
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
      {title && action ? (
        <View style={styles.titleRow}>
          <Text
            accessibilityRole="header"
            style={[styles.title, styles.titleBeside, { color: colors.chromeForeground }]}
          >
            {title}
          </Text>
          {action}
        </View>
      ) : title ? (
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
  // The control keeps its 44 and the title wraps before it; they share the first line.
  titleRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  titleBeside: { flex: 1, paddingTop: (minTouch - 32) / 2 },
  subtitle: { ...typography.body, marginTop: -spacing.sm },
})

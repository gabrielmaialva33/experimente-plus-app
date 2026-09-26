import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * The price next to the action that pays it (audit A30): a bar pinned under the
 * scrolling content, so the total never sits alone mid-screen. The screen's
 * root surface already reserves the system navigation bar.
 */
export function StickyFooter({
  caption,
  value,
  children,
  testID,
}: {
  caption: string
  value: string
  /** The action, usually one `cta` button that fills the rest of the row; none while a state speaks above. */
  children?: ReactNode
  testID?: string
}) {
  const colors = useColors()

  return (
    <View
      testID={testID}
      style={[styles.bar, { backgroundColor: colors.card, borderTopColor: colors.borderSubtle }]}>
      <View accessible accessibilityLabel={`${caption}: ${value}`} style={styles.amount}>
        <Text style={[styles.caption, { color: colors.mutedForeground }]}>{caption}</Text>
        <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      </View>
      {children ? <View style={styles.action}>{children}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.lg,
    paddingBottom: 18,
    paddingHorizontal: spacing.gutter,
    paddingTop: 14,
  },
  amount: { flexShrink: 0 },
  caption: typography.caption,
  value: { ...typography.display, fontSize: 24, lineHeight: 28 },
  action: { flex: 1, flexDirection: 'row' },
})

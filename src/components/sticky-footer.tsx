import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useStackedLayout } from '@/theme/font-scale'
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
  // With large text the total and the button no longer share a row without
  // breaking the label mid-word ("Ir para o pa/gamento"): the button goes under.
  const stacked = useStackedLayout()

  return (
    <View
      testID={testID}
      style={[
        styles.bar,
        stacked && styles.stacked,
        { backgroundColor: colors.card, borderTopColor: colors.borderSubtle },
      ]}
    >
      <View accessible accessibilityLabel={`${caption}: ${value}`} style={styles.amount}>
        <Text style={[styles.caption, { color: colors.mutedForeground }]}>{caption}</Text>
        <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      </View>
      {children ? (
        <View
          testID="sticky-footer-action"
          style={[styles.action, stacked && styles.actionStacked]}
        >
          {children}
        </View>
      ) : null}
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
  stacked: { alignItems: 'stretch', flexDirection: 'column', gap: spacing.md },
  amount: { flexShrink: 0 },
  caption: typography.caption,
  value: { ...typography.display, fontSize: 24, lineHeight: 28 },
  action: { flex: 1, flexDirection: 'row' },
  // In a column, `flex: 1` would mean a zero height and a button spilling out.
  actionStacked: { flex: 0 },
})

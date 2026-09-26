import Ionicons from '@expo/vector-icons/Ionicons'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { displayWeight, radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

const STUB_WIDTH = 104
const NOTCH = 24

/**
 * A benefit drawn as a ticket (direction A): the navy stub names what it gives,
 * the body says where and for how long, and its action sits at the end. The two
 * notches are the voucher metaphor only — they carry no meaning and are hidden
 * from assistive technology.
 */
export function TicketCard({
  stubLabel,
  title,
  meta,
  children,
  testID,
}: {
  /** What the benefit gives, e.g. "Item em dobro". */
  stubLabel: string
  /** Where it is used. */
  title: string
  meta?: string | null
  /** State notes and the action, stacked at the end of the body. */
  children?: ReactNode
  testID?: string
}) {
  const colors = useColors()

  return (
    <View
      testID={testID}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
      <View style={[styles.stub, { backgroundColor: colors.chrome }]}>
        <Ionicons name="ticket-outline" size={26} color={colors.chromeForeground} />
        <Text numberOfLines={3} style={[styles.stubLabel, { color: colors.chromeForeground }]}>
          {stubLabel}
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {meta ? <Text style={[styles.meta, { color: colors.mutedForeground }]}>{meta}</Text> : null}
        {children ? <View style={styles.end}>{children}</View> : null}
      </View>
      {(['top', 'bottom'] as const).map((edge) => (
        <View
          key={edge}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.notch,
            edge === 'top' ? { top: -NOTCH / 2 } : { bottom: -NOTCH / 2 },
            { backgroundColor: colors.background, borderColor: colors.borderSubtle },
          ]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 150,
    overflow: 'hidden',
  },
  stub: {
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
    padding: spacing.md,
    width: STUB_WIDTH,
  },
  stubLabel: { ...displayWeight('800'), fontSize: 15, lineHeight: 18, textAlign: 'center' },
  body: { flex: 1, gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  title: { ...typography.heading, fontSize: 17, lineHeight: 22 },
  meta: typography.meta,
  end: { gap: spacing.sm, marginTop: 'auto', paddingTop: spacing.sm },
  notch: {
    borderRadius: NOTCH / 2,
    borderWidth: 1,
    height: NOTCH,
    left: STUB_WIDTH - NOTCH / 2,
    position: 'absolute',
    width: NOTCH,
  },
})

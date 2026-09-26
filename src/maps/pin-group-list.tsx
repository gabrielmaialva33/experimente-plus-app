import { Pressable, StyleSheet, Text, View } from 'react-native'

import { radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import type { MapPinGroup } from './types'

/**
 * The places behind one marker, as a list over the map. Shared by both
 * renderers so a stacked spot behaves the same whatever draws the map.
 */
export function PinGroupList({
  group,
  onSelect,
  onClose,
}: {
  group: MapPinGroup
  onSelect: (slug: string) => void
  onClose: () => void
}) {
  const colors = useColors()

  return (
    <View
      accessibilityLabel={`${group.pins.length} lugares neste ponto`}
      style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>{`${group.pins.length} lugares aqui`}</Text>
        <Pressable accessibilityRole="button" onPress={onClose} hitSlop={spacing.sm} style={styles.close}>
          <Text style={[styles.closeLabel, { color: colors.primary }]}>Fechar</Text>
        </Pressable>
      </View>
      {group.pins.map((pin) => (
        <Pressable
          key={pin.slug}
          accessibilityRole="button"
          accessibilityLabel={[pin.name, pin.category].filter(Boolean).join(', ')}
          onPress={() => onSelect(pin.slug)}
          style={[styles.row, { borderTopColor: colors.border }]}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {pin.name}
          </Text>
          {pin.category ? (
            <Text style={[styles.category, { color: colors.mutedForeground }]} numberOfLines={1}>
              {pin.category}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xxl + spacing.lg,
    borderRadius: radius.surface,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  title: { ...typography.body, ...textWeight('700') },
  close: { minHeight: 44, justifyContent: 'center' },
  closeLabel: { ...typography.body, ...textWeight('700') },
  row: { minHeight: 56, justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.sm },
  name: { ...typography.body, ...textWeight('600') },
  category: typography.caption,
})

import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'

import { BottomSheet } from '@/components/bottom-sheet'
import { IconButton } from '@/components/icon-button'
import { useLineCap } from '@/theme/font-scale'
import { minTouch, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export interface ActionMenuItem {
  label: string
  /** When the label alone does not say where the option leads; it starts with the label. */
  accessibilityLabel?: string
  icon?: keyof typeof Ionicons.glyphMap
  /**
   * A promise keeps the sheet open until it settles. Sharing needs that on
   * iOS: a share sheet presented while this one is dismissing would be
   * dismissed with it.
   */
  onPress: () => void | Promise<unknown>
  testID?: string
}

/**
 * The "⋯" of an item (audit A32): the actions a person rarely needs — share,
 * report — in one place instead of a row of links under every card. The
 * trigger is a 44 circle; the options open in a sheet, each a 52 row.
 */
export function ActionMenu({
  accessibilityLabel,
  title,
  items,
  tone = 'surface',
  testID,
}: {
  /** Names the item: "Mais opções: Oficina de métodos de preparo". */
  accessibilityLabel: string
  /** The item the options act on, shown atop the sheet. */
  title?: string
  items: ActionMenuItem[]
  tone?: 'surface' | 'image' | 'plain'
  testID?: string
}) {
  const colors = useColors()
  const [open, setOpen] = useState(false)
  const titleLines = useLineCap(2)
  const close = () => setOpen(false)

  const choose = (item: ActionMenuItem) => {
    const result = item.onPress()
    // A share sheet the system could not show rejects: the options close all the
    // same, and the rejection stops here instead of surfacing as an unhandled one.
    if (result instanceof Promise) void result.then(close, close)
    else close()
  }

  if (items.length === 0) return null

  return (
    <>
      <IconButton
        icon="ellipsis-horizontal"
        accessibilityLabel={accessibilityLabel}
        onPress={() => setOpen(true)}
        tone={tone}
        testID={testID}
      />
      <BottomSheet
        visible={open}
        onClose={close}
        closeLabel="Fechar opções"
        style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
      >
        {title ? (
          <Text
            numberOfLines={titleLines}
            style={[styles.title, { color: colors.mutedForeground }]}
          >
            {title}
          </Text>
        ) : null}
        {items.map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityLabel={item.accessibilityLabel ?? item.label}
            onPress={() => choose(item)}
            testID={item.testID}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: colors.borderSubtle, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            {item.icon ? <Ionicons name={item.icon} size={22} color={colors.primary} /> : null}
            <Text style={[styles.label, { color: colors.foreground }]}>{item.label}</Text>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" onPress={close} style={styles.cancel}>
          <Text style={[styles.cancelLabel, { color: colors.primary }]}>Cancelar</Text>
        </Pressable>
      </BottomSheet>
    </>
  )
}

const styles = StyleSheet.create({
  // The sheet reserves the navigation bar; the cancel row keeps its own air above it.
  sheet: {
    borderBottomWidth: 0,
    borderWidth: 1,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.lg,
  },
  title: { ...typography.meta, paddingBottom: spacing.sm },
  row: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 52,
  },
  label: { ...typography.label, fontSize: 16 },
  cancel: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    minHeight: minTouch,
  },
  cancelLabel: { ...typography.label, ...textWeight('700') },
})

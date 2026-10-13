import { StyleSheet, Text, View } from 'react-native'

import { ChoiceControl } from '@/components/choice-control'
import { spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

import { CONCIERGE_SHORTCUTS, type ConciergeShortcut } from './shortcuts'

interface ShortcutChipsProps {
  selected: ReadonlySet<ConciergeShortcut>
  onToggle: (id: ConciergeShortcut) => void
}

/**
 * The optional shortcuts above the question: checkboxes, because each one is
 * a choice that stays until it is cleared, not a command. The row wraps, and
 * each chip keeps its full height inside the row, so a larger system text
 * grows the row instead of cutting a label or shrinking a touch target.
 */
export function ShortcutChips({ selected, onToggle }: ShortcutChipsProps) {
  const colors = useColors()

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.foreground }]}>Atalhos (opcional)</Text>
      <View style={styles.row} testID="concierge-shortcuts">
        {CONCIERGE_SHORTCUTS.map((shortcut) => (
          <ChoiceControl
            key={shortcut.id}
            role="checkbox"
            label={shortcut.label}
            accessibilityLabel={shortcut.accessibilityLabel}
            selected={selected.has(shortcut.id)}
            onPress={() => onToggle(shortcut.id)}
          />
        ))}
      </View>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Os valores seguem o ticket médio por pessoa informado pelo lugar.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { ...typography.caption, ...textWeight('700') },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hint: typography.caption,
})

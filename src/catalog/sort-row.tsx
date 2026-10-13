import { Linking, StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/button'
import { ChoiceControl } from '@/components/choice-control'
import { ChoiceRow } from '@/components/choice-row'
import { spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

import { LOCATING_MESSAGE, LOCATION_MESSAGES, SORT_OPTIONS, type ExploreSortState } from './sort'

/**
 * The order of Explorar: one choice among four, under the filters, for the list
 * and the map alike. A problem with the location shows under it, with the one
 * action that can fix it — the system settings when the permission is blocked,
 * another try otherwise.
 */
export function SortRow({
  state,
  gutter,
}: {
  state: ExploreSortState
  gutter: { left: number; right: number }
}) {
  const colors = useColors()
  const message = state.locating
    ? LOCATING_MESSAGE
    : state.problem
      ? LOCATION_MESSAGES[state.problem]
      : null
  const action =
    state.locating || !state.problem
      ? null
      : state.problem === 'blocked'
        ? { label: 'Abrir configurações', onPress: () => void Linking.openSettings() }
        : state.problem === 'denied'
          ? null
          : { label: 'Tentar de novo', onPress: () => void state.choose('distance') }

  return (
    <View>
      <ChoiceRow label="Ordenar" single gutter={gutter}>
        {(maxWidth) => (
          <>
            {/* The group is already named "Ordenar"; the visible word is for the eye. */}
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.label, { color: colors.mutedForeground }]}
            >
              Ordenar
            </Text>
            {SORT_OPTIONS.map((option) => (
              <ChoiceControl
                key={option.value}
                role="radio"
                maxWidth={maxWidth}
                label={option.label}
                selected={state.sort === option.value}
                onPress={() => void state.choose(option.value)}
              />
            ))}
          </>
        )}
      </ChoiceRow>
      {message ? (
        // Announced when it appears (see `useExploreSort`), so no live region here.
        <View
          testID="sort-location-notice"
          style={[styles.notice, { paddingLeft: gutter.left, paddingRight: gutter.right }]}
        >
          <Text style={[styles.message, { color: colors.foreground }]}>{message}</Text>
          {action ? (
            <Button label={action.label} onPress={action.onPress} variant="outline" size={44} />
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  label: { ...typography.caption, ...textWeight('600') },
  notice: { gap: spacing.sm, paddingBottom: spacing.sm },
  message: typography.meta,
})

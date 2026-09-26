import Ionicons from '@expo/vector-icons/Ionicons'
import { forwardRef } from 'react'
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native'

import { IconButton } from '@/components/icon-button'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

type SearchFieldProps = Omit<TextInputProps, 'style'> & {
  value: string
  onChangeText: (value: string) => void
  /** Also the accessible name of the field. */
  placeholder: string
  onClear?: () => void
}

/** The pill search of direction A, with a clear control once there is a term (audit A33). */
export const SearchField = forwardRef<TextInput, SearchFieldProps>(function SearchField(
  { value, onChangeText, placeholder, onClear, ...props },
  ref
) {
  const colors = useColors()

  return (
    <View style={[styles.field, { backgroundColor: colors.card }]}>
      <Ionicons name="search" size={20} color={colors.mutedForeground} />
      <TextInput
        ref={ref}
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        returnKeyType="search"
        style={[styles.input, { color: colors.foreground }]}
      />
      {value.length > 0 ? (
        <IconButton
          icon="close"
          tone="plain"
          accessibilityLabel="Limpar busca"
          onPress={() => (onClear ? onClear() : onChangeText(''))}
        />
      ) : null}
    </View>
  )
})

const styles = StyleSheet.create({
  field: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingLeft: spacing.gutter,
    paddingRight: spacing.xs,
  },
  input: { ...typography.body, flexGrow: 1, flexShrink: 1, minHeight: 48, paddingVertical: 0 },
})

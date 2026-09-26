import Ionicons from '@expo/vector-icons/Ionicons'
import { useState, type Ref } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'

import { FormTextInput } from '@/components/keyboard-form'
import { minTouch, radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

type FieldInputProps = Omit<TextInputProps, 'value' | 'onChangeText' | 'secureTextEntry' | 'style' | 'accessibilityLabel'>

/**
 * A form field of direction A. The label stays above the field while typing
 * (a placeholder that vanishes is not a label, audit A36), the error sits on the
 * field it belongs to, and a password can be shown before it is sent.
 */
export function TextField({
  label,
  value,
  onChangeText,
  error,
  hint,
  secure = false,
  inputRef,
  ...inputProps
}: FieldInputProps & {
  label: string
  value: string
  onChangeText: (value: string) => void
  error?: string | null
  hint?: string | null
  secure?: boolean
  inputRef?: Ref<TextInput>
}) {
  const colors = useColors()
  const [revealed, setRevealed] = useState(false)

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <View
        style={[
          styles.box,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.destructiveAccent : colors.input,
            borderWidth: error ? 2 : 1,
          },
        ]}>
        <FormTextInput
          ref={inputRef}
          {...inputProps}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint ?? undefined}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure && !revealed}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground }]}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Ocultar senha' : 'Mostrar senha'}
            onPress={() => setRevealed(!revealed)}
            style={styles.toggle}>
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={[styles.message, { color: colors.destructiveAccent }]}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.message, { color: colors.mutedForeground }]}>{hint}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { ...typography.label, ...textWeight('700') },
  box: {
    alignItems: 'center',
    borderRadius: radius.thumb,
    flexDirection: 'row',
    minHeight: 52,
    paddingLeft: spacing.lg,
  },
  input: { ...typography.body, flex: 1, minHeight: 50, paddingRight: spacing.lg, paddingVertical: spacing.md },
  toggle: { alignItems: 'center', height: minTouch, justifyContent: 'center', marginRight: spacing.xs, width: minTouch },
  message: typography.meta,
})

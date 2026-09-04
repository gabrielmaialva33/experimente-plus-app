import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import { ApiError } from '@/api/client'
import { ACCOUNT_DELETION_LITERAL, deleteAccount } from '@/api/me'
import { useSession } from '@/session/context'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * Account deletion.
 *
 * The friction is the feature: the server demands the current password and the
 * exact literal, and the client neither pre-fills nor auto-completes either.
 * The action is destructive and irreversible, so nothing here is one tap away.
 */
export default function DeleteAccountScreen() {
  const colors = useColors()
  const { signOut } = useSession()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const remove = useMutation({
    mutationFn: () => deleteAccount(password, confirmation),
    retry: false,
    // The account is gone; the local session must go with it.
    onSuccess: () => signOut(),
  })

  const matches = confirmation.trim().toUpperCase() === ACCOUNT_DELETION_LITERAL
  const ready = matches && password.length > 0

  const message =
    remove.error instanceof ApiError && remove.error.status === 400
      ? 'Senha incorreta ou confirmação inválida.'
      : remove.isError
        ? 'Não foi possível excluir a conta agora.'
        : null

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <Text style={[styles.heading, { color: colors.destructive }]}>Excluir minha conta</Text>

      <Text style={[styles.body, { color: colors.foreground }]}>
        Esta ação é permanente. Seus benefícios e o acesso à operação são encerrados.
      </Text>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Senha atual</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Digite {ACCOUNT_DELETION_LITERAL}
        </Text>
        <TextInput
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          autoCorrect={false}
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: matches ? colors.destructive : colors.border,
              color: colors.foreground,
            },
          ]}
        />
      </View>

      {message ? <Text style={[styles.error, { color: colors.destructive }]}>{message}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={!ready || remove.isPending}
        onPress={() => remove.mutate()}
        style={[
          styles.action,
          { backgroundColor: colors.destructive, opacity: !ready || remove.isPending ? 0.4 : 1 },
        ]}>
        <Text style={[styles.actionLabel, { color: '#ffffff' }]}>
          {remove.isPending ? 'Excluindo…' : 'Excluir permanentemente'}
        </Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.md, padding: spacing.xl },
  heading: typography.title,
  body: typography.body,
  field: { gap: spacing.xs },
  label: { ...typography.caption, textTransform: 'uppercase' },
  input: {
    ...typography.body,
    borderRadius: radius.surface,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  error: typography.caption,
  action: {
    alignItems: 'center',
    borderRadius: radius.pill,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionLabel: { ...typography.body, fontWeight: '700' },
})

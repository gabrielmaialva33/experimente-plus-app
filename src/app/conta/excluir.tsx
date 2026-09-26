import Ionicons from '@expo/vector-icons/Ionicons'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { ApiError } from '@/api/client'
import { ACCOUNT_DELETION_LITERAL, deleteAccount } from '@/api/me'
import { Button } from '@/components/button'
import { KeyboardForm } from '@/components/keyboard-form'
import { TextField } from '@/components/text-field'
import { useSession } from '@/session/context'
import { radius, spacing, typography, textWeight } from '@/theme/tokens'
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
  const router = useRouter()
  const { signOut } = useSession()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const remove = useMutation({
    mutationFn: () => deleteAccount(password, confirmation),
    retry: false,
    // The account is gone; the local session must go with it, and so must this
    // form: left on screen, it offers to delete an account that no longer exists.
    onSuccess: async () => {
      await signOut()
      router.replace('/')
    },
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
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <KeyboardForm contentContainerStyle={styles.page}>
        <View style={[styles.warning, { backgroundColor: colors.destructiveSoft, borderColor: colors.destructive }]}>
          <Ionicons name="warning-outline" size={24} color={colors.destructiveAccent} />
          <Text style={[styles.body, styles.warningText, { color: colors.foreground }]}>
            Esta ação é permanente. Seus benefícios e o acesso à operação são encerrados.
          </Text>
        </View>

        <TextField
          label="Senha atual"
          value={password}
          onChangeText={setPassword}
          secure
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextField
          label={`Digite ${ACCOUNT_DELETION_LITERAL}`}
          value={confirmation}
          onChangeText={setConfirmation}
          hint={matches ? 'Confirmação correta.' : 'Escreva exatamente como acima, para confirmar.'}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        {message ? (
          <Text accessibilityRole="alert" style={[styles.body, { color: colors.destructiveAccent }]}>
            {message}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Excluir permanentemente"
          accessibilityState={{ disabled: !ready || remove.isPending }}
          disabled={!ready || remove.isPending}
          onPress={() => remove.mutate()}
          style={({ pressed }) => [
            styles.action,
            {
              // A disabled button keeps a readable label instead of fading out (audit A51).
              backgroundColor: !ready || remove.isPending ? colors.muted : colors.destructive,
              opacity: pressed ? 0.85 : 1,
            },
          ]}>
          <Text
            style={[
              styles.actionLabel,
              { color: !ready || remove.isPending ? colors.mutedForeground : colors.destructiveForeground },
            ]}>
            {remove.isPending ? 'Excluindo…' : 'Excluir permanentemente'}
          </Text>
        </Pressable>
        <Button label="Manter minha conta" variant="ghost" fill onPress={() => router.back()} />
      </KeyboardForm>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg, padding: spacing.gutter, paddingBottom: spacing.xxl },
  body: typography.body,
  warning: { alignItems: 'flex-start', borderRadius: radius.card, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  warningText: { flex: 1 },
  action: { alignItems: 'center', borderRadius: radius.pill, justifyContent: 'center', marginTop: spacing.sm, minHeight: 52 },
  actionLabel: { ...typography.label, ...textWeight('700'), fontSize: 16 },
})

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ApiError } from '@/api/client'
import { updateProfile } from '@/api/me'
import { useSession } from '@/session/context'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export default function AccountScreen() {
  const colors = useColors()
  const router = useRouter()
  const { context, refresh, signOut } = useSession()
  const user = context?.user

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [username, setUsername] = useState(user?.username ?? '')

  const fullNameChanged = fullName !== (user?.full_name ?? '')
  // An untouched null username is displayed as an empty string, not a clear request.
  const usernameChanged = username !== (user?.username ?? '')

  const save = useMutation({
    mutationFn: () =>
      updateProfile({
        ...(fullNameChanged ? { full_name: fullName } : {}),
        ...(usernameChanged ? { username: username.trim() ? username : null } : {}),
      }),
    retry: false,
    onSuccess: (result) => {
      // The server lowercases username; without resyncing, local state stays
      // different from the saved value and Save never settles.
      setFullName(result.user.full_name ?? '')
      setUsername(result.user.username ?? '')
      void refresh()
    },
  })

  const changed = fullNameChanged || usernameChanged
  // The server requires a non-empty name whenever the key is sent.
  const valid = !fullNameChanged || fullName.trim().length > 0

  const message =
    save.error instanceof ApiError && save.error.status === 422
      ? 'Nome não pode ficar vazio, e o usuário pode já estar em uso.'
      : save.isError
        ? 'Não foi possível salvar agora.'
        : save.isSuccess
          ? 'Perfil atualizado.'
          : null

  return (
    <SafeAreaView edges={['left', 'right']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page}>
        <Field label="Nome" value={fullName} onChange={setFullName} />
        <Field label="Usuário" value={username} onChange={setUsername} autoCapitalize="none" />

        {/* Not editable here, by contract. Shown so the person can see them. */}
        <View style={styles.readOnly}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>E-mail</Text>
          <Text style={[styles.value, { color: colors.mutedForeground }]}>{user?.email}</Text>
        </View>

        {context?.active_operation ? (
          <View style={styles.readOnly}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Operação ativa</Text>
            <Text style={[styles.value, { color: colors.mutedForeground }]}>
              {context.active_operation.name}
            </Text>
          </View>
        ) : null}

        {message ? (
          <Text
            style={[
              styles.message,
              { color: save.isSuccess ? colors.successAccent : colors.destructiveAccent },
            ]}>
            {message}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={!changed || !valid || save.isPending}
          onPress={() => save.mutate()}
          style={[
            styles.action,
            { backgroundColor: colors.primary, opacity: !changed || !valid || save.isPending ? 0.5 : 1 },
          ]}>
          <Text style={[styles.actionLabel, { color: colors.primaryForeground }]}>
            {save.isPending ? 'Salvando…' : 'Salvar alterações'}
          </Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={signOut} style={styles.signOut}>
          <Text style={[styles.actionLabel, { color: colors.primary }]}>Sair</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/conta/excluir')}
          style={styles.destructive}>
          <Text style={[styles.message, { color: colors.destructiveAccent }]}>Excluir minha conta</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

function Field({
  label,
  value,
  onChange,
  autoCapitalize = 'words',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoCapitalize?: 'none' | 'words'
}) {
  const colors = useColors()

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={[
          styles.input,
          { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.md, padding: spacing.xl },
  field: { gap: spacing.xs },
  readOnly: { gap: 2, paddingVertical: spacing.xs },
  label: { ...typography.caption, textTransform: 'uppercase' },
  value: typography.body,
  input: {
    ...typography.body,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  message: typography.caption,
  action: {
    alignItems: 'center',
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
  },
  actionLabel: { ...typography.body, fontWeight: '700' },
  signOut: { alignItems: 'center', paddingVertical: spacing.lg },
  destructive: { alignItems: 'center', paddingVertical: spacing.md },
})

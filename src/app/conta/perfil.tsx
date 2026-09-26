import { useMutation } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { ApiError } from '@/api/client'
import { updateProfile } from '@/api/me'
import { Button } from '@/components/button'
import { KeyboardForm } from '@/components/keyboard-form'
import { TextField } from '@/components/text-field'
import { useSession } from '@/session/context'
import { spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

type ProfileErrors = { full_name?: string; username?: string }

const NAME_RULE = 'Informe seu nome, com até 255 caracteres.'
const USERNAME_RULE = 'Use de 3 a 80 caracteres: letras, números, ponto, hífen ou sublinhado. Comece com letra ou número.'

/** Mirrors the profile validator; uniqueness and final validation remain server-owned. */
function profileErrors(changes: { full_name?: string; username?: string | null }): ProfileErrors {
  const errors: ProfileErrors = {}
  if (changes.full_name !== undefined) {
    const name = changes.full_name.trim()
    if (!name || name.length > 255) errors.full_name = NAME_RULE
  }
  const username = changes.username?.trim().toLowerCase()
  if (username && (username.length < 3 || username.length > 80 || !/^[a-z0-9][a-z0-9._-]*$/.test(username))) {
    errors.username = USERNAME_RULE
  }
  return errors
}

/** Do not echo arbitrary server messages: they may contain submitted values. */
function profileServerErrors(body: unknown): ProfileErrors {
  const errors: ProfileErrors = {}
  if (!body || typeof body !== 'object' || !('errors' in body) || !Array.isArray(body.errors)) return errors
  for (const error of body.errors) {
    if (!error || typeof error !== 'object') continue
    if (error.field === 'full_name') errors.full_name = NAME_RULE
    else if (error.field === 'username') {
      errors.username = error.rule === 'database.unique' ? 'Este usuário já está em uso. Escolha outro.' : USERNAME_RULE
    }
  }
  return errors
}

/**
 * Editing the profile, on its own screen (audit A23). Only name and username
 * are editable by contract (UC-M06); the e-mail is shown so the person knows
 * which account this is. A refused value is explained on its own field, with
 * the rule it broke (audit A24), not in one sentence about both.
 */
export default function ProfileScreen() {
  const colors = useColors()
  const { context, refresh } = useSession()
  const user = context?.user

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [errors, setErrors] = useState<ProfileErrors>({})

  const fullNameChanged = fullName !== (user?.full_name ?? '')
  // An untouched null username is displayed as an empty string, not a clear request.
  const usernameChanged = username !== (user?.username ?? '')
  const changes = {
    ...(fullNameChanged ? { full_name: fullName } : {}),
    ...(usernameChanged ? { username: username.trim() ? username : null } : {}),
  }

  const save = useMutation({
    mutationFn: () => updateProfile(changes),
    retry: false,
    onSuccess: (result) => {
      // The server lowercases username; without resyncing, local state stays
      // different from the saved value and Save never settles.
      setFullName(result.user.full_name ?? '')
      setUsername(result.user.username ?? '')
      void refresh()
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422) setErrors(profileServerErrors(error.body))
    },
  })

  const changed = fullNameChanged || usernameChanged

  const submit = () => {
    const found = profileErrors(changes)
    setErrors(found)
    if (Object.keys(found).length === 0) save.mutate()
  }

  const edit = (field: keyof ProfileErrors, setter: (value: string) => void) => (value: string) => {
    setter(value)
    // The message answers the value that was refused; a new value has not been checked yet.
    if (errors[field]) setErrors({ ...errors, [field]: undefined })
  }

  const fieldErrors = Object.values(errors).some(Boolean)
  const message = fieldErrors
    ? null
    : save.isError
      ? 'Não foi possível salvar agora. Tente de novo.'
      : save.isSuccess
        ? 'Perfil atualizado.'
        : null

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <Stack.Screen options={{ title: 'Editar perfil' }} />
      <KeyboardForm contentContainerStyle={styles.page}>
        <TextField
          label="Nome"
          value={fullName}
          onChangeText={edit('full_name', setFullName)}
          error={errors.full_name}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          autoCorrect={false}
        />
        <TextField
          label="Usuário"
          value={username}
          onChangeText={edit('username', setUsername)}
          error={errors.username}
          hint="Opcional. Deixe em branco para não usar."
          autoCapitalize="none"
          autoComplete="username"
          autoCorrect={false}
        />

        {/* Not editable here, by contract. Shown so the person can see it. */}
        <View style={styles.readOnly}>
          <Text style={[styles.label, { color: colors.foreground }]}>E-mail</Text>
          <Text style={[styles.value, { color: colors.mutedForeground }]}>{user?.email}</Text>
        </View>

        {message ? (
          <Text
            accessibilityRole={save.isSuccess ? undefined : 'alert'}
            style={[styles.message, { color: save.isSuccess ? colors.successAccent : colors.destructiveAccent }]}>
            {message}
          </Text>
        ) : null}

        <Button
          label={save.isPending ? 'Salvando…' : 'Salvar alterações'}
          accessibilityLabel="Salvar alterações"
          size={52}
          fill
          disabled={!changed || save.isPending}
          onPress={submit}
        />
      </KeyboardForm>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.gutter, padding: spacing.gutter },
  readOnly: { gap: spacing.xs },
  label: { ...typography.label, ...textWeight('700') },
  value: typography.body,
  message: typography.body,
})

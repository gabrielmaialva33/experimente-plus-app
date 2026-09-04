import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { signIn } from '@/api/auth'
import { ApiError } from '@/api/client'
import { useSession } from '@/session/context'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export default function SignInScreen() {
  const colors = useColors()
  const { status, refresh, signOut } = useSession()
  const [uid, setUid] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () => signIn(uid.trim(), password),
    // Credentials are never replayed automatically.
    retry: false,
    // Reloading the context is what composes the authenticated navigation.
    onSuccess: () => refresh(),
  })

  const message =
    mutation.error instanceof ApiError && mutation.error.status === 400
      ? 'E-mail ou senha incorretos.'
      : mutation.isError
        ? 'Não foi possível entrar agora.'
        : null

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <View style={styles.page}>
        <Text style={[styles.heading, { color: colors.foreground }]}>Entrar</Text>

        {/* A stored credential whose context could not load: discovery still
            works, and this is the escape from a half-loaded session. */}
        {status === 'unavailable' ? (
          <View style={styles.notice}>
            <Text style={[styles.error, { color: colors.warning }]}>
              Não foi possível carregar sua conta. Explorar continua disponível.
            </Text>
            <Pressable onPress={() => refresh()}>
              <Text style={[styles.actionLabel, { color: colors.cta }]}>Tentar de novo</Text>
            </Pressable>
            <Pressable onPress={signOut}>
              <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>
                Sair desta conta
              </Text>
            </Pressable>
          </View>
        ) : null}

        <TextInput
          value={uid}
          onChangeText={setUid}
          placeholder="E-mail ou usuário"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Senha"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry
          textContentType="password"
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        />

        {message ? <Text style={[styles.error, { color: colors.destructive }]}>{message}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={mutation.isPending || !uid || !password}
          onPress={() => mutation.mutate()}
          style={[
            styles.action,
            { backgroundColor: colors.cta, opacity: mutation.isPending || !uid || !password ? 0.6 : 1 },
          ]}>
          <Text style={[styles.actionLabel, { color: colors.ctaForeground }]}>
            {mutation.isPending ? 'Entrando…' : 'Entrar'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.md, padding: spacing.xl },
  heading: { ...typography.title, marginBottom: spacing.sm },
  input: {
    ...typography.body,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  error: typography.caption,
  notice: { gap: spacing.sm, paddingVertical: spacing.sm },
  action: {
    alignItems: 'center',
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
  },
  actionLabel: { ...typography.body, fontWeight: '700' },
})

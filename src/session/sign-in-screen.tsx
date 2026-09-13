import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { signIn } from '@/api/auth'
import { ApiError } from '@/api/client'
import { useSession } from '@/session/context'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export default function SignInScreen({ purchase = false }: { purchase?: boolean }) {
  const colors = useColors()
  const router = useRouter()
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
    <SafeAreaView edges={['left', 'right']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <View style={styles.page}>
        {/* A stored credential whose context could not load: discovery still
            works, and this is the escape from a half-loaded session. */}
        {status === 'unavailable' ? (
          <View style={styles.notice}>
            <Text style={[styles.error, { color: colors.warningAccent }]}>
              Não foi possível carregar sua conta. Explorar continua disponível.
            </Text>
            <Pressable onPress={() => refresh()}>
              <Text style={[styles.actionLabel, { color: colors.primary }]}>Tentar de novo</Text>
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
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground }]}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Senha"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry
          textContentType="password"
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground }]}
        />

        {message ? <Text style={[styles.error, { color: colors.destructiveAccent }]}>{message}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={mutation.isPending || !uid || !password}
          onPress={() => mutation.mutate()}
          style={[
            styles.action,
            { backgroundColor: colors.primary, opacity: mutation.isPending || !uid || !password ? 0.6 : 1 },
          ]}>
          <Text style={[styles.actionLabel, { color: colors.primaryForeground }]}>
            {mutation.isPending ? 'Entrando…' : 'Entrar'}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={mutation.isPending} style={styles.registration}
          onPress={() => router.push('/recuperar-senha')}>
          <Text style={[styles.actionLabel, { color: colors.primary }]}>Esqueci minha senha</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={mutation.isPending} style={styles.registration}
          onPress={() => purchase ? router.replace('/cadastro?origin=compra') : router.push('/cadastro')}>
          <Text style={[styles.actionLabel, { color: colors.primary }]}>Não tenho conta. Criar conta</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.md, padding: spacing.xl },
  registration: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
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

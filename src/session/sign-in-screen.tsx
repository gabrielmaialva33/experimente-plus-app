import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { signIn } from '@/api/auth'
import { ApiError } from '@/api/client'
import { useAnnouncement } from '@/components/announce'
import { Button } from '@/components/button'
import { KeyboardForm } from '@/components/keyboard-form'
import { ScreenHeader } from '@/components/screen-header'
import { TextField } from '@/components/text-field'
import { useSession } from '@/session/context'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * Signing in, in direction A (audit A36): a sentence that says what the account
 * is for, labels that stay above the fields, a password that can be shown, and
 * creating an account as a real secondary button instead of a line of text.
 *
 * As a tab it opens under the navy band, like Carteira and Conta; inside the
 * purchase flow the stack header already names the step, so the sentence stays
 * in the page.
 */
export default function SignInScreen({ purchase = false }: { purchase?: boolean }) {
  const colors = useColors()
  const insets = useSafeAreaInsets()
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
      ? 'Dados de acesso incorretos.'
      : mutation.isError
        ? 'Não foi possível entrar agora.'
        : null
  useAnnouncement(message)

  // Recovery asks for an e-mail; one already typed here is not asked twice (audit A59).
  const typedEmail = uid.trim().includes('@') ? uid.trim() : null
  const recover = () =>
    typedEmail
      ? router.push({ pathname: '/recuperar-senha', params: { email: typedEmail } })
      : router.push('/recuperar-senha')

  return (
    <SafeAreaView edges={['left', 'right']} style={{ backgroundColor: colors.background, flex: 1 }}>
      {/* The band scrolls with the page; the status bar keeps its colour. */}
      {purchase ? null : <View style={{ backgroundColor: colors.chrome, height: insets.top }} />}
      <KeyboardForm contentContainerStyle={styles.page}>
        {purchase ? null : (
          <ScreenHeader
            insetTop={false}
            title="Entre na sua conta"
            subtitle="Sua carteira de benefícios, favoritos e roteiros ficam na conta. Explorar continua aberto sem login."
          />
        )}
        <View style={styles.form}>
          {/* A stored credential whose context could not load: discovery still
              works, and this is the escape from a half-loaded session. */}
          {status === 'unavailable' ? (
            <View
              style={[
                styles.notice,
                { backgroundColor: colors.warningSoft, borderColor: colors.borderSubtle },
              ]}
            >
              <Text style={[styles.body, { color: colors.foreground }]}>
                Não foi possível carregar sua conta. Explorar continua disponível.
              </Text>
              <View style={styles.noticeActions}>
                <Button
                  label="Tentar de novo"
                  variant="outline"
                  size={44}
                  onPress={() => void refresh()}
                />
                <Button label="Sair desta conta" variant="ghost" size={44} onPress={signOut} />
              </View>
            </View>
          ) : null}

          {purchase ? (
            <View style={styles.intro}>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
                Entre para concluir a compra
              </Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                O benefício comprado fica guardado na sua carteira.
              </Text>
            </View>
          ) : null}

          <TextField
            label="E-mail ou usuário"
            value={uid}
            onChangeText={setUid}
            placeholder="voce@email.com"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            keyboardType="email-address"
            textContentType="username"
          />
          <TextField
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secure
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={() => {
              if (uid && password && !mutation.isPending) mutation.mutate()
            }}
          />

          <View style={styles.forgot}>
            <Button
              label="Esqueci minha senha"
              variant="ghost"
              size={44}
              align="end"
              disabled={mutation.isPending}
              onPress={recover}
            />
          </View>

          {message ? (
            <Text
              accessibilityRole="alert"
              style={[styles.body, { color: colors.destructiveAccent }]}
            >
              {message}
            </Text>
          ) : null}

          <Button
            label={mutation.isPending ? 'Entrando…' : 'Entrar'}
            accessibilityLabel="Entrar"
            size={52}
            fill
            disabled={mutation.isPending || !uid || !password}
            onPress={() => mutation.mutate()}
          />

          <View style={styles.divider}>
            <View style={[styles.rule, { backgroundColor: colors.borderSubtle }]} />
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              Ainda não tem conta?
            </Text>
            <View style={[styles.rule, { backgroundColor: colors.borderSubtle }]} />
          </View>

          <Button
            label="Criar conta"
            accessibilityLabel="Não tenho conta. Criar conta"
            variant="outline"
            size={52}
            fill
            disabled={mutation.isPending}
            onPress={() =>
              purchase ? router.replace('/cadastro?origin=compra') : router.push('/cadastro')
            }
          />
        </View>
      </KeyboardForm>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  page: { paddingBottom: spacing.xxl },
  form: { gap: spacing.lg, padding: spacing.gutter },
  intro: { gap: spacing.sm, paddingBottom: spacing.xs },
  title: typography.title,
  body: typography.body,
  meta: typography.meta,
  notice: { borderRadius: radius.card, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  noticeActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  forgot: { marginTop: -spacing.sm },
  divider: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, paddingTop: spacing.sm },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
})

import { useMutation } from '@tanstack/react-query'
import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { forgotPassword } from '@/api/auth'
import { ApiError } from '@/api/client'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export default function ForgotPasswordScreen() {
  const colors = useColors()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [requested, setRequested] = useState(false)
  const [retryUntil, setRetryUntil] = useState(0)
  const [waiting, setWaiting] = useState(0)
  const submitting = useRef(false)

  useEffect(() => {
    if (!retryUntil) return
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000))
      setWaiting(left)
      if (!left) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [retryUntil])

  const mutation = useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async (normalizedEmail: string) => {
      // Discard the response text; neither its wording nor delivery indicates
      // account existence. This endpoint must not change session credentials.
      await forgotPassword({ email: normalizedEmail })
    },
    onSuccess: () => {
      setRequested(true)
      setEmail('')
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422) {
        setEmailError('Confira o e-mail informado.')
      } else if (error instanceof ApiError && error.status === 429) {
        const seconds = Math.max(1, Math.ceil(error.retryAfterSeconds ?? 60))
        setRetryUntil(Date.now() + seconds * 1000)
        setWaiting(seconds)
        setMessage('Muitas tentativas de recuperação. Aguarde antes de solicitar outro link.')
      } else {
        setMessage('Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.')
      }
    },
  })

  const submit = async () => {
    if (submitting.current || requested || Date.now() < retryUntil) return
    setEmailError(null)
    setMessage(null)
    // Same normalization/length as requestPasswordResetValidator; final email
    // validation and all account lookup remain the server's responsibility.
    const normalized = email.trim().toLowerCase()
    if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setEmailError('Informe um e-mail válido, com até 254 caracteres.')
      return
    }
    submitting.current = true
    try { await mutation.mutateAsync(normalized) } catch { /* Safe, neutral messages above. */ }
    finally { submitting.current = false }
  }

  const back = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/sign-in')
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Recuperar senha' }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
          {requested ? <>
            <Text accessibilityRole="alert" style={[typography.body, { color: colors.foreground }]}>
              Se houver uma conta associada a este e-mail, você receberá um link para recuperar a senha.
            </Text>
            <Text style={[typography.body, { color: colors.mutedForeground }]}>
              Confira também a caixa de spam. O link abre uma página no navegador. Depois de definir sua nova senha, volte ao aplicativo e entre.
            </Text>
          </> : <>
            <Text style={[typography.body, { color: colors.mutedForeground }]}>
              Informe seu e-mail para solicitar a recuperação. O link enviado por e-mail abre no navegador, onde você poderá definir uma nova senha.
            </Text>
            <View style={styles.field}>
              <Text style={[typography.body, { color: colors.foreground }]}>E-mail</Text>
              <TextInput accessibilityLabel="E-mail" value={email} editable={!mutation.isPending}
                onChangeText={(value) => { setEmail(value); setEmailError(null) }}
                keyboardType="email-address" textContentType="emailAddress" autoCapitalize="none" autoCorrect={false}
                style={[styles.input, { backgroundColor: colors.card, borderColor: emailError ? colors.destructiveAccent : colors.input, color: colors.foreground }]} />
              {emailError ? <Text accessibilityRole="alert" style={[typography.caption, { color: colors.destructiveAccent }]}>{emailError}</Text> : null}
            </View>
            {message ? <Text accessibilityRole="alert" style={[typography.body, { color: colors.destructiveAccent }]}>{message}</Text> : null}
            {waiting > 0 ? <Text style={[typography.body, { color: colors.foreground }]}>Tente novamente em {waiting}s.</Text> : null}
            <Pressable accessibilityRole="button" disabled={mutation.isPending || waiting > 0} onPress={() => void submit()}
              style={[styles.action, { backgroundColor: colors.primary, opacity: mutation.isPending || waiting > 0 ? 0.5 : 1 }]}>
              <Text style={[styles.actionLabel, { color: colors.primaryForeground }]}>{mutation.isPending ? 'Solicitando…' : 'Solicitar link'}</Text>
            </Pressable>
          </>}
          <Pressable accessibilityRole="button" style={styles.back} disabled={mutation.isPending} onPress={back}>
            <Text style={[styles.actionLabel, { color: colors.primary }]}>Voltar para entrar</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { gap: spacing.md, padding: spacing.xl },
  field: { gap: spacing.xs },
  input: { ...typography.body, borderRadius: radius.pill, borderWidth: 1, minHeight: 48, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  action: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, padding: spacing.md },
  actionLabel: { ...typography.body, fontWeight: '700' },
  back: { minHeight: 48, justifyContent: 'center' },
})

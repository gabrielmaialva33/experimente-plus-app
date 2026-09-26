import { useMutation } from '@tanstack/react-query'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { forgotPassword } from '@/api/auth'
import { ApiError } from '@/api/client'
import { Button } from '@/components/button'
import { KeyboardForm } from '@/components/keyboard-form'
import { TextField } from '@/components/text-field'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export default function ForgotPasswordScreen() {
  const colors = useColors()
  const router = useRouter()
  // The address already typed on sign-in comes along, so it is not asked twice (audit A59).
  const params = useLocalSearchParams<{ email?: string }>()
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '')
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
      <KeyboardForm contentContainerStyle={styles.page}>
        {requested ? <>
          <View style={[styles.receipt, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
            <View style={[styles.receiptIcon, { backgroundColor: colors.successSoft }]}>
              <Ionicons name="mail-outline" size={26} color={colors.successAccent} />
            </View>
            <Text accessibilityRole="alert" style={[styles.body, { color: colors.foreground }]}>
              Se houver uma conta associada a este e-mail, você receberá um link para recuperar a senha.
            </Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              Confira também a caixa de spam. O link abre uma página no navegador. Depois de definir sua nova senha, volte ao aplicativo e entre.
            </Text>
          </View>
        </> : <>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            Informe seu e-mail para solicitar a recuperação. O link enviado por e-mail abre no navegador, onde você poderá definir uma nova senha.
          </Text>
          <TextField
            label="E-mail"
            value={email}
            editable={!mutation.isPending}
            onChangeText={(value) => { setEmail(value); setEmailError(null) }}
            error={emailError}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => void submit()}
          />
          {message ? <Text accessibilityRole="alert" style={[styles.body, { color: colors.destructiveAccent }]}>{message}</Text> : null}
          {waiting > 0 ? <Text style={[styles.body, { color: colors.foreground }]}>Tente novamente em {waiting}s.</Text> : null}
          <Button
            label={mutation.isPending ? 'Solicitando…' : 'Solicitar link'}
            size={52}
            fill
            disabled={mutation.isPending || waiting > 0}
            onPress={() => void submit()}
          />
        </>}
        <Button label="Voltar para entrar" variant="ghost" size={48} disabled={mutation.isPending} onPress={back} />
      </KeyboardForm>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { gap: spacing.lg, padding: spacing.gutter },
  body: typography.body,
  receipt: { alignItems: 'flex-start', borderRadius: radius.card, borderWidth: 1, gap: spacing.md, padding: spacing.xl },
  receiptIcon: { alignItems: 'center', borderRadius: radius.pill, height: 48, justifyContent: 'center', width: 48 },
})

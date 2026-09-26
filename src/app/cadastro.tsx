import { useMutation } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { FormTextInput, KeyboardForm } from '@/components/keyboard-form'
import { SafeAreaView } from 'react-native-safe-area-context'

import { signUp } from '@/api/auth'
import { ApiError } from '@/api/client'
import { apiUrl } from '@/api/config'
import { ChoiceControl } from '@/components/choice-control'
import { useSession } from '@/session/context'
import { emptyRegistration, registrationErrors, registrationServerErrors, type RegistrationErrors, type RegistrationFields } from '@/session/registration'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

const labels: Record<keyof RegistrationFields, string> = {
  full_name: 'Nome completo', email: 'E-mail', username: 'Usuário (opcional)',
  password: 'Senha', password_confirmation: 'Confirmar senha',
}

export default function SignUpScreen() {
  const colors = useColors()
  const router = useRouter()
  const { origin } = useLocalSearchParams<{ origin?: string }>()
  const { status, refresh } = useSession()
  const [fields, setFields] = useState({ ...emptyRegistration })
  const [accepted, setAccepted] = useState(false)
  const [errors, setErrors] = useState<RegistrationErrors>({})
  const [message, setMessage] = useState<string | null>(null)
  const [created, setCreated] = useState(false)
  const [retryUntil, setRetryUntil] = useState(0)
  const [waiting, setWaiting] = useState(0)
  const submitting = useRef(false)

  useEffect(() => {
    if (status !== 'authenticated') return
    if (origin === 'compra' && router.canGoBack()) router.back()
    else router.replace(origin === 'compra' ? '/wallet/edicoes' : '/')
  }, [status, origin, router])

  useEffect(() => {
    if (!retryUntil) return
    const update = () => setWaiting(Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000)))
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [retryUntil])

  const mutation = useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async () => {
      // Guard the mutation as well as the disabled button; consent is never inferred.
      if (!accepted || created || Date.now() < retryUntil || Object.keys(registrationErrors(fields)).length) return
      await signUp({
        full_name: fields.full_name.trim(), email: fields.email.trim().toLowerCase(),
        username: fields.username.trim().toLowerCase() || null,
        password: fields.password, password_confirmation: fields.password_confirmation,
        terms_accepted: true,
      })
      // Do not retain the credential response in the Query cache or resend a
      // successful registration if fetching the session context fails.
      setCreated(true)
      setFields({ ...emptyRegistration })
      await refresh()
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422) {
        setErrors(registrationServerErrors(error.body))
        setMessage('Confira os campos indicados para concluir seu cadastro.')
      } else if (error instanceof ApiError && error.status === 429) {
        const seconds = Math.max(1, Math.ceil(error.retryAfterSeconds ?? 60))
        setRetryUntil(Date.now() + seconds * 1000)
        setWaiting(seconds)
        setMessage('Muitas tentativas de cadastro. Aguarde antes de tentar novamente.')
      } else if (error instanceof ApiError && error.status === 400) {
        setMessage('Não foi possível aceitar os dados do cadastro. Confira os campos e tente novamente.')
      } else {
        setMessage('Não foi possível concluir o cadastro. Se a conta já foi criada, entre com seu e-mail e senha.')
      }
    },
  })

  const submit = async () => {
    if (submitting.current || !accepted || created || Date.now() < retryUntil) return
    const validation = registrationErrors(fields)
    setErrors(validation)
    setMessage(null)
    if (Object.keys(validation).length) return
    submitting.current = true
    try { await mutation.mutateAsync() } catch { /* Only the safe messages above reach the interface. */ }
    finally { submitting.current = false }
  }

  const openLegal = async (path: '/termos' | '/privacidade') => {
    try { await Linking.openURL(apiUrl(path)) }
    catch { setMessage('Não foi possível abrir o documento. Tente novamente antes de aceitar.') }
  }

  const goToSignIn = () => {
    if (origin === 'compra') router.replace('/compra/entrar')
    else if (router.canGoBack()) router.back()
    else router.replace('/sign-in')
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardForm contentContainerStyle={styles.page}>
          {created ? <>
            <Text style={[typography.heading, { color: colors.foreground }]}>Sua conta foi criada</Text>
            <Text style={[typography.body, { color: colors.foreground }]}>Estamos carregando sua conta. Se necessário, tente novamente; não precisa repetir o cadastro.</Text>
            <Pressable accessibilityRole="button" style={styles.link} onPress={() => void refresh()}>
              <Text style={[styles.actionLabel, { color: colors.primary }]}>Carregar minha conta</Text>
            </Pressable>
          </> : <>
            <Text style={[typography.body, { color: colors.mutedForeground }]}>Crie sua conta para guardar e usar benefícios. Explorar lugares continua livre.</Text>
            {(Object.keys(labels) as (keyof RegistrationFields)[]).map((field) => {
              const password = field === 'password' || field === 'password_confirmation'
              return <View key={field} style={styles.field}>
                <Text style={[typography.body, { color: colors.foreground }]}>{labels[field]}</Text>
                <FormTextInput accessibilityLabel={labels[field]} value={fields[field]} editable={!mutation.isPending}
                  onChangeText={(value) => {
                    setFields((previous) => ({ ...previous, [field]: value }))
                    setErrors((previous) => ({ ...previous, [field]: undefined }))
                  }}
                  autoCapitalize={field === 'full_name' ? 'words' : 'none'} autoCorrect={false}
                  keyboardType={field === 'email' ? 'email-address' : 'default'} secureTextEntry={password}
                  textContentType={password ? 'newPassword' : field === 'email' ? 'emailAddress' : field === 'full_name' ? 'name' : 'username'}
                  style={[styles.input, { backgroundColor: colors.card, borderColor: errors[field] ? colors.destructiveAccent : colors.input, color: colors.foreground }]} />
                {errors[field] ? <Text accessibilityRole="alert" style={[typography.caption, { color: colors.destructiveAccent }]}>{errors[field]}</Text> : null}
              </View>
            })}
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>A senha deve ter pelo menos 8 caracteres.</Text>
            <Pressable accessibilityRole="link" style={styles.link} onPress={() => void openLegal('/termos')}>
              <Text style={[styles.actionLabel, { color: colors.primary }]}>Ler Termos de Uso</Text>
            </Pressable>
            <Pressable accessibilityRole="link" style={styles.link} onPress={() => void openLegal('/privacidade')}>
              <Text style={[styles.actionLabel, { color: colors.primary }]}>Ler Política de Privacidade</Text>
            </Pressable>
            <ChoiceControl shape="segment" role="checkbox" label="Li e aceito os Termos de Uso e a Política de Privacidade"
              selected={accepted} disabled={mutation.isPending} onPress={() => {
                setAccepted(!accepted)
                setErrors((previous) => ({ ...previous, terms_accepted: undefined }))
              }} />
            {errors.terms_accepted ? <Text accessibilityRole="alert" style={[typography.caption, { color: colors.destructiveAccent }]}>{errors.terms_accepted}</Text> : null}
            {message ? <Text accessibilityRole="alert" style={[typography.body, { color: colors.destructiveAccent }]}>{message}</Text> : null}
            {waiting > 0 ? <Text style={[typography.body, { color: colors.foreground }]}>Tente novamente em {waiting}s.</Text> : null}
            <Pressable accessibilityRole="button" disabled={!accepted || mutation.isPending || waiting > 0}
              onPress={() => void submit()} style={[styles.action, { backgroundColor: colors.cta, opacity: !accepted || mutation.isPending || waiting > 0 ? 0.5 : 1 }]}>
              <Text style={[styles.actionLabel, { color: colors.ctaForeground }]}>{mutation.isPending ? 'Criando conta…' : 'Criar conta'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={mutation.isPending} style={styles.link} onPress={goToSignIn}>
              <Text style={[styles.actionLabel, { color: colors.primary }]}>Já tenho conta. Entrar</Text>
            </Pressable>
          </>}
      </KeyboardForm>
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
  link: { minHeight: 48, justifyContent: 'center' },
})

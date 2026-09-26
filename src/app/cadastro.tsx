import { useMutation } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useEffect, useRef, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { signUp } from '@/api/auth'
import { ApiError } from '@/api/client'
import { apiUrl } from '@/api/config'
import { Button } from '@/components/button'
import { Checkbox } from '@/components/checkbox'
import { KeyboardForm } from '@/components/keyboard-form'
import { TextField } from '@/components/text-field'
import { useSession } from '@/session/context'
import { emptyRegistration, registrationErrors, registrationServerErrors, type RegistrationErrors, type RegistrationFields } from '@/session/registration'
import { minTouch, radius, spacing, typography, textWeight } from '@/theme/tokens'
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
    if (origin === 'compra') {
      if (router.canGoBack()) router.back()
      else router.replace('/wallet/edicoes')
    // A person who just created the account here sees the next step first;
    // one who arrives already signed in has nothing to do on this screen.
    } else if (!created) router.replace('/')
  }, [status, origin, router, created])

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
    if (submitting.current || created || Date.now() < retryUntil) return
    const validation: RegistrationErrors = {
      ...registrationErrors(fields),
      ...(accepted ? {} : { terms_accepted: 'Leia e aceite os Termos de Uso e a Política de Privacidade.' }),
    }
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
          {created ? (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <View style={[styles.badge, { backgroundColor: colors.successSoft }]}>
                <Ionicons name="checkmark" size={28} color={colors.successAccent} />
              </View>
              <Text accessibilityRole="header" style={[typography.title, { color: colors.foreground }]}>Sua conta foi criada</Text>
              {status === 'authenticated' ? <>
                {/* Audit A18: the first thing worth doing next, instead of a silent jump to Explorar. */}
                <Text style={[typography.body, { color: colors.mutedForeground }]}>
                  Conte do que você gosta e o Para você, em Explorar, passa a sugerir lugares assim.
                </Text>
                <Button label="Escolha seus interesses" size={52} fill onPress={() => router.replace('/conta/interesses')} />
                <Button label="Começar a explorar" variant="ghost" fill onPress={() => router.replace('/')} />
              </> : <>
                <Text style={[typography.body, { color: colors.foreground }]}>Estamos carregando sua conta. Se necessário, tente novamente; não precisa repetir o cadastro.</Text>
                <Button label="Carregar minha conta" variant="outline" fill onPress={() => void refresh()} />
              </>}
            </View>
          ) : <>
            <Text style={[typography.body, { color: colors.mutedForeground }]}>Crie sua conta para guardar e usar benefícios. Explorar lugares continua livre.</Text>
            {(Object.keys(labels) as (keyof RegistrationFields)[]).map((field) => {
              const password = field === 'password' || field === 'password_confirmation'
              return <TextField key={field} label={labels[field]} value={fields[field]} editable={!mutation.isPending}
                error={errors[field]} hint={field === 'password' ? 'Use pelo menos 8 caracteres.' : null} secure={password}
                onChangeText={(value) => {
                  setFields((previous) => ({ ...previous, [field]: value }))
                  setErrors((previous) => ({ ...previous, [field]: undefined }))
                }}
                autoCapitalize={field === 'full_name' ? 'words' : 'none'} autoCorrect={false}
                keyboardType={field === 'email' ? 'email-address' : 'default'}
                textContentType={password ? 'newPassword' : field === 'email' ? 'emailAddress' : field === 'full_name' ? 'name' : 'username'} />
            })}
            {/* Audit A55: a box that is drawn whether or not it is ticked. */}
            <Checkbox testID="terms" label={consent} checked={accepted} disabled={mutation.isPending} onPress={() => {
              setAccepted(!accepted)
              setErrors((previous) => ({ ...previous, terms_accepted: undefined }))
            }}>
              <View style={styles.legal}>
                <Pressable accessibilityRole="link" style={styles.link} onPress={() => void openLegal('/termos')}>
                  <Text style={[styles.linkLabel, { color: colors.primary }]}>Ler Termos de Uso</Text>
                </Pressable>
                <Pressable accessibilityRole="link" style={styles.link} onPress={() => void openLegal('/privacidade')}>
                  <Text style={[styles.linkLabel, { color: colors.primary }]}>Ler Política de Privacidade</Text>
                </Pressable>
              </View>
            </Checkbox>
            {errors.terms_accepted ? <Text accessibilityRole="alert" style={[typography.meta, { color: colors.destructiveAccent }]}>{errors.terms_accepted}</Text> : null}
            {message ? <Text accessibilityRole="alert" style={[typography.body, { color: colors.destructiveAccent }]}>{message}</Text> : null}
            {waiting > 0 ? <Text style={[typography.body, { color: colors.foreground }]}>Tente novamente em {waiting}s.</Text> : null}
            {/* Audit A17: the button stays available and a press says what is missing,
                field by field, instead of an unexplained disabled button. */}
            <Button label={mutation.isPending ? 'Criando conta…' : 'Criar conta'} variant="cta" size={52} fill
              disabled={mutation.isPending || waiting > 0} onPress={() => void submit()} />
            <Button label="Já tenho conta. Entrar" variant="ghost" fill disabled={mutation.isPending} onPress={goToSignIn} />
          </>}
      </KeyboardForm>
    </SafeAreaView>
  )
}

const consent = 'Li e aceito os Termos de Uso e a Política de Privacidade'

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { gap: spacing.lg, padding: spacing.gutter, paddingBottom: spacing.xxl },
  card: { alignItems: 'flex-start', borderRadius: radius.card, borderWidth: 1, gap: spacing.md, padding: spacing.xl },
  badge: { alignItems: 'center', borderRadius: radius.pill, height: 52, justifyContent: 'center', width: 52 },
  legal: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, paddingLeft: 24 + spacing.md },
  link: { minHeight: minTouch, justifyContent: 'center' },
  linkLabel: { ...typography.label, ...textWeight('700') },
})

import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import { Linking } from 'react-native'

import SignUpScreen from '@/app/cadastro'
import SignInScreen from '@/app/(tabs)/sign-in'
import PurchaseSignInScreen from '@/app/compra/entrar'
import { ApiError } from '@/api/client'
import { apiUrl } from '@/api/config'
import { palette } from '@/theme/tokens'
import { registrationErrors } from '@/session/registration'

jest.mock('expo-router', () => ({ useRouter: jest.fn(), useLocalSearchParams: jest.fn() }))
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: jest.requireActual('react-native').View }))
jest.mock('@/session/context', () => ({ useSession: jest.fn() }))
jest.mock('@/api/auth', () => ({ signUp: jest.fn(), signIn: jest.fn() }))
jest.mock('@/api/session', () => ({}))
jest.mock('@/theme/use-colors', () => ({ useColors: jest.fn() }))

const api = jest.requireMock('@/api/auth') as { signUp: jest.Mock }
const session = jest.requireMock('@/session/context') as { useSession: jest.Mock }
const routing = jest.requireMock('expo-router') as { useRouter: jest.Mock; useLocalSearchParams: jest.Mock }
const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) }
const refresh = jest.fn(async () => {})
const valid = { full_name: 'Ana Silva', email: 'ana@example.com', username: '', password: 'test-password', password_confirmation: 'test-password' }
const consent = 'Li e aceito os Termos de Uso e a Política de Privacidade'

const page = (node: React.ReactNode = <SignUpScreen />) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } })}>{node}</QueryClientProvider>
)
async function fill(view: Awaited<ReturnType<typeof page>>, fields = valid) {
  for (const [label, key] of [['Nome completo', 'full_name'], ['E-mail', 'email'], ['Usuário (opcional)', 'username'], ['Senha', 'password'], ['Confirmar senha', 'password_confirmation']] as const) {
    await fireEvent.changeText(view.getByLabelText(label), fields[key])
  }
}

beforeAll(() => notifyManager.setScheduler((notify) => notify()))
afterAll(() => notifyManager.setScheduler((notify) => { setTimeout(notify, 0) }))
beforeEach(() => {
  jest.clearAllMocks()
  api.signUp.mockResolvedValue({})
  refresh.mockResolvedValue(undefined)
  session.useSession.mockReturnValue({ status: 'anonymous', refresh })
  routing.useRouter.mockReturnValue(router)
  routing.useLocalSearchParams.mockReturnValue({})
  router.canGoBack.mockReturnValue(true)
  jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette.light)
})
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

it('requires explicit consent, links both actual legal pages, normalizes optional username and refreshes the session', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
  const view = await page()
  await fill(view, { ...valid, full_name: ' Ana Silva ', email: ' ANA@example.com ', username: '   ' })
  const submit = view.getByRole('button', { name: 'Criar conta' })
  // Audit A17: the button stays available and a press says what is missing.
  expect(submit).toBeEnabled()
  await fireEvent.press(submit)
  expect(view.getByRole('alert')).toHaveTextContent('Leia e aceite os Termos de Uso e a Política de Privacidade.')
  expect(api.signUp).not.toHaveBeenCalled()
  await fireEvent.press(view.getByRole('link', { name: 'Ler Termos de Uso' }))
  await fireEvent.press(view.getByRole('link', { name: 'Ler Política de Privacidade' }))
  expect(open).toHaveBeenNthCalledWith(1, apiUrl('/termos'))
  expect(open).toHaveBeenNthCalledWith(2, apiUrl('/privacidade'))
  // Reading the documents is not consent.
  expect(view.getByRole('checkbox', { name: consent })).not.toBeChecked()
  await fireEvent.press(view.getByRole('checkbox', { name: consent }))
  expect(view.queryByRole('alert')).toBeNull()
  await fireEvent.press(view.getByRole('button', { name: 'Criar conta' }))
  await waitFor(() => expect(api.signUp).toHaveBeenCalledWith({ ...valid, username: null, terms_accepted: true }))
  expect(refresh).toHaveBeenCalledTimes(1)
  expect(view.getByText('Sua conta foi criada')).toBeOnTheScreen()
  expect(view.queryByLabelText('Senha')).toBeNull()
})

it('explains every missing field and the consent on one press, without a request', async () => {
  const view = await page()
  await fireEvent.press(view.getByRole('button', { name: 'Criar conta' }))
  // Name, e-mail, password, confirmation and consent; the optional username is fine empty.
  expect(view.getAllByRole('alert')).toHaveLength(5)
  expect(view.getByLabelText('Nome completo').props.accessibilityHint).toBe('Informe seu nome, com até 255 caracteres.')
  expect(api.signUp).not.toHaveBeenCalled()
})

it.each(['light', 'dark'] as const)('draws the consent box even when it is not ticked in %s', async (mode) => {
  jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette[mode])
  const view = await page()
  expect(view.getByTestId('terms-box')).toHaveStyle({ borderColor: palette[mode].choiceBorder, borderWidth: 2, width: 24 })
  await fireEvent.press(view.getByRole('checkbox', { name: consent }))
  expect(view.getByRole('checkbox', { name: consent })).toBeChecked()
  expect(view.getByTestId('terms-box')).toHaveStyle({ backgroundColor: palette[mode].primary })
})

it('offers interests as the next step once the new account is loaded', async () => {
  const view = await page()
  await fill(view)
  await fireEvent.press(view.getByRole('checkbox', { name: consent }))
  // Loading the context is what signs the new account in.
  refresh.mockImplementationOnce(async () => { session.useSession.mockReturnValue({ status: 'authenticated', refresh }) })
  await fireEvent.press(view.getByRole('button', { name: 'Criar conta' }))

  expect(await view.findByRole('button', { name: 'Escolha seus interesses' })).toBeOnTheScreen()
  expect(view.getByRole('header', { name: 'Sua conta foi criada' })).toBeOnTheScreen()
  expect(router.replace).not.toHaveBeenCalled()
  await fireEvent.press(view.getByRole('button', { name: 'Escolha seus interesses' }))
  expect(router.replace).toHaveBeenCalledWith('/conta/interesses')
  await fireEvent.press(view.getByRole('button', { name: 'Começar a explorar' }))
  expect(router.replace).toHaveBeenLastCalledWith('/')
})

it('leaves the screen at once when already signed in', async () => {
  session.useSession.mockReturnValue({ status: 'authenticated', refresh })
  await page()
  expect(router.replace).toHaveBeenCalledWith('/')
})

it('shows local field errors without making a request', async () => {
  const view = await page()
  expect(view.getByTestId('keyboard-form')).toBeOnTheScreen()
  await fill(view, { full_name: ' ', email: 'bad', username: '!!', password: 'short', password_confirmation: 'different' })
  await fireEvent.press(view.getByRole('checkbox', { name: consent }))
  await fireEvent.press(view.getByRole('button', { name: 'Criar conta' }))
  expect(view.getAllByRole('alert')).toHaveLength(5)
  expect(view.getByText('As senhas precisam ser iguais.')).toBeOnTheScreen()
  expect(api.signUp).not.toHaveBeenCalled()
})

it.each([
  ['full_name', 'x'.repeat(256)], ['email', 'x'.repeat(246) + '@test.com'],
  ['username', 'ab'], ['username', 'a'.repeat(81)], ['username', '.ana'], ['password', '1234567'],
] as const)('enforces the backend boundary for %s (%#)', (field, value) => {
  expect(registrationErrors({ ...valid, [field]: value })).toHaveProperty(field)
})

it('accepts valid boundary values and a canonicalizable username', () => {
  expect(registrationErrors({ ...valid, full_name: 'x'.repeat(255), email: 'x'.repeat(245) + '@test.com', username: 'A'.repeat(80) })).toEqual({})
})

it('maps 422 errors to fields without displaying submitted or arbitrary server values', async () => {
  api.signUp.mockRejectedValue(new ApiError(422, { errors: [
    { field: 'email', rule: 'database.unique', message: 'private-email' },
    { field: 'username', rule: 'database.unique', message: 'private-username' },
    { field: 'password', rule: 'confirmed', message: 'private-password' },
    { field: 'terms_accepted', rule: 'accepted', message: 'private-terms' },
  ] }))
  const view = await page()
  await fill(view)
  await fireEvent.press(view.getByRole('checkbox', { name: consent }))
  await fireEvent.press(view.getByRole('button', { name: 'Criar conta' }))
  expect(await view.findByText('Este e-mail já está cadastrado. Entre na sua conta.')).toBeOnTheScreen()
  expect(view.getByText('Este usuário já está em uso. Escolha outro.')).toBeOnTheScreen()
  expect(view.getByText('As senhas precisam ser iguais.')).toBeOnTheScreen()
  expect(view.getByText('Leia e aceite os Termos de Uso e a Política de Privacidade.')).toBeOnTheScreen()
  expect(view.queryByText(/private-/)).toBeNull()
  expect(api.signUp).toHaveBeenCalledTimes(1)
  expect(refresh).not.toHaveBeenCalled()
})

it('explains a 400 without retrying or authenticating', async () => {
  api.signUp.mockRejectedValue(new ApiError(400, {}))
  const view = await page()
  await fill(view)
  await fireEvent.press(view.getByRole('checkbox', { name: consent }))
  await fireEvent.press(view.getByRole('button', { name: 'Criar conta' }))
  expect(await view.findByText(/Não foi possível aceitar os dados/)).toBeOnTheScreen()
  expect(api.signUp).toHaveBeenCalledTimes(1)
  expect(refresh).not.toHaveBeenCalled()
})

it('explains the auth rate limit and waits for Retry-After without automatic replay', async () => {
  jest.useFakeTimers()
  api.signUp.mockRejectedValue(new ApiError(429, {}, 3))
  const view = await page()
  await fill(view)
  await fireEvent.press(view.getByRole('checkbox', { name: consent }))
  await fireEvent.press(view.getByRole('button', { name: 'Criar conta' }))
  expect(view.getByText(/Muitas tentativas de cadastro/)).toBeOnTheScreen()
  expect(view.getByText('Tente novamente em 3s.')).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Criar conta' })).toBeDisabled()
  await act(async () => { jest.advanceTimersByTime(3000) })
  expect(view.getByRole('button', { name: 'Criar conta' })).toBeEnabled()
  expect(api.signUp).toHaveBeenCalledTimes(1)
})

it('does not resend a successful registration if context loading fails', async () => {
  refresh.mockRejectedValueOnce(new Error('offline'))
  const view = await page()
  await fill(view)
  await fireEvent.press(view.getByRole('checkbox', { name: consent }))
  await fireEvent.press(view.getByRole('button', { name: 'Criar conta' }))
  expect(await view.findByText('Sua conta foi criada')).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('button', { name: 'Carregar minha conta' }))
  expect(refresh).toHaveBeenCalledTimes(2)
  expect(api.signUp).toHaveBeenCalledTimes(1)
})

it('opens registration from the sign-in tab and returns to sign-in', async () => {
  const view = await page(<SignInScreen />)
  await fireEvent.press(view.getByRole('button', { name: 'Não tenho conta. Criar conta' }))
  expect(router.push).toHaveBeenCalledWith('/cadastro')
  await view.unmount()
  const registration = await page()
  await fireEvent.press(registration.getByRole('button', { name: 'Já tenho conta. Entrar' }))
  expect(router.back).toHaveBeenCalledTimes(1)
})

it('replaces the purchase gate, supports returning to sign-in and returns to the product after authentication', async () => {
  const gate = await page(<PurchaseSignInScreen />)
  await fireEvent.press(gate.getByRole('button', { name: 'Não tenho conta. Criar conta' }))
  expect(router.replace).toHaveBeenCalledWith('/cadastro?origin=compra')
  await gate.unmount()
  routing.useLocalSearchParams.mockReturnValue({ origin: 'compra' })
  const view = await page()
  await fireEvent.press(view.getByRole('button', { name: 'Já tenho conta. Entrar' }))
  expect(router.replace).toHaveBeenLastCalledWith('/compra/entrar')
  session.useSession.mockReturnValue({ status: 'authenticated', refresh })
  await view.rerender(<QueryClientProvider client={new QueryClient()}><SignUpScreen /></QueryClientProvider>)
  expect(router.back).toHaveBeenCalledTimes(1)
})

it.each(['light', 'dark'] as const)('uses existing theme tokens for fields, navigation and conversion in %s', async (mode) => {
  jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette[mode])
  const view = await page()
  expect(view.getByLabelText('Nome completo')).toHaveStyle({ color: palette[mode].foreground })
  expect(view.getByText('Ler Termos de Uso')).toHaveStyle({ color: palette[mode].primary })
  expect(view.getByRole('button', { name: 'Criar conta' })).toHaveStyle({ backgroundColor: palette[mode].cta })
  expect(view.getByText('Criar conta')).toHaveStyle({ color: palette[mode].ctaForeground })
})

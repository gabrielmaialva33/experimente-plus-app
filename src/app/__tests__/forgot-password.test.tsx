import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render } from '@testing-library/react-native'

import ForgotPasswordScreen from '@/app/recuperar-senha'
import SignInScreen from '@/app/(tabs)/sign-in'
import PurchaseSignInScreen from '@/app/compra/entrar'
import { ApiError } from '@/api/client'
import { palette } from '@/theme/tokens'

jest.mock('expo-router', () => ({ useRouter: jest.fn(), useLocalSearchParams: jest.fn(), Stack: { Screen: () => null } }))
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: jest.requireActual('react-native').View }))
jest.mock('@/session/context', () => ({ useSession: () => ({ status: 'anonymous', refresh: jest.fn() }) }))
jest.mock('@/api/auth', () => ({ forgotPassword: jest.fn(), signIn: jest.fn() }))
jest.mock('@/api/session', () => ({}))
jest.mock('@/theme/use-colors', () => ({ useColors: jest.fn() }))

const api = jest.requireMock('@/api/auth') as { forgotPassword: jest.Mock }
const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) }
const page = (node: React.ReactNode = <ForgotPasswordScreen />) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } })}>{node}</QueryClientProvider>
)
async function submit(view: Awaited<ReturnType<typeof page>>, email = ' Person@example.com ') {
  await fireEvent.changeText(view.getByLabelText('E-mail'), email)
  await fireEvent.press(view.getByRole('button', { name: 'Solicitar link' }))
}

beforeAll(() => notifyManager.setScheduler((notify) => notify()))
afterAll(() => notifyManager.setScheduler((notify) => { setTimeout(notify, 0) }))
beforeEach(() => {
  jest.clearAllMocks()
  api.forgotPassword.mockResolvedValue({ message: 'arbitrary-server-text' })
  jest.requireMock('expo-router').useRouter.mockReturnValue(router)
  jest.requireMock('expo-router').useLocalSearchParams.mockReturnValue({})
  router.canGoBack.mockReturnValue(true)
  jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette.light)
})
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

it('shows a neutral receipt and tells the user to use the email link in a browser, then return to sign in', async () => {
  const view = await page()
  expect(view.getByText(/O link enviado por e-mail abre no navegador/)).toBeOnTheScreen()
  await submit(view)
  expect(api.forgotPassword).toHaveBeenCalledWith({ email: 'person@example.com' })
  expect(api.forgotPassword).toHaveBeenCalledTimes(1)
  expect(await view.findByText('Se houver uma conta associada a este e-mail, você receberá um link para recuperar a senha.')).toBeOnTheScreen()
  expect(view.getByText(/O link abre uma página no navegador.*volte ao aplicativo e entre/)).toBeOnTheScreen()
  expect(view.queryByText('arbitrary-server-text')).toBeNull()
  expect(view.queryByLabelText('E-mail')).toBeNull()
  expect(view.queryByLabelText(/senha/i)).toBeNull()
  expect(router.push).not.toHaveBeenCalled()
  await fireEvent.press(view.getByRole('button', { name: 'Voltar para entrar' }))
  expect(router.back).toHaveBeenCalledTimes(1)
})

it.each(['', ' ', 'invalid', 'x'.repeat(246) + '@test.com'])('validates email before sending: %p', async (email) => {
  const view = await page()
  await submit(view, email)
  expect(view.getByText('Informe um e-mail válido, com até 254 caracteres.')).toBeOnTheScreen()
  expect(api.forgotPassword).not.toHaveBeenCalled()
})

it('places a 422 under the email field without echoing private server content', async () => {
  api.forgotPassword.mockRejectedValue(new ApiError(422, { errors: [{ field: 'email', rule: 'email', message: 'private-address' }] }))
  const view = await page()
  await submit(view)
  const error = await view.findByText('Confira o e-mail informado.')
  // The message belongs to the field: drawn under it and read with it.
  expect(error).toBeOnTheScreen()
  expect(view.getByLabelText('E-mail').props.accessibilityHint).toBe('Confira o e-mail informado.')
  expect(view.queryByText('private-address')).toBeNull()
  expect(view.queryByText(/Se houver uma conta/)).toBeNull()
  expect(api.forgotPassword).toHaveBeenCalledTimes(1)
})

it.each([3, undefined])('waits on 429, including missing Retry-After (%p), with no automatic retry', async (retryAfter) => {
  jest.useFakeTimers()
  api.forgotPassword.mockRejectedValue(new ApiError(429, {}, retryAfter))
  const view = await page()
  await submit(view)
  expect(view.getByText(/Muitas tentativas de recuperação/)).toBeOnTheScreen()
  expect(view.getByText(`Tente novamente em ${retryAfter ?? 60}s.`)).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Solicitar link' })).toBeDisabled()
  await fireEvent.changeText(view.getByLabelText('E-mail'), 'another@example.com')
  await fireEvent.press(view.getByRole('button', { name: 'Solicitar link' }))
  expect(api.forgotPassword).toHaveBeenCalledTimes(1)
  await act(async () => { jest.advanceTimersByTime((retryAfter ?? 60) * 1000) })
  expect(view.getByRole('button', { name: 'Solicitar link' })).toBeEnabled()
  expect(api.forgotPassword).toHaveBeenCalledTimes(1)
  await view.unmount()
  await act(async () => { jest.advanceTimersByTime(60_000) })
  expect(api.forgotPassword).toHaveBeenCalledTimes(1)
})

it.each([new TypeError('offline'), new ApiError(400, {})])('does not claim success after a failed request', async (error) => {
  api.forgotPassword.mockRejectedValue(error)
  const view = await page()
  await submit(view)
  expect(await view.findByText('Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.')).toBeOnTheScreen()
  expect(view.queryByText(/Se houver uma conta/)).toBeNull()
  expect(api.forgotPassword).toHaveBeenCalledTimes(1)
})

it('prevents repeated taps while the request is in flight', async () => {
  let finish!: () => void
  api.forgotPassword.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve }))
  const view = await page()
  await submit(view)
  const pending = view.getByRole('button', { name: 'Solicitando…' })
  expect(pending).toBeDisabled()
  await fireEvent.press(pending)
  expect(api.forgotPassword).toHaveBeenCalledTimes(1)
  await act(async () => { finish() })
})

it.each([SignInScreen, PurchaseSignInScreen])('is reachable from both sign-in entry points (%#)', async (Screen) => {
  const view = await page(<Screen />)
  await fireEvent.press(view.getByRole('button', { name: 'Esqueci minha senha' }))
  expect(router.push).toHaveBeenCalledWith('/recuperar-senha')
  expect(router.replace).not.toHaveBeenCalled()
  expect(view.getByRole('button', { name: 'Não tenho conta. Criar conta' })).toBeOnTheScreen()
})

// Audit A59: the address typed on sign-in used to be asked for again.
it('carries an e-mail typed on sign-in into recovery', async () => {
  const signIn = await page(<SignInScreen />)
  await fireEvent.changeText(signIn.getByLabelText('E-mail ou usuário'), ' ana@example.com ')
  await fireEvent.press(signIn.getByRole('button', { name: 'Esqueci minha senha' }))
  expect(router.push).toHaveBeenCalledWith({ pathname: '/recuperar-senha', params: { email: 'ana@example.com' } })
  await signIn.unmount()

  jest.requireMock('expo-router').useLocalSearchParams.mockReturnValue({ email: 'ana@example.com' })
  const view = await page()
  expect(view.getByLabelText('E-mail')).toHaveDisplayValue('ana@example.com')
  await fireEvent.press(view.getByRole('button', { name: 'Solicitar link' }))
  expect(api.forgotPassword).toHaveBeenCalledWith({ email: 'ana@example.com' })
})

it('does not carry a username into recovery', async () => {
  const view = await page(<SignInScreen />)
  await fireEvent.changeText(view.getByLabelText('E-mail ou usuário'), 'ana')
  await fireEvent.press(view.getByRole('button', { name: 'Esqueci minha senha' }))
  expect(router.push).toHaveBeenCalledWith('/recuperar-senha')
})

it('falls back to sign-in when opened without a previous route', async () => {
  router.canGoBack.mockReturnValue(false)
  const view = await page()
  await fireEvent.press(view.getByRole('button', { name: 'Voltar para entrar' }))
  expect(router.replace).toHaveBeenCalledWith('/sign-in')
})

it.each(['light', 'dark'] as const)('uses only existing theme roles in %s', async (mode) => {
  jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette[mode])
  const view = await page()
  expect(view.getByLabelText('E-mail')).toHaveStyle({ color: palette[mode].foreground })
  expect(view.getByRole('button', { name: 'Solicitar link' })).toHaveStyle({ backgroundColor: palette[mode].primary })
  expect(view.getByText('Solicitar link')).toHaveStyle({ color: palette[mode].primaryForeground })
  expect(view.getByText('Voltar para entrar')).toHaveStyle({ color: palette[mode].primary })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render } from '@testing-library/react-native'
import * as WebBrowser from 'expo-web-browser'
import { AccessibilityInfo } from 'react-native'

import { apiBaseUrl } from '@/api/config'
import SignInScreen from '@/session/sign-in-screen'
import { palette } from '@/theme/tokens'

const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))
jest.mock('@/session/context', () => ({ useSession: jest.fn() }))
jest.mock('@/api/auth', () => ({ signIn: jest.fn() }))
jest.mock('@/api/client', () => ({ ApiError: jest.requireActual('@/api/transport').ApiError }))
jest.mock('@/theme/use-colors', () => ({ useColors: jest.fn() }))
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(async () => ({ type: 'opened' })),
}))

const auth = jest.requireMock('@/api/auth') as { signIn: jest.Mock }
const session = jest.requireMock('@/session/context') as { useSession: jest.Mock }

const page = (purchase = false) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { gcTime: Infinity } } })}
    >
      <SignInScreen purchase={purchase} />
    </QueryClientProvider>
  )

beforeEach(() => {
  jest.clearAllMocks()
  jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette.light)
  session.useSession.mockReturnValue({
    status: 'anonymous',
    refresh: jest.fn(),
    signOut: jest.fn(),
  })
  auth.signIn.mockResolvedValue(undefined)
})

// Audit A36: a placeholder that vanishes while typing is not a label.
it('says what the account is for and keeps labels above the fields', async () => {
  const view = await page()

  expect(view.getByRole('header', { name: 'Entre na sua conta' })).toBeOnTheScreen()
  expect(view.getByText(/Explorar continua aberto sem login/)).toBeOnTheScreen()
  await fireEvent.changeText(view.getByLabelText('E-mail ou usuário'), 'ana')
  await fireEvent.changeText(view.getByLabelText('Senha'), 'test-password')
  expect(view.getByText('E-mail ou usuário')).toBeOnTheScreen()
  expect(view.getByText('Senha')).toBeOnTheScreen()

  await fireEvent.press(view.getByRole('button', { name: 'Entrar' }))
  expect(auth.signIn).toHaveBeenCalledWith('ana', 'test-password')
})

// The refusal appears under the form while focus is on "Entrar": it is said, once.
it('says why the sign-in was refused', async () => {
  const { ApiError } = jest.requireActual('@/api/transport')
  auth.signIn.mockRejectedValue(new ApiError(400, null))
  const view = await page()
  await fireEvent.changeText(view.getByLabelText('E-mail ou usuário'), 'ana')
  await fireEvent.changeText(view.getByLabelText('Senha'), 'test-password')

  await fireEvent.press(view.getByRole('button', { name: 'Entrar' }))

  expect(await view.findByRole('alert')).toHaveTextContent('Dados de acesso incorretos.')
  expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1)
  expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
    'Dados de acesso incorretos.'
  )
})

it('lets the password be shown before it is sent', async () => {
  const view = await page()
  const password = view.getByLabelText('Senha')
  expect(password).toHaveProp('secureTextEntry', true)

  await fireEvent.press(view.getByRole('button', { name: 'Mostrar senha' }))
  expect(view.getByLabelText('Senha')).toHaveProp('secureTextEntry', false)
  await fireEvent.press(view.getByRole('button', { name: 'Ocultar senha' }))
  expect(view.getByLabelText('Senha')).toHaveProp('secureTextEntry', true)
})

it.each(['light', 'dark'] as const)(
  'offers account creation as a secondary button in %s',
  async (mode) => {
    jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette[mode])
    const view = await page()

    const create = view.getByRole('button', { name: 'Não tenho conta. Criar conta' })
    expect(create).toHaveStyle({
      borderColor: palette[mode].primary,
      backgroundColor: 'transparent',
    })
    expect(view.getByText('Criar conta')).toBeOnTheScreen()
    await fireEvent.press(create)
    expect(mockPush).toHaveBeenCalledWith('/cadastro')
  }
)

it('keeps the purchase in the flow when creating an account from checkout', async () => {
  const view = await page(true)

  expect(view.getByRole('header', { name: 'Entre para concluir a compra' })).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('button', { name: 'Não tenho conta. Criar conta' }))
  expect(mockReplace).toHaveBeenCalledWith('/cadastro?origin=compra')
})

// A visitor's way into the manual, and only on the tab: the purchase step keeps to its task.
it('offers a visitor the manual under the sign-in tab, not in the purchase step', async () => {
  const view = await page()
  await fireEvent.press(view.getByRole('link', { name: 'Abrir o manual: como usar o app' }))
  expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
    `${apiBaseUrl}/manual`,
    expect.any(Object)
  )
  expect(mockPush).not.toHaveBeenCalled()

  const purchase = await page(true)
  expect(purchase.queryByRole('link', { name: /Abrir o manual/ })).toBeNull()
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import type { ReactElement } from 'react'

import { palette } from '@/theme/tokens'
import type { MobileUser } from '@/api/me'
import AccountScreen from '@/app/(tabs)/account'
import ProfileScreen from '@/app/conta/perfil'

const mockPush = jest.fn()

jest.mock('@/theme/use-colors', () => ({ useColors: jest.fn() }))
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  Tabs: { Screen: () => null },
  Stack: { Screen: () => null },
}))
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock('@/api/client', () => ({
  request: jest.fn(),
  ApiError: jest.requireActual('@/api/transport').ApiError,
}))
jest.mock('@/session/context', () => ({ useSession: jest.fn() }))
jest.mock('@/catalog/city-store', () => ({ useSelectedCity: jest.fn(() => 'londrina'), selectCity: jest.fn() }))
jest.mock('@/catalog/queries', () => ({
  useCities: () => ({ data: [{ slug: 'londrina', name: 'Londrina', state_code: 'PR' }] }),
}))

const api = jest.requireMock('@/api/client') as { request: jest.Mock }
const session = jest.requireMock('@/session/context') as { useSession: jest.Mock }
const { ApiError } = jest.requireActual('@/api/transport') as typeof import('@/api/transport')

const user = (username: string | null = 'ana'): MobileUser => ({
  id: 1,
  full_name: 'Ana Silva',
  email: 'ana@example.com',
  username,
  email_verified: true,
  email_verified_at: null,
})

function mockSession(overrides: Record<string, unknown> = {}, username: string | null = 'ana') {
  const signOut = jest.fn()
  session.useSession.mockReturnValue({
    context: { user: user(username), active_operation: { name: 'Operação Norte' } },
    capabilities: { partner: { enabled: false } },
    refresh: jest.fn(),
    signOut,
    ...overrides,
  })
  return { signOut }
}

function renderWithClient(screen: ReactElement) {
  const client = new QueryClient({ defaultOptions: { mutations: { gcTime: Infinity } } })
  return render(<QueryClientProvider client={client}>{screen}</QueryClientProvider>)
}

async function renderProfile(username: string | null = 'ana') {
  mockSession({}, username)
  api.request.mockImplementation(async (_path: string, options: { body: Partial<MobileUser> }) => ({
    user: { ...user(username), ...options.body },
  }))
  return renderWithClient(<ProfileScreen />)
}

async function expectProfilePatch(body: { full_name?: string; username?: string | null }) {
  await waitFor(() =>
    expect(api.request).toHaveBeenCalledWith('/api/v1/me', {
      method: 'PATCH',
      authenticated: true,
      body,
    })
  )
  expect(api.request).toHaveBeenCalledTimes(1)
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette.light)
})

describe('account hub', () => {
  it('shows who is signed in and opens profile editing on its own screen', async () => {
    mockSession()
    const view = await renderWithClient(<AccountScreen />)

    expect(view.getByRole('header', { name: 'Ana Silva' })).toBeOnTheScreen()
    expect(view.getByText('ana@example.com')).toBeOnTheScreen()
    // The hub is not a form any more.
    expect(view.queryByLabelText('Nome')).toBeNull()

    await fireEvent.press(view.getByRole('button', { name: 'Editar perfil' }))
    expect(mockPush).toHaveBeenCalledWith('/conta/perfil')
  })

  it('groups the rows into my things, preferences and account', async () => {
    mockSession()
    const view = await renderWithClient(<AccountScreen />)

    expect(view.getByRole('header', { name: 'Minhas coisas' })).toBeOnTheScreen()
    expect(view.getByRole('header', { name: 'Preferências' })).toBeOnTheScreen()
    expect(view.getByRole('header', { name: 'Conta' })).toBeOnTheScreen()

    const routes = [
      ['Favoritos', '/conta/favoritos'],
      ['Seguindo', '/conta/seguindo'],
      ['Roteiros', '/roteiros'],
      ['Avaliações', '/conta/avaliacoes'],
      ['Interesses', '/conta/interesses'],
      ['Cidade, Londrina', '/conta/cidade'],
      ['Excluir conta', '/conta/excluir'],
    ] as const
    for (const [name, href] of routes) {
      await fireEvent.press(view.getByRole('button', { name }))
      expect(mockPush).toHaveBeenLastCalledWith(href)
    }
  })

  it('hides the active operation from a consumer and shows it to a partner', async () => {
    mockSession()
    const consumer = await renderWithClient(<AccountScreen />)
    expect(consumer.queryByText(/Operação/)).toBeNull()
    await consumer.unmount()

    mockSession({ capabilities: { partner: { enabled: true } } })
    const partner = await renderWithClient(<AccountScreen />)
    expect(partner.getByText('Operação ativa: Operação Norte')).toBeOnTheScreen()
  })

  it.each(['light', 'dark'] as const)('keeps sign-out plain and deletion discreet red in %s', async (mode) => {
    jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette[mode])
    const { signOut } = mockSession()
    const view = await renderWithClient(<AccountScreen />)

    expect(view.getByText('Sair')).toHaveStyle({ color: palette[mode].foreground })
    expect(view.getByText('Excluir conta')).toHaveStyle({ color: palette[mode].destructiveAccent })
    await fireEvent.press(view.getByRole('button', { name: 'Sair' }))
    expect(signOut).toHaveBeenCalledTimes(1)
  })
})

describe('profile editing', () => {
  it.each(['', '   '])('clears username with %p without sending the untouched name', async (value) => {
    const view = await renderProfile()

    await fireEvent.changeText(view.getByLabelText('Usuário'), value)
    const save = view.getByRole('button', { name: 'Salvar alterações' })
    expect(save).toBeEnabled()
    await fireEvent.press(save)

    await expectProfilePatch({ username: null })
  })

  it.each([null, ''])('saves only the name with an untouched %p username', async (username) => {
    const view = await renderProfile(username)

    await fireEvent.changeText(view.getByLabelText('Nome'), 'Ana Souza')
    const save = view.getByRole('button', { name: 'Salvar alterações' })
    expect(save).toBeEnabled()
    await fireEvent.press(save)

    await expectProfilePatch({ full_name: 'Ana Souza' })
  })

  it('sends only username when the name is untouched', async () => {
    const view = await renderProfile()

    await fireEvent.changeText(view.getByLabelText('Usuário'), 'ana.souza')
    await fireEvent.press(view.getByRole('button', { name: 'Salvar alterações' }))

    await expectProfilePatch({ username: 'ana.souza' })
    expect(await view.findByText('Perfil atualizado.')).toBeOnTheScreen()
  })

  it('sends both changes when updating the name and clearing username', async () => {
    const view = await renderProfile()

    await fireEvent.changeText(view.getByLabelText('Nome'), 'Ana Souza')
    await fireEvent.changeText(view.getByLabelText('Usuário'), '')
    await fireEvent.press(view.getByRole('button', { name: 'Salvar alterações' }))

    await expectProfilePatch({ full_name: 'Ana Souza', username: null })
  })

  it('omits a username edit reverted to its original empty value', async () => {
    const view = await renderProfile(null)

    await fireEvent.changeText(view.getByLabelText('Usuário'), 'ana')
    await fireEvent.changeText(view.getByLabelText('Usuário'), '')
    expect(view.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()
    await fireEvent.changeText(view.getByLabelText('Nome'), 'Ana Souza')
    await fireEvent.press(view.getByRole('button', { name: 'Salvar alterações' }))

    await expectProfilePatch({ full_name: 'Ana Souza' })
  })

  // The button used to stay disabled without saying why (audit A24); it now
  // answers on the name field and still sends nothing.
  it.each(['', '   '])('explains an explicitly cleared name (%p) on its field', async (value) => {
    const view = await renderProfile()

    await fireEvent.changeText(view.getByLabelText('Nome'), value)
    await fireEvent.changeText(view.getByLabelText('Usuário'), '')
    await fireEvent.press(view.getByRole('button', { name: 'Salvar alterações' }))

    expect(view.getByLabelText('Nome')).toHaveAccessibleName('Nome')
    expect(view.getByLabelText('Nome').props.accessibilityHint).toBe('Informe seu nome, com até 255 caracteres.')
    expect(view.getByRole('alert')).toHaveTextContent('Informe seu nome, com até 255 caracteres.')
    expect(api.request).not.toHaveBeenCalled()
  })

  it('does not submit an untouched profile without username', async () => {
    const view = await renderProfile(null)

    const save = view.getByRole('button', { name: 'Salvar alterações' })
    expect(save).toBeDisabled()
    await fireEvent.press(save)

    expect(api.request).not.toHaveBeenCalled()
  })

  it('puts a taken username on the username field, with the rule', async () => {
    const view = await renderProfile()
    api.request.mockRejectedValueOnce(
      new ApiError(422, { errors: [{ field: 'username', rule: 'database.unique', message: 'taken' }] })
    )

    await fireEvent.changeText(view.getByLabelText('Usuário'), 'bia')
    await fireEvent.press(view.getByRole('button', { name: 'Salvar alterações' }))

    expect(await view.findByText('Este usuário já está em uso. Escolha outro.')).toBeOnTheScreen()
    expect(view.getByLabelText('Usuário').props.accessibilityHint).toBe('Este usuário já está em uso. Escolha outro.')
    expect(view.getByLabelText('Nome').props.accessibilityHint).toBeUndefined()
    // No blanket sentence about both fields.
    expect(view.queryByText(/pode já estar em uso/)).toBeNull()
  })

  it('checks the username rule before sending', async () => {
    const view = await renderProfile()

    await fireEvent.changeText(view.getByLabelText('Usuário'), '.ana')
    await fireEvent.press(view.getByRole('button', { name: 'Salvar alterações' }))

    expect(view.getByRole('alert')).toHaveTextContent(/Comece com letra ou número/)
    expect(api.request).not.toHaveBeenCalled()
  })

  it.each(['light', 'dark'] as const)('styles saving as a utility action instead of a conversion in %s', async (mode) => {
    jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette[mode])
    const view = await renderProfile()
    await fireEvent.changeText(view.getByLabelText('Nome'), 'Ana Souza')
    expect(view.getByRole('button', { name: 'Salvar alterações' })).toHaveStyle({ backgroundColor: palette[mode].primary })
    expect(view.getByText('Salvar alterações')).toHaveStyle({ color: palette[mode].primaryForeground })
  })
})

describe('city preference', () => {
  it('writes the chosen city to the discovery state and goes back', async () => {
    const back = jest.fn()
    jest.spyOn(jest.requireMock('expo-router'), 'useRouter').mockReturnValue({ push: mockPush, back })
    const CityScreen = (jest.requireActual('@/app/conta/cidade') as { default: () => ReactElement }).default
    const view = await renderWithClient(<CityScreen />)

    expect(view.getByRole('radio', { name: 'Londrina, PR' })).toBeChecked()
    await fireEvent.press(view.getByRole('radio', { name: 'Londrina, PR' }))
    expect(jest.requireMock('@/catalog/city-store').selectCity).toHaveBeenCalledWith('londrina')
    expect(back).toHaveBeenCalledTimes(1)
  })
})

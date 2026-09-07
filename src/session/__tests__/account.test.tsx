import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, waitFor } from '@testing-library/react-native'

import type { MobileUser } from '@/api/me'
import AccountScreen from '@/app/(tabs)/account'

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
}))
jest.mock('@/api/client', () => ({
  request: jest.fn(),
  ApiError: class ApiError extends Error {},
}))
jest.mock('@/session/context', () => ({ useSession: jest.fn() }))

const api = jest.requireMock('@/api/client') as { request: jest.Mock }
const session = jest.requireMock('@/session/context') as { useSession: jest.Mock }

async function renderAccount(username: string | null = 'ana') {
  const user: MobileUser = {
    id: 1,
    full_name: 'Ana Silva',
    email: 'ana@example.com',
    username,
    email_verified: true,
    email_verified_at: null,
  }
  session.useSession.mockReturnValue({
    context: { user },
    refresh: jest.fn(),
    signOut: jest.fn(),
  })
  api.request.mockImplementation(async (_path: string, options: { body: Partial<MobileUser> }) => ({
    user: { ...user, ...options.body },
  }))

  const client = new QueryClient({ defaultOptions: { mutations: { gcTime: Infinity } } })
  return render(
    <QueryClientProvider client={client}>
      <AccountScreen />
    </QueryClientProvider>
  )
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

beforeEach(() => jest.clearAllMocks())

describe('account profile editing', () => {
  it.each(['', '   '])('clears username with %p without sending the untouched name', async (value) => {
    const view = await renderAccount()

    await fireEvent.changeText(view.getByLabelText('Usuário'), value)
    const save = view.getByRole('button', { name: 'Salvar alterações' })
    expect(save).toBeEnabled()
    await fireEvent.press(save)

    await expectProfilePatch({ username: null })
  })

  it.each([null, ''])('saves only the name with an untouched %p username', async (username) => {
    const view = await renderAccount(username)

    await fireEvent.changeText(view.getByLabelText('Nome'), 'Ana Souza')
    const save = view.getByRole('button', { name: 'Salvar alterações' })
    expect(save).toBeEnabled()
    await fireEvent.press(save)

    await expectProfilePatch({ full_name: 'Ana Souza' })
  })

  it('sends only username when the name is untouched', async () => {
    const view = await renderAccount()

    await fireEvent.changeText(view.getByLabelText('Usuário'), 'ana.souza')
    await fireEvent.press(view.getByRole('button', { name: 'Salvar alterações' }))

    await expectProfilePatch({ username: 'ana.souza' })
  })

  it('sends both changes when updating the name and clearing username', async () => {
    const view = await renderAccount()

    await fireEvent.changeText(view.getByLabelText('Nome'), 'Ana Souza')
    await fireEvent.changeText(view.getByLabelText('Usuário'), '')
    await fireEvent.press(view.getByRole('button', { name: 'Salvar alterações' }))

    await expectProfilePatch({ full_name: 'Ana Souza', username: null })
  })

  it('omits a username edit reverted to its original empty value', async () => {
    const view = await renderAccount(null)

    await fireEvent.changeText(view.getByLabelText('Usuário'), 'ana')
    await fireEvent.changeText(view.getByLabelText('Usuário'), '')
    expect(view.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()
    await fireEvent.changeText(view.getByLabelText('Nome'), 'Ana Souza')
    await fireEvent.press(view.getByRole('button', { name: 'Salvar alterações' }))

    await expectProfilePatch({ full_name: 'Ana Souza' })
  })

  it.each(['', '   '])('rejects an explicitly cleared name (%p)', async (value) => {
    const view = await renderAccount()

    await fireEvent.changeText(view.getByLabelText('Nome'), value)
    await fireEvent.changeText(view.getByLabelText('Usuário'), '')
    const save = view.getByRole('button', { name: 'Salvar alterações' })
    expect(save).toBeDisabled()
    await fireEvent.press(save)

    expect(api.request).not.toHaveBeenCalled()
  })

  it('does not submit an untouched profile without username', async () => {
    const view = await renderAccount(null)

    const save = view.getByRole('button', { name: 'Salvar alterações' })
    expect(save).toBeDisabled()
    await fireEvent.press(save)

    expect(api.request).not.toHaveBeenCalled()
  })
})

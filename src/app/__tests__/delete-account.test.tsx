import { fireEvent, render, waitFor } from '@testing-library/react-native'

import DeleteAccountScreen from '@/app/conta/excluir'

const mockReplace = jest.fn()
const mockSignOut = jest.fn(async () => {})
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }))
jest.mock('@/session/context', () => ({ useSession: () => ({ signOut: mockSignOut }) }))
jest.mock('@/theme/use-colors', () => ({ useColors: () => jest.requireActual('@/theme/tokens').palette.light }))
jest.mock('@/api/client', () => ({ ApiError: class MockApiError extends Error {} }))
jest.mock('@/api/me', () => ({
  ACCOUNT_DELETION_LITERAL: 'EXCLUIR MINHA CONTA',
  deleteAccount: jest.fn(async () => undefined),
}))

const { QueryClient, QueryClientProvider } = jest.requireActual('@tanstack/react-query')

it('signs out and leaves the form once the account is gone', async () => {
  const view = await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } })}>
      <DeleteAccountScreen />
    </QueryClientProvider>
  )
  await fireEvent.changeText(view.getByLabelText('Senha atual'), 'senha-atual')
  await fireEvent.changeText(view.getByLabelText('Digite EXCLUIR MINHA CONTA'), 'excluir minha conta')
  await fireEvent.press(view.getByRole('button', { name: 'Excluir permanentemente' }))

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'))
  expect(jest.requireMock('@/api/me').deleteAccount).toHaveBeenCalledWith('senha-atual', 'excluir minha conta')
  expect(mockSignOut).toHaveBeenCalled()
  expect(mockSignOut.mock.invocationCallOrder[0]).toBeLessThan(mockReplace.mock.invocationCallOrder[0])
})

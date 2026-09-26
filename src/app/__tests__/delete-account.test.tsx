import { fireEvent, render, waitFor } from '@testing-library/react-native'

import DeleteAccountScreen from '@/app/conta/excluir'

const mockReplace = jest.fn()
const mockBack = jest.fn()
const mockSignOut = jest.fn(async () => {})
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, back: mockBack }) }))
jest.mock('@/session/context', () => ({ useSession: () => ({ signOut: mockSignOut }) }))
jest.mock('@/theme/use-colors', () => ({ useColors: () => jest.requireActual('@/theme/tokens').palette.light }))
jest.mock('@/api/client', () => ({ ApiError: class MockApiError extends Error {} }))
jest.mock('@/api/me', () => ({
  ACCOUNT_DELETION_LITERAL: 'EXCLUIR MINHA CONTA',
  deleteAccount: jest.fn(async () => undefined),
}))

const { QueryClient, QueryClientProvider } = jest.requireActual('@tanstack/react-query')

beforeEach(() => jest.clearAllMocks())

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

it('stays readable while it cannot delete yet, and offers a way out', async () => {
  const { palette } = jest.requireActual('@/theme/tokens')
  const view = await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } })}>
      <DeleteAccountScreen />
    </QueryClientProvider>
  )

  // Nothing is filled in for the person.
  expect(view.getByLabelText('Senha atual')).toHaveDisplayValue('')
  expect(view.getByLabelText('Digite EXCLUIR MINHA CONTA')).toHaveDisplayValue('')
  const button = view.getByRole('button', { name: 'Excluir permanentemente' })
  expect(button).toBeDisabled()
  expect(view.getByText('Excluir permanentemente')).toHaveStyle({ color: palette.light.mutedForeground })

  await fireEvent.press(view.getByRole('button', { name: 'Manter minha conta' }))
  expect(mockBack).toHaveBeenCalledTimes(1)
  expect(jest.requireMock('@/api/me').deleteAccount).not.toHaveBeenCalled()
})

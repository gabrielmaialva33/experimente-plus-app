import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render } from '@testing-library/react-native'

import ConfirmScreen from '@/app/validar/confirmar'

const mockRouter = { back: jest.fn(), setParams: jest.fn(), push: jest.fn() }

jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => ({ token: 'private-test-token' }) }))
jest.mock('@/theme/use-colors', () => ({ useColors: () => jest.requireActual('@/theme/tokens').palette.light }))
jest.mock('@/session/context', () => ({ useSession: () => ({ status: 'authenticated', context: { user: { id: 7 } } }) }))
jest.mock('@/api/client', () => ({ ApiError: jest.requireActual('@/api/transport').ApiError }))
jest.mock('@/api/redemptions', () => ({ previewRedemption: jest.fn(), confirmRedemption: jest.fn() }))

const redemptions = jest.requireMock('@/api/redemptions') as { previewRedemption: jest.Mock; confirmRedemption: jest.Mock }

function page() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } })
  return render(<QueryClientProvider client={client}><ConfirmScreen /></QueryClientProvider>)
}

beforeEach(() => jest.clearAllMocks())

// A28: the partner reads the same vocabulary as the customer — "Pacote", not "Edição".
it('shows the customer, the benefit and its package before an explicit confirmation', async () => {
  redemptions.previewRedemption.mockResolvedValue({
    token: 'private-test-token', holder: { full_name: 'Ana Souza' },
    benefit: { establishment_name: 'Café', offer_title: 'Item em dobro', edition_name: 'Pacote Londrina', remaining_redemptions: 1, terms: null },
  })
  const view = await page()
  expect(await view.findByText('Ana Souza')).toBeOnTheScreen()
  expect(view.getByText('Pacote')).toBeOnTheScreen()
  expect(view.queryByText('Edição')).toBeNull()
  expect(view.getByText('Item em dobro')).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Confirmar utilização' })).toBeOnTheScreen()
  expect(redemptions.confirmRedemption).not.toHaveBeenCalled()
})

// A refused code leads back to the reader from a real button, not a bare text press.
it('returns to the reader from a button when the code is refused', async () => {
  const { ApiError } = jest.requireMock('@/api/client') as typeof import('@/api/transport')
  redemptions.previewRedemption.mockRejectedValue(new ApiError(422, null))
  const view = await page()
  expect(await view.findByText('Este código não vale mais. Peça ao cliente para gerar um novo.')).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('button', { name: 'Voltar ao leitor' }))
  expect(mockRouter.back).toHaveBeenCalledTimes(1)
})

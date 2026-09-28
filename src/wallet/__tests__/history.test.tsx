import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render } from '@testing-library/react-native'

import WalletHistoryScreen from '@/app/carteira/historico'
import { HistoryScreen } from '../history-screen'
import { ReceiptScreen } from '../receipt-screen'
import type { Receipt } from '../types'

const mockRouter = {
  push: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  canGoBack: () => true,
}

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }))
jest.mock('@/api/client', () => ({ ApiError: jest.requireActual('@/api/transport').ApiError }))
jest.mock('@/session/context', () => ({
  useSession: () => ({ status: 'authenticated', context: { user: { id: 1 } } }),
  usePartnerAreas: () => ({ canValidate: false, canReadHistory: false }),
}))
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('@/api/wallet', () => ({
  listMyRedemptions: jest.fn(async () => ({ redemptions: [], total: 0 })),
}))

function page(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

beforeEach(() => jest.clearAllMocks())

// A34: an empty "Meus usos" says what will appear there and leads back to the benefits.
it('gives an empty history of uses a way to the benefits', async () => {
  const view = await page(<WalletHistoryScreen />)
  expect(await view.findByText('Você ainda não utilizou nenhum benefício')).toBeOnTheScreen()
  expect(
    view.getByText('Quando você usar um benefício, o comprovante fica guardado aqui.')
  ).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('button', { name: 'Ver meus benefícios' }))
  expect(mockRouter.navigate).toHaveBeenCalledWith('/wallet')
})

// A28: the receipt names the package, not the "edição".
it('labels the package of a receipt in the product vocabulary', async () => {
  const receipt: Receipt = {
    id: 1,
    receipt_code: 'ABC123',
    redemption_number: 1,
    redeemed_at: '2026-09-26T15:00:00Z',
    edition: { id: 1, name: 'Pacote Londrina' },
    offer: { id: 2, title: 'Item em dobro', benefit_type: 'discount', terms: null },
    establishment: { id: 1, name: 'Café' },
    holder: { id: 1, full_name: 'Ana', email: 'ana@example.test' },
    redeemed_by: 2,
  }
  const view = await page(<ReceiptScreen queryKey={['receipt']} load={async () => receipt} />)
  expect(await view.findByText('ABC123')).toBeOnTheScreen()
  expect(view.getByText('Pacote')).toBeOnTheScreen()
  expect(view.queryByText(/Edição/)).toBeNull()
  expect(view.getByText('26/09/2026, 12:00')).toBeOnTheScreen()
})

const receipt: Receipt = {
  id: 1,
  receipt_code: 'ABC123',
  redemption_number: 1,
  redeemed_at: '2026-09-26T15:00:00Z',
  edition: { id: 1, name: 'Pacote Londrina' },
  offer: { id: 2, title: 'Item em dobro', benefit_type: 'discount', terms: null },
  establishment: { id: 1, name: 'Café' },
  holder: { id: 1, full_name: 'Ana', email: 'ana@example.test' },
  redeemed_by: 2,
}

it('offers a new attempt when the history could not be read', async () => {
  const load = jest
    .fn()
    .mockRejectedValueOnce(new TypeError('Network request failed'))
    .mockResolvedValueOnce({ redemptions: [receipt], total: 1 })
  const view = await page(
    <HistoryScreen
      queryKey={['history-failure']}
      load={load}
      emptyMessage="Nenhum uso"
      receiptHref={() => '/carteira/historico'}
    />
  )
  expect(await view.findByText('Não foi possível carregar o histórico agora')).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('button', { name: 'Tentar de novo' }))
  expect(await view.findByText('ABC123')).toBeOnTheScreen()
})

it('tells a receipt that did not load apart from one that is not available', async () => {
  const { ApiError } = jest.requireActual('@/api/transport') as typeof import('@/api/transport')
  const load = jest
    .fn()
    .mockRejectedValueOnce(new TypeError('Network request failed'))
    .mockResolvedValueOnce(receipt)
  const view = await page(<ReceiptScreen queryKey={['receipt-failure']} load={load} />)
  expect(await view.findByText('Não foi possível carregar o comprovante agora')).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('button', { name: 'Tentar de novo' }))
  expect(await view.findByText('ABC123')).toBeOnTheScreen()
  await view.unmount()

  const missing = await page(
    <ReceiptScreen
      queryKey={['receipt-missing']}
      load={() => Promise.reject(new ApiError(404, null))}
    />
  )
  expect(await missing.findByText('Este comprovante não está disponível.')).toBeOnTheScreen()
  expect(missing.queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
  await fireEvent.press(missing.getByRole('button', { name: 'Voltar' }))
  expect(mockRouter.back).toHaveBeenCalled()
})

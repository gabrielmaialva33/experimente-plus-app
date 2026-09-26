import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, within } from '@testing-library/react-native'

import WalletScreen from '@/app/(tabs)/wallet'
import { palette } from '@/theme/tokens'
import type { Wallet } from '../types'

const mockPush = jest.fn()

jest.mock('@/theme/use-colors', () => ({ useColors: () => jest.requireActual('@/theme/tokens').palette.light }))
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }), useFocusEffect: jest.fn() }))
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))
jest.mock('@/api/client', () => ({ ApiError: class ApiError extends Error {} }))
jest.mock('@/session/context', () => ({ useSession: () => ({ status: 'authenticated', context: { user: { id: 1 } } }) }))
jest.mock('@/api/wallet', () => ({ getWallet: jest.fn() }))
jest.mock('@/api/purchases', () => ({ listPurchases: jest.fn() }))

const api = jest.requireMock('@/api/wallet') as { getWallet: jest.Mock }
const purchases = jest.requireMock('@/api/purchases') as { listPurchases: jest.Mock }

const emptyWallet: Wallet = { summary: { passes: 0, benefits: 0, available: 0, upcoming: 0, redeemed: 0 }, passes: [] }

const order = (id: string, status: string, name = 'Pacote Londrina') => ({
  id, status, method: 'pix', access_id: null, financially_blocked: false, paid_at: null,
  expires_at: '2026-10-01T00:00:00Z', created_at: '2026-09-26T12:00:00Z', instructions: null, refunds: [], offer_id: null,
  snapshot: { name, amount_cents: 4990, currency: 'BRL', product_type: 'edition', offer_id: null },
})

function page() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(<QueryClientProvider client={client}><WalletScreen /></QueryClientProvider>)
}

beforeEach(() => {
  jest.clearAllMocks()
  api.getWallet.mockResolvedValue(emptyWallet)
  purchases.listPurchases.mockResolvedValue({ purchases: [] })
})

// A19: an order waiting for payment grants nothing yet, but the wallet says it exists.
it('shows an order waiting for payment and opens it', async () => {
  purchases.listPurchases.mockResolvedValue({ purchases: [order('o-1', 'pending'), order('o-2', 'paid', 'Outro')] })
  const view = await page()
  const card = await view.findByTestId('wallet-pending-orders')
  expect(within(card).getByText('1 pedido aguardando pagamento')).toBeOnTheScreen()
  expect(within(card).getByText(/Pacote Londrina · R\$\s49,90/)).toBeOnTheScreen()
  expect(card).toHaveStyle({ backgroundColor: palette.light.warningSoft })
  await fireEvent.press(card)
  expect(mockPush).toHaveBeenCalledWith('/wallet/pedido/o-1')
})

it('counts several waiting orders and sends them to the order list', async () => {
  purchases.listPurchases.mockResolvedValue({ purchases: [order('o-1', 'pending'), order('o-2', 'pending')] })
  const view = await page()
  await fireEvent.press(await view.findByText('2 pedidos aguardando pagamento'))
  expect(mockPush).toHaveBeenCalledWith('/wallet/edicoes')
})

// A19 and A34: the empty wallet has one clear way out, in CTA.
it('gives the empty wallet an action to the benefits on sale', async () => {
  const view = await page()
  expect(await view.findByText('Sua carteira está vazia')).toBeOnTheScreen()
  const action = view.getByRole('button', { name: 'Ver benefícios disponíveis' })
  expect(action).toHaveStyle({ backgroundColor: palette.light.cta })
  await fireEvent.press(action)
  expect(mockPush).toHaveBeenCalledWith('/wallet/edicoes')
  expect(view.queryByTestId('wallet-pending-orders')).toBeNull()
})

// A28: one vocabulary — benefício, pacote da cidade, voucher; never "acesso" or "loja".
it('speaks of benefits, never of accesses or stores, even when a benefit is on hold', async () => {
  const empty = await page()
  await empty.findByText('Sua carteira está vazia')
  expect(empty.queryByText(/\b(acesso|loja)\b/i)).toBeNull()
  await empty.unmount()

  api.getWallet.mockResolvedValue({
    summary: { passes: 1, benefits: 1, available: 0, upcoming: 0, redeemed: 0 },
    passes: [{
      access: { id: 1, offer_id: null, product_type: 'edition', source: 'payment', status: 'active', availability: 'paused',
        financially_blocked: true, granted_at: '', usage_starts_at: '2026-10-01T00:00:00Z', usage_ends_at: '2026-12-31T00:00:00Z' },
      edition: { id: 1, name: 'Pacote Londrina', slug: 'londrina', description: null, usage_starts_at: '', usage_ends_at: '',
        city: { id: 1, name: 'Londrina', slug: 'londrina', state_code: 'PR', timezone: 'America/Sao_Paulo' } },
      benefits: [{ key: '1:2', access_id: 1, offer_id: 2, availability: 'paused', title: 'Item em dobro', description: 'Na compra de um prato',
        benefit_type: 'discount', terms: null, reservation_required: false, on_premise_only: true, minimum_party_size: 1,
        max_redemptions_per_access: 1, remaining_redemptions: 1, establishment: { id: 1, public_name: 'Café', slug: 'cafe' } }],
    }],
  })
  const blocked = await page()
  await blocked.findByText('Item em dobro')
  expect(blocked.queryByText(/\b(acesso|loja)\b/i)).toBeNull()
})

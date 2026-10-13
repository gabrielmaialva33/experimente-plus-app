import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render } from '@testing-library/react-native'

import { apiBaseUrl } from '@/api/config'
import WalletScreen from '@/app/(tabs)/wallet'
import type { Savings } from '../savings'
import type { Wallet } from '../types'

const mockPush = jest.fn()

jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: jest.fn(),
}))
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))
jest.mock('@/api/client', () => ({
  ApiError: class ApiError extends Error {},
  request: jest.fn(),
}))
jest.mock('@/session/context', () => ({
  useSession: () => ({ status: 'authenticated', context: { user: { id: 1 } } }),
}))
jest.mock('@/api/wallet', () => ({ getWallet: jest.fn() }))
jest.mock('@/api/purchases', () => ({ listPurchases: jest.fn() }))

const wallet = jest.requireMock('@/api/wallet') as { getWallet: jest.Mock }
const purchases = jest.requireMock('@/api/purchases') as { listPurchases: jest.Mock }
const api = jest.requireMock('@/api/client') as { request: jest.Mock }

const pass = (uses: number): Wallet => ({
  summary: { passes: 1, benefits: 1, available: 1, upcoming: 0, redeemed: 0 },
  passes: [
    {
      access: {
        id: 1,
        offer_id: null,
        product_type: 'edition',
        source: 'payment',
        status: 'active',
        availability: 'available',
        financially_blocked: false,
        granted_at: '2026-09-01T12:00:00Z',
        usage_starts_at: '2026-09-01T03:00:00Z',
        usage_ends_at: '2027-08-31T03:00:00Z',
      },
      edition: {
        id: 3,
        name: 'Experimente Londrina 2026',
        slug: 'londrina-2026',
        description: null,
        usage_starts_at: '2026-09-01T03:00:00Z',
        usage_ends_at: '2027-08-31T03:00:00Z',
        city: {
          id: 1,
          name: 'Londrina',
          slug: 'londrina',
          state_code: 'PR',
          timezone: 'America/Sao_Paulo',
        },
      },
      benefits: [
        {
          key: '1:2',
          access_id: 1,
          offer_id: 2,
          availability: 'available',
          title: '20% no almoço',
          description: 'De segunda a sexta',
          benefit_type: 'percentage',
          terms: null,
          reservation_required: false,
          on_premise_only: true,
          minimum_party_size: 1,
          max_redemptions_per_access: 3,
          redemption_count: uses,
          remaining_redemptions: 3 - uses,
          establishment: { id: 1, public_name: 'Café Aurora', slug: 'cafe-aurora' },
        },
      ],
    },
  ],
})

const empty: Savings = {
  currency: 'BRL',
  current: {
    editions: [],
    places_visited: 0,
    benefits_used: 0,
    savings_exact_cents: 0,
    savings_estimated_cents: 0,
    uses_without_estimate: 0,
    top_places: [],
  },
  past: [],
}

const oneUse: Savings = {
  ...empty,
  current: {
    ...empty.current,
    editions: [{ id: 3, name: 'Experimente Londrina 2026', year: 2026 }],
    places_visited: 1,
    benefits_used: 1,
    savings_estimated_cents: 850,
    top_places: [{ name: 'Café Aurora', visits: 1 }],
  },
}

beforeEach(() => {
  jest.clearAllMocks()
  purchases.listPurchases.mockResolvedValue({ purchases: [] })
})

it('shows Sua economia under the benefits and reads it again once a use shows up', async () => {
  wallet.getWallet.mockResolvedValue(pass(0))
  api.request.mockResolvedValue(empty)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = await render(
    <QueryClientProvider client={client}>
      <WalletScreen />
    </QueryClientProvider>
  )

  expect(
    await view.findByText('Use seu primeiro benefício para começar a contar')
  ).toBeOnTheScreen()
  expect(api.request).toHaveBeenCalledTimes(1)
  expect(api.request).toHaveBeenCalledWith('/api/v1/me/savings', expect.any(Object))
  // Between the benefits and the history of uses.
  const headers = view.getAllByRole('header').map((node) => node.props.children)
  expect(headers.indexOf('Sua economia')).toBeGreaterThan(headers.indexOf('Seus benefícios'))
  expect(headers.indexOf('Sua economia')).toBeLessThan(headers.indexOf('Histórico'))

  // The partner confirmed a use: the wallet, polled by the presentation, brings it.
  wallet.getWallet.mockResolvedValue(pass(1))
  api.request.mockResolvedValue(oneUse)
  await act(() => client.refetchQueries({ queryKey: ['wallet', apiBaseUrl] }))

  expect(
    await view.findByLabelText('Economia estimada: cerca de 8 reais e 50 centavos')
  ).toBeOnTheScreen()
  expect(api.request).toHaveBeenCalledTimes(2)

  await fireEvent.press(view.getByRole('button', { name: /^Ver sua economia/ }))
  expect(mockPush).toHaveBeenCalledWith('/wallet/economia')
})

it('keeps the benefits usable when only the savings fail', async () => {
  wallet.getWallet.mockResolvedValue(pass(0))
  api.request.mockRejectedValue(new TypeError('Network request failed'))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = await render(
    <QueryClientProvider client={client}>
      <WalletScreen />
    </QueryClientProvider>
  )

  expect(await view.findByText('Não foi possível carregar sua economia')).toBeOnTheScreen()
  expect(
    view.getByRole('button', { name: 'Apresentar 20% no almoço em Café Aurora' })
  ).toBeEnabled()
  expect(view.queryByText('Não foi possível atualizar a carteira')).toBeNull()
})

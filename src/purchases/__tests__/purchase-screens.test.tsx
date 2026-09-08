import type { CreatePurchaseRequest } from '@/api/purchases'
import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { Linking } from 'react-native'

import EditionScreen from '@/app/(tabs)/wallet/edicao/[id]'
import EditionsScreen from '@/app/(tabs)/wallet/edicoes'
import OrderScreen from '@/app/(tabs)/wallet/pedido/[id]'
import type { Purchase, PurchaseEdition } from '@/api/purchases'

jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: '2' }), useRouter: jest.fn() }))
jest.mock('@/api/purchases', () => ({ ...jest.requireActual('@/api/purchases'), createPurchase: jest.fn() }))
jest.mock('@/purchases/queries', () => ({
  usePurchaseScope: () => ({ userId: 1 }),
  usePurchaseEditions: jest.fn(), usePurchases: jest.fn(), usePurchase: jest.fn(),
}))
jest.mock('@/purchases/intent-store', () => ({
  readIntent: jest.fn(() => null), clearIntent: jest.fn(),
  purchaseIntent: (_user: number, body: unknown) => ({ key: 'stable-intention-123', body }),
}))
jest.mock('@/wallet/queries', () => ({ walletKeys: { wallet: ['wallet'] } }))
jest.mock('@/api/client', () => ({ ApiError: class ApiError extends Error {} }))

const queries = jest.requireMock('@/purchases/queries') as Record<string, jest.Mock>
const api = jest.requireMock('@/api/purchases') as { createPurchase: jest.Mock }
const intents = jest.requireMock('@/purchases/intent-store') as { readIntent: jest.Mock }
const router = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn() }
const edition: PurchaseEdition = {
  id: 2, amount_cents: 12300, currency: 'BRL', purchasable: true,
  payment_methods: ['pix'],
  name: 'Edição 2026', description: 'Descrição publicada', status: 'published',
  city: { id: 1, name: 'Londrina', slug: 'londrina', state_code: 'PR', timezone: 'America/Sao_Paulo' },
  sales_starts_at: '2026-09-01T00:00:00Z', sales_ends_at: '2026-09-30T00:00:00Z',
  usage_starts_at: '2026-10-01T00:00:00Z', usage_ends_at: '2026-12-31T00:00:00Z',
  snapshot: {
    name: 'Edição 2026', description: 'Descrição publicada', terms_version: 'a'.repeat(64),
    sales_starts_at: '2026-09-01T00:00:00Z', sales_ends_at: '2026-09-30T00:00:00Z',
    usage_starts_at: '2026-10-01T00:00:00Z', usage_ends_at: '2026-12-31T00:00:00Z',
    offers: [{
      id: 1, establishment_id: 1, title: 'Oferta publicada', description: 'Descrição da oferta',
      terms: 'Condições da oferta', max_redemptions_per_access: 1, benefit_type: 'discount',
      discount_percentage: 10, discount_amount_cents: null, available_weekdays_mask: 127,
      daily_start_time: null, daily_end_time: null, starts_at: null, ends_at: null,
      reservation_required: false, on_premise_only: true, minimum_party_size: 1,
    }],
  },
}
const pending: Purchase = {
  refunded_cents: 0, refunds: [], financially_blocked: false,
  id: '98b8ff53-9cd5-4a48-9f32-731a11cbe7f1', edition_id: 2, amount_cents: 12300, currency: 'BRL', status: 'pending',
  method: 'pix', snapshot: edition.snapshot, access_id: null,
  expires_at: '2026-09-07T01:00:00Z', paid_at: null, created_at: '2026-09-07T00:00:00Z',
  instructions: { pix_url: 'https://checkout.example.com/order' },
}

const page = (element: React.ReactNode) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } })}>
    {element}
  </QueryClientProvider>
)

// Flush query notifications within RNTL's awaited event scope, not a later timer.
beforeAll(() => notifyManager.setScheduler((notify) => notify()))
afterAll(() => notifyManager.setScheduler((notify) => { setTimeout(notify, 0) }))

beforeEach(() => {
  jest.clearAllMocks()
  intents.readIntent.mockReturnValue(null)
  jest.requireMock('expo-router').useRouter.mockReturnValue(router)
  queries.usePurchaseEditions.mockReturnValue({ data: { editions: [edition] } })
  queries.usePurchases.mockReturnValue({ data: { purchases: [] } })
  queries.usePurchase.mockReturnValue({ data: pending, refetch: jest.fn() })
})

afterEach(() => jest.restoreAllMocks())

it('shows price and separate windows, accepts terms and starts only with a server method', async () => {
  api.createPurchase.mockResolvedValue({ id: '98b8ff53-9cd5-4a48-9f32-731a11cbe7f1' })
  const view = await page(<EditionScreen />)
  expect(view.getByText(/Venda:.*01\/09\/2026/)).toBeOnTheScreen()
  expect(view.getByText(/Uso:.*01\/10\/2026/)).toBeOnTheScreen()
  expect(view.getByText(/123,00/)).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Iniciar compra' })).toBeDisabled()
  await fireEvent.press(view.getByRole('radio', { name: 'pix' }))
  await fireEvent.press(view.getByRole('checkbox', { name: 'Li e aceito as condições desta edição' }))
  await fireEvent.press(view.getByRole('button', { name: 'Iniciar compra' }))
  await waitFor(() => expect(api.createPurchase).toHaveBeenCalledWith({
    edition_id: 2, amount_cents: 12300, terms_version: 'a'.repeat(64), method: 'pix',
  }, 'stable-intention-123'))
  expect(router.replace).toHaveBeenCalledWith('/wallet/pedido/98b8ff53-9cd5-4a48-9f32-731a11cbe7f1')
  expect(router.navigate).not.toHaveBeenCalled()
})

it('does not invent payment methods when an edition has no available methods (defensive empty array)', async () => {
  queries.usePurchaseEditions.mockReturnValue({ data: { editions: [{ ...edition, payment_methods: [] }] } })
  const view = await page(<EditionScreen />)
  expect(view.getByText(/Os meios de pagamento ainda não estão disponíveis/)).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Iniciar compra' })).toBeDisabled()
  expect(view.queryByText(/Pix|cartão/i)).toBeNull()
  expect(api.createPurchase).not.toHaveBeenCalled()
})

it('offers an existing pending order rather than a second charge', async () => {
  queries.usePurchases.mockReturnValue({ data: { purchases: [pending] } })
  const view = await page(<EditionScreen />)
  expect(view.queryByRole('button', { name: 'Iniciar compra' })).toBeNull()
  await fireEvent.press(view.getByRole('button', { name: 'Acompanhar pedido' }))
  expect(router.push).toHaveBeenCalledWith('/wallet/pedido/98b8ff53-9cd5-4a48-9f32-731a11cbe7f1')
})

it('can resume a persisted intention after restart even when the edition is omitted from the public catalog', async () => {
  const body: CreatePurchaseRequest = { edition_id: 2, amount_cents: 10000, terms_version: 'b'.repeat(64), method: 'pix' }
  intents.readIntent.mockReturnValue({ key: 'original-intention', body })
  queries.usePurchaseEditions.mockReturnValue({ data: { editions: [] } })
  api.createPurchase.mockResolvedValue({ id: '98b8ff53-9cd5-4a48-9f32-731a11cbe7f1' })
  const view = await page(<EditionScreen />)
  await fireEvent.press(view.getByRole('button', { name: 'Consultar novamente' }))
  expect(api.createPurchase).toHaveBeenCalledWith(body, 'original-intention')
})

it('a timeout stays uncertain and does not retry automatically or open the wallet', async () => {
  api.createPurchase.mockRejectedValue(new Error('timeout'))
  const view = await page(<EditionScreen />)
  await fireEvent.press(view.getByRole('radio', { name: 'pix' }))
  await fireEvent.press(view.getByRole('checkbox', { name: 'Li e aceito as condições desta edição' }))
  await fireEvent.press(view.getByRole('button', { name: 'Iniciar compra' }))
  expect(await view.findByText(/Isso não significa que o pagamento falhou/)).toBeOnTheScreen()
  expect(api.createPurchase).toHaveBeenCalledTimes(1)
  expect(router.replace).not.toHaveBeenCalled()
  expect(router.navigate).not.toHaveBeenCalled()
})

it('checkout returning successfully does not confirm payment or expose wallet access', async () => {
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
  const view = await page(<OrderScreen />)
  await fireEvent.press(view.getByRole('button', { name: 'Continuar pagamento' }))
  expect(view.getByText('Pedido pendente')).toBeOnTheScreen()
  expect(view.queryByRole('button', { name: 'Consultar carteira' })).toBeNull()
  expect(router.navigate).not.toHaveBeenCalled()
})

it('renders an empty public catalog as an empty state, while keeping existing orders accessible', async () => {
  queries.usePurchaseEditions.mockReturnValue({ data: { editions: [] } })
  queries.usePurchases.mockReturnValue({ data: { purchases: [pending] } })
  const view = await page(<EditionsScreen />)
  expect(view.getByText('Nenhuma edição disponível no momento.')).toBeOnTheScreen()
  expect(view.getByText('Explorar lugares é livre. Comprar uma edição é opcional.')).toBeOnTheScreen()
  expect(view.queryByText(/As edições não estão disponíveis agora/)).toBeNull()
  await fireEvent.press(view.getByRole('button', { name: 'Edição 2026 · Pedido pendente' }))
  expect(router.push).toHaveBeenCalledWith('/wallet/pedido/98b8ff53-9cd5-4a48-9f32-731a11cbe7f1')
  expect(api.createPurchase).not.toHaveBeenCalled()
})

it('does not start a purchase for an edition omitted from the catalog', async () => {
  queries.usePurchaseEditions.mockReturnValue({ data: { editions: [] } })
  const view = await page(<EditionScreen />)
  expect(view.getByText('Esta edição não está disponível agora.')).toBeOnTheScreen()
  expect(view.queryByRole('button', { name: 'Iniciar compra' })).toBeNull()
  expect(api.createPurchase).not.toHaveBeenCalled()
})

it('disables a previously selected method when the server removes it', async () => {
  const client = new QueryClient()
  const node = <QueryClientProvider client={client}><EditionScreen /></QueryClientProvider>
  const view = await render(node)
  expect(view.queryByRole('radio', { name: 'card' })).toBeNull()
  await fireEvent.press(view.getByRole('radio', { name: 'pix' }))
  await fireEvent.press(view.getByRole('checkbox', { name: 'Li e aceito as condições desta edição' }))
  expect(view.getByRole('button', { name: 'Iniciar compra' })).toBeEnabled()
  queries.usePurchaseEditions.mockReturnValue({ data: { editions: [{ ...edition, payment_methods: ['card'] }] } })
  await view.rerender(<QueryClientProvider client={client}><EditionScreen /></QueryClientProvider>)
  expect(view.getByRole('button', { name: 'Iniciar compra' })).toBeDisabled()
  expect(view.queryByRole('radio', { name: /pix/ })).toBeNull()
  expect(view.getByRole('radio', { name: 'card' })).toBeOnTheScreen()
  expect(api.createPurchase).not.toHaveBeenCalled()
})

it('explains a server card option without submitting an incomplete tokenization request', async () => {
  queries.usePurchaseEditions.mockReturnValue({ data: { editions: [{ ...edition, payment_methods: ['card'] }] } })
  const view = await page(<EditionScreen />)
  expect(view.queryByRole('radio', { name: 'pix' })).toBeNull()
  await fireEvent.press(view.getByRole('radio', { name: 'card' }))
  await fireEvent.press(view.getByRole('checkbox', { name: 'Li e aceito as condições desta edição' }))
  expect(view.getByText(/Este meio de pagamento ainda não pode ser iniciado pelo aplicativo/)).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Iniciar compra' })).toBeDisabled()
  await fireEvent.press(view.getByRole('button', { name: 'Iniciar compra' }))
  expect(api.createPurchase).not.toHaveBeenCalled()
})

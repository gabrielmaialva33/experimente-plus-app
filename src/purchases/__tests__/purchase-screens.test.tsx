import type { CreatePurchaseRequest } from '@/api/purchases'
import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { Linking } from 'react-native'

import EditionScreen from '@/app/(tabs)/wallet/edicao/[id]'
import EditionsScreen from '@/app/(tabs)/wallet/edicoes'
import OrderScreen from '@/app/(tabs)/wallet/pedido/[id]'
import PublicProductScreen from '@/app/compra/[id]'
import { EstablishmentOffers } from '@/purchases/establishment-offers'
import type { Purchase, PurchaseEdition, PurchaseProduct } from '@/api/purchases'

jest.mock('expo-router', () => ({ useLocalSearchParams: jest.fn(), useRouter: jest.fn() }))
jest.mock('@/api/purchases', () => ({ ...jest.requireActual('@/api/purchases'), createPurchase: jest.fn() }))
jest.mock('@/purchases/queries', () => ({
  usePurchaseScope: jest.fn(),
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
  id: 2, edition_id: 2, offer_id: null, product_type: 'edition', establishment: null, terms_version: 'a'.repeat(64), amount_cents: 12300, currency: 'BRL', purchasable: true,
  payment_methods: ['pix'],
  name: 'Edição 2026', description: 'Descrição publicada', status: 'published',
  city: { id: 1, name: 'Londrina', slug: 'londrina', state_code: 'PR', timezone: 'America/Sao_Paulo' },
  sales_starts_at: '2026-09-01T00:00:00Z', sales_ends_at: '2026-09-30T00:00:00Z',
  usage_starts_at: '2026-10-01T00:00:00Z', usage_ends_at: '2026-12-31T00:00:00Z',
  snapshot: {
    offer_id: null, product_type: 'edition', amount_cents: 12300, currency: 'BRL',
    name: 'Edição 2026', description: 'Descrição publicada', terms_version: 'a'.repeat(64),
    sales_starts_at: '2026-09-01T00:00:00Z', sales_ends_at: '2026-09-30T00:00:00Z',
    usage_starts_at: '2026-10-01T00:00:00Z', usage_ends_at: '2026-12-31T00:00:00Z',
    offers: [{
      id: 1, establishment_id: 1, establishment: { id: 1, public_name: 'Café', slug: 'cafe' }, title: 'Oferta publicada', description: 'Descrição da oferta',
      terms: 'Condições da oferta', max_redemptions_per_access: 1, benefit_type: 'discount',
      discount_percentage: 10, discount_amount_cents: null, available_weekdays_mask: 127,
      daily_start_time: null, daily_end_time: null, starts_at: null, ends_at: null,
      reservation_required: false, on_premise_only: true, minimum_party_size: 1,
    }],
  },
}
const pending: Purchase = {
  offer_id: null, product_type: 'edition', refunded_cents: 0, refunds: [], financially_blocked: false,
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
  jest.requireMock('expo-router').useLocalSearchParams.mockReturnValue({ id: '2' })
  queries.usePurchaseScope.mockReturnValue({ userId: 1 })
  jest.requireMock('expo-router').useRouter.mockReturnValue(router)
  queries.usePurchaseEditions.mockReturnValue({ data: { editions: [], offers: [], products: [edition] } })
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
  await fireEvent.press(view.getByRole('checkbox', { name: 'Li e aceito as condições deste produto' }))
  await fireEvent.press(view.getByRole('button', { name: 'Iniciar compra' }))
  await waitFor(() => expect(api.createPurchase).toHaveBeenCalledWith({
    edition_id: 2, offer_id: null, amount_cents: 12300, terms_version: 'a'.repeat(64), method: 'pix',
  }, 'stable-intention-123'))
  expect(router.replace).toHaveBeenCalledWith('/wallet/pedido/98b8ff53-9cd5-4a48-9f32-731a11cbe7f1')
  expect(router.navigate).not.toHaveBeenCalled()
})

it('does not invent payment methods when an edition has no available methods (defensive empty array)', async () => {
  queries.usePurchaseEditions.mockReturnValue({ data: { editions: [], offers: [], products: [{ ...edition, payment_methods: [] }] } })
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
  queries.usePurchaseEditions.mockReturnValue({ data: { editions: [], offers: [], products: [] } })
  api.createPurchase.mockResolvedValue({ id: '98b8ff53-9cd5-4a48-9f32-731a11cbe7f1' })
  const view = await page(<EditionScreen />)
  await fireEvent.press(view.getByRole('button', { name: 'Consultar novamente' }))
  expect(api.createPurchase).toHaveBeenCalledWith(body, 'original-intention')
})

it('a timeout stays uncertain and does not retry automatically or open the wallet', async () => {
  api.createPurchase.mockRejectedValue(new Error('timeout'))
  const view = await page(<EditionScreen />)
  await fireEvent.press(view.getByRole('radio', { name: 'pix' }))
  await fireEvent.press(view.getByRole('checkbox', { name: 'Li e aceito as condições deste produto' }))
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
  queries.usePurchaseEditions.mockReturnValue({ data: { editions: [], offers: [], products: [] } })
  queries.usePurchases.mockReturnValue({ data: { purchases: [pending] } })
  const view = await page(<EditionsScreen />)
  expect(view.getByText('Nenhum produto disponível no momento.')).toBeOnTheScreen()
  expect(view.getByText('Explorar lugares é livre. Comprar um pacote ou voucher é opcional.')).toBeOnTheScreen()
  expect(view.queryByText(/Os produtos não estão disponíveis agora/)).toBeNull()
  await fireEvent.press(view.getByRole('button', { name: 'Edição 2026 · Pedido pendente' }))
  expect(router.push).toHaveBeenCalledWith('/wallet/pedido/98b8ff53-9cd5-4a48-9f32-731a11cbe7f1')
  expect(api.createPurchase).not.toHaveBeenCalled()
})

it('does not start a purchase for an edition omitted from the catalog', async () => {
  queries.usePurchaseEditions.mockReturnValue({ data: { editions: [], offers: [], products: [] } })
  const view = await page(<EditionScreen />)
  expect(view.getByText('Este produto não está disponível agora.')).toBeOnTheScreen()
  expect(view.queryByRole('button', { name: 'Iniciar compra' })).toBeNull()
  expect(api.createPurchase).not.toHaveBeenCalled()
})

it('disables a previously selected method when the server removes it', async () => {
  const client = new QueryClient()
  const node = <QueryClientProvider client={client}><EditionScreen /></QueryClientProvider>
  const view = await render(node)
  expect(view.queryByRole('radio', { name: 'card' })).toBeNull()
  await fireEvent.press(view.getByRole('radio', { name: 'pix' }))
  await fireEvent.press(view.getByRole('checkbox', { name: 'Li e aceito as condições deste produto' }))
  expect(view.getByRole('button', { name: 'Iniciar compra' })).toBeEnabled()
  queries.usePurchaseEditions.mockReturnValue({ data: { editions: [], offers: [], products: [{ ...edition, payment_methods: ['card'] }] } })
  await view.rerender(<QueryClientProvider client={client}><EditionScreen /></QueryClientProvider>)
  expect(view.getByRole('button', { name: 'Iniciar compra' })).toBeDisabled()
  expect(view.queryByRole('radio', { name: /pix/ })).toBeNull()
  expect(view.getByRole('radio', { name: 'card' })).toBeOnTheScreen()
  expect(api.createPurchase).not.toHaveBeenCalled()
})

it('explains a server card option without submitting an incomplete tokenization request', async () => {
  queries.usePurchaseEditions.mockReturnValue({ data: { editions: [], offers: [], products: [{ ...edition, payment_methods: ['card'] }] } })
  const view = await page(<EditionScreen />)
  expect(view.queryByRole('radio', { name: 'pix' })).toBeNull()
  await fireEvent.press(view.getByRole('radio', { name: 'card' }))
  await fireEvent.press(view.getByRole('checkbox', { name: 'Li e aceito as condições deste produto' }))
  expect(view.getByText(/Este meio de pagamento ainda não pode ser iniciado pelo aplicativo/)).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Iniciar compra' })).toBeDisabled()
  await fireEvent.press(view.getByRole('button', { name: 'Iniciar compra' }))
  expect(api.createPurchase).not.toHaveBeenCalled()
})

const voucher = (offerId: number, store: string, hash: string): PurchaseProduct => {
  const establishment = { id: offerId, public_name: store, slug: `loja-${offerId}` }
  return {
    ...edition, id: offerId, offer_id: offerId, product_type: 'offer', establishment,
    name: `Oferta ${offerId}`, amount_cents: 1490, terms_version: hash,
    snapshot: {
      ...edition.snapshot, name: `Oferta ${offerId}`, product_type: 'offer', offer_id: offerId,
      amount_cents: 1490, terms_version: hash,
      offers: [{ ...edition.snapshot.offers[0], id: offerId, establishment_id: offerId, establishment }],
    },
  }
}

// Same edition for all three products; one offer also shares the edition's ID.
const products = [edition, voucher(2, 'Café', 'b'.repeat(64)), voucher(3, 'Bistrô', 'c'.repeat(64))]

it('uses only the unified products and identifies the city package and each store voucher', async () => {
  queries.usePurchaseEditions.mockReturnValue({ data: { editions: [], offers: [], products } })
  const view = await page(<EditionsScreen />)
  expect(view.getByRole('button', { name: /Pacote da cidade · Londrina · Edição 2026/ })).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('button', { name: /Voucher avulso · Café · Oferta 2/ }))
  expect(router.push).toHaveBeenLastCalledWith('/wallet/edicao/2?offerId=2')
  await fireEvent.press(view.getByRole('button', { name: /Voucher avulso · Bistrô · Oferta 3/ }))
  expect(router.push).toHaveBeenLastCalledWith('/wallet/edicao/2?offerId=3')
  expect(view.getAllByRole('button')).toHaveLength(3)
})

it.each(products)('copies the exact quote hash and offer identity for $product_type / $id', async (product) => {
  queries.usePurchaseEditions.mockReturnValue({ data: { editions: [], offers: [], products } })
  jest.requireMock('expo-router').useLocalSearchParams.mockReturnValue({
    id: String(product.edition_id), ...(product.offer_id == null ? {} : { offerId: String(product.offer_id) }),
  })
  api.createPurchase.mockResolvedValue({ id: pending.id })
  const view = await page(<EditionScreen />)
  await fireEvent.press(view.getByRole('radio', { name: 'pix' }))
  await fireEvent.press(view.getByRole('checkbox', { name: 'Li e aceito as condições deste produto' }))
  await fireEvent.press(view.getByRole('button', { name: 'Iniciar compra' }))
  expect(api.createPurchase).toHaveBeenCalledWith({
    edition_id: product.edition_id, offer_id: product.offer_id,
    amount_cents: product.amount_cents, method: 'pix', terms_version: product.terms_version,
  }, 'stable-intention-123')
  expect(intents.readIntent).toHaveBeenCalledWith(1, product.edition_id, product.offer_id)
})

it('requires fresh consent and a payment selection when the product changes on the same screen', async () => {
  queries.usePurchaseEditions.mockReturnValue({ data: { products } })
  const client = new QueryClient()
  const node = <QueryClientProvider client={client}><EditionScreen /></QueryClientProvider>
  const view = await render(node)
  await fireEvent.press(view.getByRole('radio', { name: 'pix' }))
  await fireEvent.press(view.getByRole('checkbox', { name: 'Li e aceito as condições deste produto' }))
  expect(view.getByRole('button', { name: 'Iniciar compra' })).toBeEnabled()
  jest.requireMock('expo-router').useLocalSearchParams.mockReturnValue({ id: '2', offerId: '3' })
  await view.rerender(<QueryClientProvider client={client}><EditionScreen /></QueryClientProvider>)
  expect(view.getByText('Voucher avulso · Bistrô')).toBeOnTheScreen()
  expect(view.getByRole('checkbox', { checked: false })).toBeOnTheScreen()
  expect(view.getByRole('radio', { name: 'pix', checked: false })).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Iniciar compra' })).toBeDisabled()
})

it('does not confuse an existing package order with a voucher in the same edition', async () => {
  queries.usePurchaseEditions.mockReturnValue({ data: { products } })
  queries.usePurchases.mockReturnValue({ data: { purchases: [pending] } })
  jest.requireMock('expo-router').useLocalSearchParams.mockReturnValue({ id: '2', offerId: '3' })
  const view = await page(<EditionScreen />)
  expect(view.getByRole('button', { name: 'Iniciar compra' })).toBeOnTheScreen()
  expect(view.queryByRole('button', { name: 'Acompanhar pedido' })).toBeNull()
})

it('requires consent to a refreshed quote and copies its new top-level hash literally', async () => {
  const client = new QueryClient()
  const view = await render(<QueryClientProvider client={client}><EditionScreen /></QueryClientProvider>)
  await fireEvent.press(view.getByRole('radio', { name: 'pix' }))
  await fireEvent.press(view.getByRole('checkbox', { name: 'Li e aceito as condições deste produto' }))
  const fresh = { ...edition, terms_version: 'd'.repeat(64), snapshot: { ...edition.snapshot, terms_version: 'd'.repeat(64) } }
  queries.usePurchaseEditions.mockReturnValue({ data: { products: [fresh] } })
  await view.rerender(<QueryClientProvider client={client}><EditionScreen /></QueryClientProvider>)
  expect(view.getByRole('button', { name: 'Iniciar compra' })).toBeDisabled()
  await fireEvent.press(view.getByRole('checkbox', { name: 'Li e aceito as condições deste produto' }))
  api.createPurchase.mockResolvedValue({ id: pending.id })
  await fireEvent.press(view.getByRole('button', { name: 'Iniciar compra' }))
  expect(api.createPurchase).toHaveBeenCalledWith(expect.objectContaining({ offer_id: null, terms_version: fresh.terms_version }), 'stable-intention-123')
})

it('keeps the product and conditions public and requires login only to buy', async () => {
  queries.usePurchaseEditions.mockReturnValue({ data: { products } })
  queries.usePurchaseScope.mockReturnValue({ userId: null })
  queries.usePurchases.mockReturnValue({ isPending: true })
  jest.requireMock('expo-router').useLocalSearchParams.mockReturnValue({ id: '2', offerId: '3' })
  const view = await page(<PublicProductScreen />)
  expect(view.getByText('Voucher avulso · Bistrô')).toBeOnTheScreen()
  expect(view.getByText('Condições da oferta')).toBeOnTheScreen()
  expect(view.queryByText('Consultando seus pedidos…')).toBeNull()
  await fireEvent.press(view.getByRole('button', { name: 'Entrar para comprar' }))
  expect(router.push).toHaveBeenCalledWith('/compra/entrar')
  expect(api.createPurchase).not.toHaveBeenCalled()
})

it('opens only a voucher sold by this establishment and leaves its entry as navigation', async () => {
  queries.usePurchaseEditions.mockReturnValue({ data: { products } })
  const view = await page(<EstablishmentOffers citySlug="londrina" slug="loja-3" />)
  expect(view.getAllByRole('button')).toHaveLength(1)
  await fireEvent.press(view.getByRole('button', { name: /Ver voucher · Oferta 3/ }))
  expect(router.push).toHaveBeenCalledWith('/compra/2?offerId=3')
  expect(view.queryByText(/Oferta 2/)).toBeNull()
  expect(api.createPurchase).not.toHaveBeenCalled()
})

it.each([
  { data: { products: [] } },
  { data: { products }, isError: true },
  { isPending: true },
  { data: { products: products.map((product) => ({ ...product, city: { ...product.city, slug: 'outra' } })) } },
])('does not obstruct discovery when no matching on-sale voucher is available (%#)', async (catalog) => {
  queries.usePurchaseEditions.mockReturnValue(catalog)
  const view = await page(<EstablishmentOffers citySlug="londrina" slug="loja-3" />)
  expect(view.queryByText('Vouchers desta loja')).toBeNull()
  expect(view.queryByRole('button')).toBeNull()
})

it.each(['', '0', '-1', 'oops', ['2', '3']])('rejects an invalid offer link instead of opening the package: %p', async (offerId) => {
  jest.requireMock('expo-router').useLocalSearchParams.mockReturnValue({ id: '2', offerId })
  const view = await page(<PublicProductScreen />)
  expect(view.getByText('Este produto não está disponível agora.')).toBeOnTheScreen()
  expect(view.queryByRole('button', { name: 'Iniciar compra' })).toBeNull()
})

it.each(['invalid', 'A'.repeat(64), 'a'.repeat(63), 'g'.repeat(64)])('never manufactures a replacement for an invalid terms hash: %s', async (terms_version) => {
  queries.usePurchaseEditions.mockReturnValue({ data: { products: [{ ...edition, terms_version }] } })
  const view = await page(<EditionScreen />)
  await fireEvent.press(view.getByRole('radio', { name: 'pix' }))
  await fireEvent.press(view.getByRole('checkbox', { name: 'Li e aceito as condições deste produto' }))
  expect(view.getByRole('button', { name: 'Iniciar compra' })).toBeDisabled()
  expect(api.createPurchase).not.toHaveBeenCalled()
})

import type { CreatePurchaseRequest, Purchase, PurchaseEdition, PurchaseProduct } from '@/api/purchases'
import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, waitFor, within } from '@testing-library/react-native'
import { Linking } from 'react-native'

import EditionScreen from '@/app/(tabs)/wallet/edicao/[id]'
import EditionsScreen from '@/app/(tabs)/wallet/edicoes'
import OrderScreen from '@/app/(tabs)/wallet/pedido/[id]'
import PublicProductScreen from '@/app/compra/[id]'
import { EstablishmentOffers } from '@/purchases/establishment-offers'
import { palette } from '@/theme/tokens'

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(), useRouter: jest.fn(), useFocusEffect: jest.fn(), Stack: { Screen: () => null },
}))
// The product band draws under the native bar and reads the insets, like every ScreenHeader.
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))
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
jest.mock('@/purchases/cancel', () => ({ cancelPurchase: jest.fn() }))
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
  // Instants at midnight UTC close the day before in Londrina; nothing reads as UTC.
  const when = within(view.getByTestId('purchase-when'))
  expect(when.getByText('Compre até')).toBeOnTheScreen()
  expect(when.getByText('29/09/2026')).toBeOnTheScreen()
  expect(when.getByText('Use até')).toBeOnTheScreen()
  expect(when.getByText('30/12/2026')).toBeOnTheScreen()
  expect(when.getByText('Uso a partir de 30/09/2026 · 1 uso por lugar.')).toBeOnTheScreen()
  expect(view.queryByText(/UTC/)).toBeNull()
  expect(view.getAllByText('Edição 2026')).toHaveLength(1)
  expect(view.getByText(/123,00/)).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Continuar para o pagamento' })).toBeDisabled()
  await fireEvent.press(view.getByRole('radio', { name: 'Pix' }))
  await fireEvent.press(view.getByRole('checkbox', { name: /^Li e aceito as condições/ }))
  await fireEvent.press(view.getByRole('button', { name: 'Continuar para o pagamento' }))
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
  expect(view.getByRole('button', { name: 'Continuar para o pagamento' })).toBeDisabled()
  expect(view.queryByText(/Pix|cartão/i)).toBeNull()
  expect(api.createPurchase).not.toHaveBeenCalled()
})

it('offers an existing pending order rather than a second charge', async () => {
  queries.usePurchases.mockReturnValue({ data: { purchases: [pending] } })
  const view = await page(<EditionScreen />)
  expect(view.queryByRole('button', { name: 'Continuar para o pagamento' })).toBeNull()
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
  await fireEvent.press(view.getByRole('radio', { name: 'Pix' }))
  await fireEvent.press(view.getByRole('checkbox', { name: /^Li e aceito as condições/ }))
  await fireEvent.press(view.getByRole('button', { name: 'Continuar para o pagamento' }))
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
  expect(view.queryByRole('button', { name: 'Continuar para o pagamento' })).toBeNull()
  expect(api.createPurchase).not.toHaveBeenCalled()
})

it('disables a previously selected method when the server removes it', async () => {
  const client = new QueryClient()
  const node = <QueryClientProvider client={client}><EditionScreen /></QueryClientProvider>
  const view = await render(node)
  expect(view.queryByRole('radio', { name: /Cartão de crédito/ })).toBeNull()
  await fireEvent.press(view.getByRole('radio', { name: 'Pix' }))
  await fireEvent.press(view.getByRole('checkbox', { name: /^Li e aceito as condições/ }))
  expect(view.getByRole('button', { name: 'Continuar para o pagamento' })).toBeEnabled()
  queries.usePurchaseEditions.mockReturnValue({ data: { editions: [], offers: [], products: [{ ...edition, payment_methods: ['card'] }] } })
  await view.rerender(<QueryClientProvider client={client}><EditionScreen /></QueryClientProvider>)
  expect(view.getByRole('button', { name: 'Continuar para o pagamento' })).toBeDisabled()
  expect(view.queryByRole('radio', { name: /Pix/ })).toBeNull()
  expect(view.getByRole('radio', { name: 'Cartão de crédito, em breve pelo aplicativo' })).toBeDisabled()
  expect(api.createPurchase).not.toHaveBeenCalled()
})

it('shows a server card option as unavailable before any tap, without an incomplete tokenization request', async () => {
  queries.usePurchaseEditions.mockReturnValue({ data: { editions: [], offers: [], products: [{ ...edition, payment_methods: ['card'] }] } })
  const view = await page(<EditionScreen />)
  expect(view.getByText('Forma de pagamento')).toBeOnTheScreen()
  expect(view.queryByRole('radio', { name: 'Pix' })).toBeNull()
  const card = view.getByRole('radio', { name: 'Cartão de crédito, em breve pelo aplicativo' })
  expect(card).toBeDisabled()
  expect(view.getByText('Em breve pelo aplicativo')).toBeOnTheScreen()
  await fireEvent.press(card)
  expect(view.getByRole('radio', { name: 'Cartão de crédito, em breve pelo aplicativo', checked: false })).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('checkbox', { name: /^Li e aceito as condições/ }))
  expect(view.getByRole('button', { name: 'Continuar para o pagamento' })).toBeDisabled()
  await fireEvent.press(view.getByRole('button', { name: 'Continuar para o pagamento' }))
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
  await fireEvent.press(view.getByRole('radio', { name: 'Pix' }))
  await fireEvent.press(view.getByRole('checkbox', { name: /^Li e aceito as condições/ }))
  await fireEvent.press(view.getByRole('button', { name: 'Continuar para o pagamento' }))
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
  await fireEvent.press(view.getByRole('radio', { name: 'Pix' }))
  await fireEvent.press(view.getByRole('checkbox', { name: /^Li e aceito as condições/ }))
  expect(view.getByRole('button', { name: 'Continuar para o pagamento' })).toBeEnabled()
  jest.requireMock('expo-router').useLocalSearchParams.mockReturnValue({ id: '2', offerId: '3' })
  await view.rerender(<QueryClientProvider client={client}><EditionScreen /></QueryClientProvider>)
  expect(view.getByText('Voucher avulso · Bistrô')).toBeOnTheScreen()
  expect(view.getByRole('checkbox', { checked: false })).toBeOnTheScreen()
  expect(view.getByRole('radio', { name: 'Pix', checked: false })).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Continuar para o pagamento' })).toBeDisabled()
})

it('does not confuse an existing package order with a voucher in the same edition', async () => {
  queries.usePurchaseEditions.mockReturnValue({ data: { products } })
  queries.usePurchases.mockReturnValue({ data: { purchases: [pending] } })
  jest.requireMock('expo-router').useLocalSearchParams.mockReturnValue({ id: '2', offerId: '3' })
  const view = await page(<EditionScreen />)
  expect(view.getByRole('button', { name: 'Continuar para o pagamento' })).toBeOnTheScreen()
  expect(view.queryByRole('button', { name: 'Acompanhar pedido' })).toBeNull()
})

it('requires consent to a refreshed quote and copies its new top-level hash literally', async () => {
  const client = new QueryClient()
  const view = await render(<QueryClientProvider client={client}><EditionScreen /></QueryClientProvider>)
  await fireEvent.press(view.getByRole('radio', { name: 'Pix' }))
  await fireEvent.press(view.getByRole('checkbox', { name: /^Li e aceito as condições/ }))
  const fresh = { ...edition, terms_version: 'd'.repeat(64), snapshot: { ...edition.snapshot, terms_version: 'd'.repeat(64) } }
  queries.usePurchaseEditions.mockReturnValue({ data: { products: [fresh] } })
  await view.rerender(<QueryClientProvider client={client}><EditionScreen /></QueryClientProvider>)
  expect(view.getByRole('button', { name: 'Continuar para o pagamento' })).toBeDisabled()
  await fireEvent.press(view.getByRole('checkbox', { name: /^Li e aceito as condições/ }))
  api.createPurchase.mockResolvedValue({ id: pending.id })
  await fireEvent.press(view.getByRole('button', { name: 'Continuar para o pagamento' }))
  expect(api.createPurchase).toHaveBeenCalledWith(expect.objectContaining({ offer_id: null, terms_version: fresh.terms_version }), 'stable-intention-123')
})

it('keeps the product and conditions public and requires login only to buy', async () => {
  queries.usePurchaseEditions.mockReturnValue({ data: { products } })
  queries.usePurchaseScope.mockReturnValue({ userId: null })
  queries.usePurchases.mockReturnValue({ isPending: true })
  jest.requireMock('expo-router').useLocalSearchParams.mockReturnValue({ id: '2', offerId: '3' })
  const view = await page(<PublicProductScreen />)
  expect(view.getByText('Voucher avulso · Bistrô')).toBeOnTheScreen()
  expect(view.queryByText(/Condições da oferta/)).toBeNull()
  await fireEvent.press(view.getByRole('button', { name: 'Ver condições' }))
  expect(view.getByText(/Condições da oferta/)).toBeOnTheScreen()
  expect(view.queryByText('Consultando seus pedidos…')).toBeNull()
  await fireEvent.press(view.getByRole('button', { name: 'Entrar para comprar' }))
  expect(router.push).toHaveBeenCalledWith('/compra/entrar')
  expect(api.createPurchase).not.toHaveBeenCalled()
})

it('opens only a voucher sold by this establishment and leaves its entry as navigation', async () => {
  queries.usePurchaseEditions.mockReturnValue({ data: { products } })
  const view = await page(<EstablishmentOffers citySlug="londrina" slug="loja-3" />)
  expect(view.getAllByRole('button')).toHaveLength(1)
  expect(view.getByText('Vouchers deste lugar')).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('button', { name: /Ver oferta · Oferta 3/ }))
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
  expect(view.queryByText('Vouchers deste lugar')).toBeNull()
  expect(view.queryByRole('button')).toBeNull()
})

it.each(['', '0', '-1', 'oops', ['2', '3']])('rejects an invalid offer link instead of opening the package: %p', async (offerId) => {
  jest.requireMock('expo-router').useLocalSearchParams.mockReturnValue({ id: '2', offerId })
  const view = await page(<PublicProductScreen />)
  expect(view.getByText('Este produto não está disponível agora.')).toBeOnTheScreen()
  expect(view.queryByRole('button', { name: 'Continuar para o pagamento' })).toBeNull()
})

it.each(['invalid', 'A'.repeat(64), 'a'.repeat(63), 'g'.repeat(64)])('never manufactures a replacement for an invalid terms hash: %s', async (terms_version) => {
  queries.usePurchaseEditions.mockReturnValue({ data: { products: [{ ...edition, terms_version }] } })
  const view = await page(<EditionScreen />)
  await fireEvent.press(view.getByRole('radio', { name: 'Pix' }))
  await fireEvent.press(view.getByRole('checkbox', { name: /^Li e aceito as condições/ }))
  expect(view.getByRole('button', { name: 'Continuar para o pagamento' })).toBeDisabled()
  expect(api.createPurchase).not.toHaveBeenCalled()
})

it('refreshes a list of orders still mounted underneath once an order exists', async () => {
  api.createPurchase.mockResolvedValue({ id: pending.id })
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } })
  const invalidate = jest.spyOn(client, 'invalidateQueries')
  const view = await render(<QueryClientProvider client={client}><EditionScreen /></QueryClientProvider>)
  await fireEvent.press(view.getByRole('radio', { name: 'Pix' }))
  await fireEvent.press(view.getByRole('checkbox', { name: /^Li e aceito as condições/ }))
  await fireEvent.press(view.getByRole('button', { name: 'Continuar para o pagamento' }))
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['purchases'] }))
})

// A30: the total sits in the pinned footer beside the action that pays it, and
// the product name is said once, by the header band.
it('keeps the total beside the conversion action in a pinned footer', async () => {
  const view = await page(<EditionScreen />)
  const footer = within(view.getByTestId('purchase-footer'))
  expect(footer.getByText('Total')).toBeOnTheScreen()
  expect(footer.getByText(/123,00/)).toBeOnTheScreen()
  expect(footer.getByRole('button', { name: 'Continuar para o pagamento' })).toHaveStyle({ backgroundColor: palette.light.muted })
  await fireEvent.press(view.getByRole('radio', { name: 'Pix' }))
  await fireEvent.press(view.getByRole('checkbox', { name: /^Li e aceito as condições/ }))
  expect(footer.getByRole('button', { name: 'Continuar para o pagamento' })).toBeEnabled()
  expect(view.getAllByText('Edição 2026')).toHaveLength(1)
})

// A31: the consent names the conditions and opens them from where it is read.
it('opens the conditions from the consent that names them', async () => {
  const view = await page(<EditionScreen />)
  expect(view.getByRole('checkbox', { name: 'Li e aceito as condições deste pacote' })).toBeOnTheScreen()
  expect(view.queryByText(/Condições da oferta/)).toBeNull()
  await fireEvent.press(view.getByRole('button', { name: 'Ler as condições' }))
  expect(view.getByText(/Condições da oferta/)).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Ocultar condições' })).toBeOnTheScreen()
  expect(view.getByRole('checkbox', { checked: false })).toBeOnTheScreen()
})

// A20: each product is a card that says its kind, name, what it includes, until
// when it is used and its price, instead of one centred line.
it('lists each product as a card with what it includes and until when it is used', async () => {
  queries.usePurchaseEditions.mockReturnValue({ data: { products } })
  const view = await page(<EditionsScreen />)
  const pack = within(view.getByRole('button', { name: /Pacote da cidade · Londrina · Edição 2026/ }))
  expect(pack.getByText('Pacote da cidade · Londrina')).toBeOnTheScreen()
  expect(pack.getByText('Edição 2026')).toBeOnTheScreen()
  expect(pack.getByText('1 benefício: Café')).toBeOnTheScreen()
  expect(pack.getByText('Use até 30/12/2026')).toBeOnTheScreen()
  expect(pack.getByText(/123,00/)).toBeOnTheScreen()
  const voucherCard = within(view.getByRole('button', { name: /Voucher avulso · Bistrô · Oferta 3/ }))
  expect(voucherCard.getByText('Oferta publicada')).toBeOnTheScreen()
  expect(voucherCard.getByText(/14,90/)).toBeOnTheScreen()
})

// A4: a pending order says what happens next and can be cancelled through the
// existing endpoint, after an explicit second step.
it('explains the next steps of a pending order and cancels it only after confirmation', async () => {
  const cancel = jest.requireMock('@/purchases/cancel').cancelPurchase as jest.Mock
  cancel.mockResolvedValue({ id: pending.id })
  const refetch = jest.fn()
  queries.usePurchase.mockReturnValue({ data: { ...pending, instructions: { pix_code: '000201-pix' } }, refetch })
  const view = await page(<OrderScreen />)
  const steps = within(view.getByTestId('order-next-steps'))
  expect(steps.getByText(/Copie o código abaixo no app do seu banco\. Prazo: 06\/09\/2026/)).toBeOnTheScreen()
  expect(steps.getByText('Os benefícios aparecem na Carteira assim que o pagamento é confirmado.')).toBeOnTheScreen()
  expect(view.getByText('000201-pix')).toBeOnTheScreen()

  await fireEvent.press(view.getByRole('button', { name: 'Cancelar pedido' }))
  expect(cancel).not.toHaveBeenCalled()
  await fireEvent.press(view.getByRole('button', { name: 'Manter pedido' }))
  await fireEvent.press(view.getByRole('button', { name: 'Cancelar pedido' }))
  await fireEvent.press(view.getByRole('button', { name: 'Sim, cancelar pedido' }))
  expect(await view.findByText(/Cancelamento solicitado/)).toBeOnTheScreen()
  expect(cancel).toHaveBeenCalledTimes(1)
  expect(cancel).toHaveBeenCalledWith(pending.id)
  expect(refetch).toHaveBeenCalled()
})

it('offers neither next steps nor cancellation once the payment is confirmed', async () => {
  queries.usePurchase.mockReturnValue({ data: { ...pending, status: 'paid', access_id: 1, paid_at: '2026-09-07T00:10:00Z' }, refetch: jest.fn() })
  const view = await page(<OrderScreen />)
  expect(view.getByText('Pagamento confirmado')).toBeOnTheScreen()
  expect(view.queryByTestId('order-next-steps')).toBeNull()
  expect(view.queryByRole('button', { name: 'Cancelar pedido' })).toBeNull()
  expect(view.getByRole('button', { name: 'Consultar carteira' })).toBeOnTheScreen()
})

// A28: the place sells vouchers "deste lugar"; the interface never says "loja".
it('names the vouchers of a place without calling it a store', async () => {
  queries.usePurchaseEditions.mockReturnValue({ data: { products } })
  const view = await page(<EstablishmentOffers citySlug="londrina" slug="loja-3" />)
  expect(view.getByText('Vouchers deste lugar')).toBeOnTheScreen()
  expect(view.queryByText(/\bloja\b/i)).toBeNull()
  expect(view.getByRole('button', { name: /^Ver oferta/ })).toHaveStyle({ backgroundColor: palette.light.cta })
})

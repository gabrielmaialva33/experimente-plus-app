import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import { ScrollView, Text, type RefreshControlProps } from 'react-native'

import MyReviewsScreen from '@/app/conta/avaliacoes'
import ItinerariesScreen from '@/app/roteiros/index'
import PurchaseEditionsScreen from '@/app/(tabs)/wallet/edicoes'
import WalletScreen from '@/app/(tabs)/wallet/index'
import { usePullToRefresh } from '@/components/pull-to-refresh'
import { SavedListScreen } from '@/explorer/saved-list-screen'
import { HistoryScreen } from '@/wallet/history-screen'

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: jest.requireActual('react-native').View }))
jest.mock('@/theme/use-colors', () => ({ useColors: () => jest.requireActual('@/theme/tokens').palette.light }))
jest.mock('@/api/client', () => ({ ApiError: class ApiError extends Error {} }))
jest.mock('@/session/context', () => ({ useSession: () => ({ status: 'authenticated' }) }))
jest.mock('@/reviews/queries', () => ({
  useMyReviews: jest.fn(),
  useDeleteReview: () => ({ mutate: jest.fn(), isPending: false }),
}))
jest.mock('@/explorer/queries', () => ({
  useItineraries: jest.fn(),
  useCreateItinerary: () => ({ mutate: jest.fn(), isPending: false, isError: false }),
  useSavedList: jest.fn(),
  useToggleSaved: () => ({ mutate: jest.fn(), isPending: false }),
}))
jest.mock('@/wallet/queries', () => ({ useWallet: jest.fn() }))
jest.mock('@/purchases/queries', () => ({ usePurchaseEditions: jest.fn(), usePurchases: jest.fn() }))

const reviews = jest.requireMock('@/reviews/queries') as { useMyReviews: jest.Mock }
const explorer = jest.requireMock('@/explorer/queries') as { useItineraries: jest.Mock; useSavedList: jest.Mock }
const wallet = jest.requireMock('@/wallet/queries') as { useWallet: jest.Mock }
const purchases = jest.requireMock('@/purchases/queries') as { usePurchaseEditions: jest.Mock; usePurchases: jest.Mock }

type Rendered = Awaited<ReturnType<typeof render>>

/** The pull gesture of the vertical scroll around `text`. */
function refreshAround(view: Rendered, text: string | RegExp) {
  let node: ReturnType<Rendered['getByText']> | null = view.getByText(text)
  while (node && !(node.type === 'RCTScrollView' && !node.props.horizontal)) node = node.parent
  const control = node?.props.refreshControl as ReactElement<RefreshControlProps> | undefined
  if (!control) throw new Error(`No pull to refresh around ${String(text)}`)
  return control.props
}

const loaded = (data: unknown) => ({ data, isPending: false, isError: false, refetch: jest.fn(() => Promise.resolve()) })

function List() {
  return <ScrollView refreshControl={usePullToRefresh(results, orders)}><Text>Lista</Text></ScrollView>
}
let settle: () => void = () => {}
const results = jest.fn(() => new Promise<void>((resolve) => { settle = resolve }))
const orders = jest.fn(() => Promise.reject(new Error('offline')))

it('refetches what the list shows and spins only until those answers arrive', async () => {
  const view = await render(<List />)
  expect(refreshAround(view, 'Lista').refreshing).toBe(false)

  await act(async () => refreshAround(view, 'Lista').onRefresh?.())
  expect(results).toHaveBeenCalledTimes(1)
  expect(orders).toHaveBeenCalledTimes(1)
  expect(refreshAround(view, 'Lista').refreshing).toBe(true)

  // A failed refetch shows as the query's own error; the spinner still stops.
  await act(async () => settle())
  expect(refreshAround(view, 'Lista').refreshing).toBe(false)
})

describe('lists the server fills can be pulled to refresh', () => {
  it('my reviews', async () => {
    const query = loaded({ data: [] })
    reviews.useMyReviews.mockReturnValue(query)
    const view = await render(<MyReviewsScreen />)
    await act(async () => refreshAround(view, 'Você ainda não avaliou nenhum lugar.').onRefresh?.())
    expect(query.refetch).toHaveBeenCalledTimes(1)
  })

  it('itineraries', async () => {
    const query = loaded({ data: [] })
    explorer.useItineraries.mockReturnValue(query)
    const view = await render(<ItinerariesScreen />)
    await act(async () => refreshAround(view, 'Nenhum roteiro ainda').onRefresh?.())
    expect(query.refetch).toHaveBeenCalledTimes(1)
  })

  it.each(['favorites', 'follows'] as const)('%s', async (kind) => {
    const query = loaded({ data: [], unavailable: 0 })
    explorer.useSavedList.mockReturnValue(query)
    const view = await render(<SavedListScreen kind={kind} />)
    await act(async () => refreshAround(view, /Você ainda não/).onRefresh?.())
    expect(query.refetch).toHaveBeenCalledTimes(1)
  })

  it('the wallet', async () => {
    const query = loaded({ passes: [] })
    wallet.useWallet.mockReturnValue(query)
    const view = await render(<WalletScreen />)
    await act(async () => refreshAround(view, 'Sua carteira está vazia').onRefresh?.())
    expect(query.refetch).toHaveBeenCalledTimes(1)
  })

  it('packages, vouchers and orders together', async () => {
    const editions = loaded({ products: [] })
    const orders = loaded({ purchases: [] })
    purchases.usePurchaseEditions.mockReturnValue(editions)
    purchases.usePurchases.mockReturnValue(orders)
    const view = await render(<PurchaseEditionsScreen />)
    await act(async () => refreshAround(view, 'Pacotes e vouchers').onRefresh?.())
    expect(editions.refetch).toHaveBeenCalledTimes(1)
    expect(orders.refetch).toHaveBeenCalledTimes(1)
  })

  it('past uses', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const load = jest.fn(() => Promise.resolve({ redemptions: [], total: 0 }))
    const view = await render(
      <QueryClientProvider client={client}>
        <HistoryScreen queryKey={['history']} load={load} emptyMessage="Nenhum uso" receiptHref={() => '/carteira/historico'} />
      </QueryClientProvider>
    )
    await view.findByText('Nenhum uso')
    await act(async () => refreshAround(view, 'Nenhum uso').onRefresh?.())
    expect(load).toHaveBeenCalledTimes(2)
    await view.unmount()
    client.clear()
  })
})

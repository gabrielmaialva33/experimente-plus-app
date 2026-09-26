import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react-native'

import ExploreScreen from '@/app/(tabs)/index'

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
}))
jest.mock('@/analytics/events', () => ({ track: jest.fn() }))
// A signed-in person with interests: the one case where the row is drawn.
jest.mock('@/session/context', () => ({
  useSession: () => ({
    status: 'authenticated',
    context: { user: { id: 7 }, active_operation: { id: 1 } },
  }),
}))
jest.mock('@/api/concierge', () => ({ askAssistant: jest.fn() }))
jest.mock('@/api/explorer', () => ({
  listForYou: jest.fn(async () => ({
    has_interests: true,
    data: [
      {
        slug: 'bistro',
        name: 'Bistrô Pessoal',
        short_description: null,
        city: { slug: 'londrina', name: 'Londrina', state_code: 'PR' },
        address: { district: 'Centro', latitude: null, longitude: null },
        business_status: 'open',
        is_open_now: true,
        primary_category: null,
        categories: [],
        is_sponsored: false,
        reviews: { count: 0, average: null },
      },
    ],
  })),
}))
jest.mock('@/catalog/city-store', () => ({
  useSelectedCity: () => 'londrina',
  selectCity: jest.fn(),
}))
jest.mock('@/catalog/city-agenda', () => ({
  CityAgenda: () => {
    const { Text } = jest.requireActual('react-native')
    return <Text>Agenda da cidade</Text>
  },
}))
jest.mock('@/catalog/queries', () => ({
  useCities: () => ({
    data: [
      {
        slug: 'londrina',
        name: 'Londrina',
        state_code: 'PR',
        coordinates: { latitude: null, longitude: null },
      },
    ],
  }),
  useCategories: () => ({ data: { categories: [{ slug: 'cafes', name: 'Cafés' }] } }),
  useFilters: () => ({ data: { attributes: [] } }),
  useSearch: jest.fn(() => ({
    data: {
      organic: [
        {
          slug: 'cafe',
          name: 'Café da Praça',
          address: { district: 'Centro' },
          business_status: 'open',
          is_open_now: true,
        },
      ],
      meta: { total: 1 },
    },
  })),
}))

jest.mock('@/components/establishment-map', () => ({ EstablishmentMap: () => null }))

const queries = jest.requireMock('@/catalog/queries') as { useSearch: jest.Mock }

type Rendered = Awaited<ReturnType<typeof render>>['root']

/** Every text of the rendered tree, in reading order. */
function textsOf(node: Rendered | string): string[] {
  if (typeof node === 'string') return [node]
  if (!node) return []
  return (node.children ?? []).flatMap((child) => textsOf(child as Rendered | string))
}

it('adds the personal row between the agenda and the filters and leaves search as it was', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = await render(
    <QueryClientProvider client={client}>
      <ExploreScreen />
    </QueryClientProvider>
  )

  expect(await view.findByText('Bistrô Pessoal')).toBeOnTheScreen()
  const texts = textsOf(view.root)
  const at = (text: string) => texts.indexOf(text)
  expect(at('Agenda da cidade')).toBeLessThan(at('Para você'))
  expect(at('Para você')).toBeLessThan(at('Filtros'))

  // Organic results are the search's alone, asked with the same parameters.
  expect(view.getAllByText('Café da Praça')).toHaveLength(1)
  expect(queries.useSearch).toHaveBeenLastCalledWith('londrina', {
    q: undefined,
    category: undefined,
    openNow: false,
    attributes: [],
  })
  for (const [, params] of queries.useSearch.mock.calls) {
    expect(params).toEqual({ q: undefined, category: undefined, openNow: false, attributes: [] })
  }
})

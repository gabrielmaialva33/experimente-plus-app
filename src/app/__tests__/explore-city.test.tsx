import { act, fireEvent, render, waitFor } from '@testing-library/react-native'

import ExploreScreen from '@/app/(tabs)/index'

// Expo Router hands out one imperative router, the same on every render.
const mockRouter = { push: jest.fn() }
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: jest.fn(),
}))
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))
jest.mock('@/analytics/events', () => ({ track: jest.fn() }))
jest.mock('@/session/context', () => ({
  useSession: jest.fn(() => {
    throw new Error('Discovery must not require a session')
  }),
}))
jest.mock('@/api/concierge', () => ({ askAssistant: jest.fn() }))
jest.mock('@/catalog/city-store', () => ({
  useSelectedCity: jest.fn(),
  selectCity: jest.fn(),
}))
jest.mock('@/catalog/queries', () => ({
  useCities: jest.fn(),
  useCategories: jest.fn(),
  useFilters: jest.fn(),
  useSearch: jest.fn(),
  useCityAgenda: () => ({ data: undefined, isPending: false }),
}))
jest.mock('@/explorer/for-you-row', () => ({ ForYouRow: () => null }))
jest.mock('@/components/establishment-map', () => ({ EstablishmentMap: () => null }))
// Counts how often each card is drawn: the feed must not redraw them as the person types.
const mockCardRenders: string[] = []
jest.mock('@/components/establishment-card', () => ({
  EstablishmentCard: ({ establishment }: { establishment: { slug: string; name: string } }) => {
    const { Text } = jest.requireActual('react-native')
    mockCardRenders.push(establishment.slug)
    return <Text>{establishment.name}</Text>
  },
}))

const cityStore = jest.requireMock('@/catalog/city-store') as {
  useSelectedCity: jest.Mock
  selectCity: jest.Mock
}
const queries = jest.requireMock('@/catalog/queries') as {
  useCities: jest.Mock
  useCategories: jest.Mock
  useFilters: jest.Mock
  useSearch: jest.Mock
}

const city = (slug: string, name: string) => ({
  slug,
  name,
  state_code: 'PR',
  coordinates: { latitude: null, longitude: null },
})
const published = [city('londrina', 'Londrina'), city('cambe', 'Cambé')]

/** Each city offers its own categories and facets; cafés are offered in both. */
const categoriesOf: Record<string, { slug: string; name: string }[]> = {
  londrina: [
    { slug: 'cafes', name: 'Cafés' },
    { slug: 'bares', name: 'Bares' },
  ],
  cambe: [{ slug: 'cafes', name: 'Cafés' }],
}
const attributesOf: Record<string, { key: string; name: string }[]> = {
  londrina: [
    { key: 'wifi', name: 'Wi-Fi' },
    { key: 'live_music', name: 'Música ao vivo' },
  ],
  cambe: [{ key: 'wifi', name: 'Wi-Fi' }],
}

const empty = { data: { organic: [], meta: { total: 0 } }, refetch: jest.fn() }

beforeEach(() => {
  jest.clearAllMocks()
  mockCardRenders.length = 0
  cityStore.useSelectedCity.mockReturnValue('londrina')
  queries.useCities.mockReturnValue({ data: published, refetch: jest.fn() })
  queries.useCategories.mockImplementation((slug: string) => ({
    data: { categories: categoriesOf[slug] ?? [] },
  }))
  queries.useFilters.mockImplementation((slug: string) => ({
    data: { attributes: attributesOf[slug] ?? [] },
  }))
  queries.useSearch.mockReturnValue(empty)
})

describe('the city Explorar opens on', () => {
  it('replaces a remembered city that is no longer published with the first one', async () => {
    cityStore.useSelectedCity.mockReturnValue('arapongas')
    await render(<ExploreScreen />)
    expect(cityStore.selectCity).toHaveBeenCalledWith('londrina')
  })

  it('keeps a remembered city while the published list is still loading', async () => {
    cityStore.useSelectedCity.mockReturnValue('cambe')
    queries.useCities.mockReturnValue({ data: undefined, isPending: true, refetch: jest.fn() })
    await render(<ExploreScreen />)
    expect(cityStore.selectCity).not.toHaveBeenCalled()
    expect(queries.useSearch).toHaveBeenLastCalledWith('cambe', expect.any(Object))
  })

  it('offers another try, not an endless skeleton, when the cities fail on a first launch', async () => {
    const refetch = jest.fn(() => Promise.resolve())
    cityStore.useSelectedCity.mockReturnValue(null)
    queries.useCities.mockReturnValue({ data: undefined, isError: true, refetch })
    queries.useSearch.mockReturnValue({ isPending: true, refetch: jest.fn() })
    const view = await render(<ExploreScreen />)

    expect(view.queryByRole('progressbar')).toBeNull()
    expect(
      view.getByRole('header', { name: 'Não foi possível carregar as cidades' })
    ).toBeOnTheScreen()
    await fireEvent.press(view.getByRole('button', { name: 'Tentar de novo' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('says so when no city is published, and a pull asks for the cities again', async () => {
    const refetch = jest.fn(() => Promise.resolve())
    queries.useCities.mockReturnValue({ data: [], refetch })
    const view = await render(<ExploreScreen />)

    expect(view.getByRole('header', { name: 'Nenhuma cidade publicada ainda' })).toBeOnTheScreen()
    // A remembered city that is gone is not searched for.
    expect(queries.useSearch).toHaveBeenLastCalledWith(null, expect.any(Object))
    let feed = view.getByTestId('cities-empty').parent
    while (feed && !(feed.type === 'RCTScrollView' && !feed.props.horizontal)) feed = feed.parent
    await act(async () => feed?.props.refreshControl.props.onRefresh())
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('leads from a city with nothing published to the other cities', async () => {
    const view = await render(<ExploreScreen />)
    expect(view.getByText('Ainda não há lugares publicados em Londrina.')).toBeOnTheScreen()
    await fireEvent.press(view.getByRole('button', { name: 'Trocar cidade' }))
    expect(view.getByRole('radio', { name: 'Cambé, PR' })).toBeOnTheScreen()
  })

  it('offers no city switch when there is only one city', async () => {
    queries.useCities.mockReturnValue({ data: [published[0]], refetch: jest.fn() })
    const view = await render(<ExploreScreen />)
    expect(view.getByText('Ainda não há lugares publicados em Londrina.')).toBeOnTheScreen()
    expect(view.queryByRole('button', { name: 'Trocar cidade' })).toBeNull()
  })
})

describe('filters across cities', () => {
  it('drops a category or facet the new city does not offer and keeps the shared ones', async () => {
    const view = await render(<ExploreScreen />)
    await fireEvent.press(view.getByRole('button', { name: 'Bares' }))
    await fireEvent.press(view.getByRole('button', { name: 'Wi-Fi' }))
    await fireEvent.press(view.getByRole('button', { name: 'Música ao vivo' }))
    await fireEvent.press(view.getByRole('button', { name: 'Aberto agora' }))
    expect(queries.useSearch).toHaveBeenLastCalledWith('londrina', {
      q: undefined,
      category: 'bares',
      openNow: true,
      attributes: ['wifi', 'live_music'],
    })

    // Cambé offers cafés and Wi-Fi only: no chip could undo "Bares" or "Música ao vivo" there.
    cityStore.useSelectedCity.mockReturnValue('cambe')
    await view.rerender(<ExploreScreen />)
    // Not even once: each search spends the anonymous request budget.
    for (const [slug, params] of queries.useSearch.mock.calls) {
      if (slug === 'cambe') expect(params).toMatchObject({ category: undefined })
    }
    await waitFor(() =>
      expect(queries.useSearch).toHaveBeenLastCalledWith('cambe', {
        q: undefined,
        category: undefined,
        openNow: true,
        attributes: ['wifi'],
      })
    )
    expect(view.getByRole('button', { name: 'Wi-Fi', selected: true })).toBeOnTheScreen()
    expect(cityStore.selectCity).not.toHaveBeenCalled()

    // Back in Londrina, what was dropped stays dropped.
    cityStore.useSelectedCity.mockReturnValue('londrina')
    await view.rerender(<ExploreScreen />)
    expect(view.getByRole('button', { name: 'Bares', selected: false })).toBeOnTheScreen()
    expect(view.getByRole('button', { name: 'Música ao vivo', selected: false })).toBeOnTheScreen()
  })

  it('keeps a category both cities offer', async () => {
    const view = await render(<ExploreScreen />)
    await fireEvent.press(view.getByRole('button', { name: 'Cafés' }))
    cityStore.useSelectedCity.mockReturnValue('cambe')
    await view.rerender(<ExploreScreen />)
    expect(queries.useSearch).toHaveBeenLastCalledWith(
      'cambe',
      expect.objectContaining({ category: 'cafes' })
    )
    expect(view.getByRole('button', { name: 'Cafés', selected: true })).toBeOnTheScreen()
  })

  it('keeps the filters while the new city’s own lists are still loading', async () => {
    const view = await render(<ExploreScreen />)
    await fireEvent.press(view.getByRole('button', { name: 'Bares' }))
    queries.useCategories.mockReturnValue({ data: undefined, isPending: true })
    queries.useFilters.mockReturnValue({ data: undefined, isPending: true })
    cityStore.useSelectedCity.mockReturnValue('cambe')
    await view.rerender(<ExploreScreen />)
    expect(queries.useSearch).toHaveBeenLastCalledWith(
      'cambe',
      expect.objectContaining({ category: 'bares' })
    )
  })
})

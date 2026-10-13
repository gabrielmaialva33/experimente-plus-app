import { act, fireEvent, screen } from '@testing-library/react-native'
import { Tabs } from 'expo-router'
import { renderRouter } from 'expo-router/testing-library'
import { FlatList, ScrollView } from 'react-native'

import ExploreScreen from '@/app/(tabs)/index'
import NewsScreen from '@/app/(tabs)/news'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/analytics/events', () => ({ track: jest.fn() }))
jest.mock('@/session/context', () => ({
  useSession: () => ({ status: 'anonymous', context: null }),
}))
jest.mock('@/api/concierge', () => ({ askAssistant: jest.fn() }))
jest.mock('@/catalog/city-store', () => ({
  useSelectedCity: () => 'londrina',
  selectCity: jest.fn(),
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
  useCategories: () => ({ data: { categories: [] } }),
  useFilters: () => ({ data: { attributes: [] } }),
  useSearch: () => ({ data: { organic: [], meta: { total: 0 } } }),
  useCityAgenda: () => ({ data: undefined, isPending: true, refetch: jest.fn() }),
}))
jest.mock('@/explorer/queries', () => ({ useForYou: jest.fn(), useFollowingUpdates: jest.fn() }))
jest.mock('@/explorer/for-you-row', () => ({ ForYouRow: () => null }))
jest.mock('@/components/establishment-map', () => ({ EstablishmentMap: () => null }))

/** The two tabs open to everyone, under their names in the bar. */
const routes = {
  '(tabs)/_layout': () => (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Explorar', headerShown: false }} />
      <Tabs.Screen name="news" options={{ title: 'Novidades', headerShown: false }} />
    </Tabs>
  ),
  '(tabs)/index': ExploreScreen,
  '(tabs)/news': NewsScreen,
}

/** The tab bar's item, named "Explorar, tab, 1 of 2" by the navigator. */
const tab = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}, tab`) })

/**
 * `useScrollToTop` scrolls on the next frame, once every listener had its say;
 * `renderRouter` runs on fake timers, frames included.
 */
const nextFrame = () => act(async () => jest.advanceTimersByTime(50))

afterEach(() => jest.useRealTimers())

// Tapping the tab already open goes back to the top of its page, as tab bars do.
it('scrolls Explorar and Novidades back to the top when their open tab is tapped again', async () => {
  const feedToTop = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation()
  const newsToTop = (ScrollView.prototype as unknown as { scrollTo: jest.Mock }).scrollTo
  newsToTop.mockClear()

  try {
    await renderRouter(routes, { initialUrl: '/' })
    expect(screen.getByText('O que você quer experimentar hoje?')).toBeOnTheScreen()

    await fireEvent.press(tab('Explorar'))
    await nextFrame()
    expect(feedToTop).toHaveBeenCalledWith({ offset: 0, animated: true })

    // Switching tabs only switches: Novidades opens where it is.
    feedToTop.mockClear()
    await fireEvent.press(tab('Novidades'))
    await nextFrame()
    expect(screen.getByText('O que há de novo em Londrina')).toBeOnTheScreen()
    expect(newsToTop).not.toHaveBeenCalled()
    expect(feedToTop).not.toHaveBeenCalled()

    await fireEvent.press(tab('Novidades'))
    await nextFrame()
    expect(newsToTop).toHaveBeenCalledWith({ y: 0, animated: true })
    expect(feedToTop).not.toHaveBeenCalled()
  } finally {
    feedToTop.mockRestore()
  }
})

import { fireEvent, render, waitFor, within } from '@testing-library/react-native'
import * as Location from 'expo-location'
import { AccessibilityInfo, Linking } from 'react-native'

import ExploreScreen from '@/app/(tabs)/index'
import type { EstablishmentSummary } from '@/catalog/types'
import { EstablishmentCard } from '@/components/establishment-card'

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: jest.fn(),
  useScrollToTop: jest.fn(),
}))
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 0, left: 0 }),
}))
jest.mock('@/analytics/events', () => ({ track: jest.fn() }))
jest.mock('@/session/context', () => ({
  useSession: jest.fn(() => {
    throw new Error('Discovery must not require a session')
  }),
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
  useSearch: jest.fn(),
  useCityAgenda: () => ({ data: undefined, isPending: false }),
}))
jest.mock('@/explorer/for-you-row', () => ({ ForYouRow: () => null }))
jest.mock('@/components/establishment-map', () => ({
  EstablishmentMap: () => {
    const { Text } = jest.requireActual('react-native')
    return <Text>Mapa de resultados</Text>
  },
}))
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}))

const queries = jest.requireMock('@/catalog/queries') as { useSearch: jest.Mock }
const location = Location as unknown as Record<string, jest.Mock>

const POSITION = { latitude: -23.3105, longitude: -51.1628 }

const permission = (granted: boolean, canAskAgain = true) => ({
  granted,
  canAskAgain,
  status: granted ? 'granted' : 'denied',
})

const lastSearch = () => queries.useSearch.mock.lastCall?.[1]

let announced: jest.SpyInstance

beforeEach(() => {
  jest.clearAllMocks()
  queries.useSearch.mockReturnValue({ data: { organic: [], meta: { total: 0 } } })
  announced = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation()
  location.getForegroundPermissionsAsync.mockResolvedValue(permission(false))
  location.requestForegroundPermissionsAsync.mockResolvedValue(permission(true))
  location.hasServicesEnabledAsync.mockResolvedValue(true)
  location.getLastKnownPositionAsync.mockResolvedValue(null)
  location.getCurrentPositionAsync.mockResolvedValue({ coords: POSITION })
})

afterEach(() => announced.mockRestore())

/** The order's choices, inside the group a screen reader announces as "Ordenar". */
function orders(view: Awaited<ReturnType<typeof render>>) {
  const group = view.getByLabelText('Ordenar')
  expect(group.props.accessibilityRole).toBe('radiogroup')
  return within(group)
}

it('offers four orders as one choice, relevance first, without asking for the location', async () => {
  const view = await render(<ExploreScreen />)

  const group = orders(view)
  expect(group.getAllByRole('radio').map((radio) => radio.props.accessibilityLabel)).toEqual([
    'Relevância',
    'Mais bem avaliados',
    'Mais perto',
    'Menor preço',
  ])
  expect(group.getByRole('radio', { name: 'Relevância' }).props.accessibilityState).toMatchObject({
    selected: true,
    checked: true,
  })
  expect(group.getByRole('radio', { name: 'Mais perto' }).props.accessibilityState).toMatchObject({
    selected: false,
    checked: false,
  })
  // The relevance search is the plain one, and no permission was asked on the way in.
  expect(lastSearch()).toEqual({
    q: undefined,
    category: undefined,
    openNow: false,
    attributes: [],
  })
  expect(location.getForegroundPermissionsAsync).not.toHaveBeenCalled()
  expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled()
})

it('orders by rating and price without touching the location', async () => {
  const view = await render(<ExploreScreen />)

  await fireEvent.press(orders(view).getByRole('radio', { name: 'Mais bem avaliados' }))
  await waitFor(() => expect(lastSearch()).toMatchObject({ sort: 'rating' }))
  expect(
    orders(view).getByRole('radio', { name: 'Mais bem avaliados' }).props.accessibilityState
  ).toMatchObject({ checked: true })

  await fireEvent.press(orders(view).getByRole('radio', { name: 'Menor preço' }))
  await waitFor(() => expect(lastSearch()).toMatchObject({ sort: 'price' }))
  expect(lastSearch()).not.toHaveProperty('origin')
  expect(location.getForegroundPermissionsAsync).not.toHaveBeenCalled()
})

it('filters "Vale hoje", names it with the other filters and clears it with them', async () => {
  queries.useSearch.mockReturnValue({ data: { organic: [], meta: { total: 0 } } })
  const view = await render(<ExploreScreen />)

  await fireEvent.press(view.getByRole('button', { name: 'Vale hoje' }))

  await waitFor(() => expect(lastSearch()).toMatchObject({ benefitToday: true }))
  expect(view.getByRole('button', { name: 'Vale hoje' }).props.accessibilityState).toMatchObject({
    selected: true,
  })
  expect(
    view.getByText(
      'Nenhum lugar em Londrina com os filtros: Vale hoje. Tire um filtro para ver mais lugares.'
    )
  ).toBeOnTheScreen()
  expect(announced).toHaveBeenCalledWith('Nenhum resultado em Londrina')

  await fireEvent.press(view.getByRole('button', { name: 'Limpar filtros' }))
  await waitFor(() => expect(lastSearch()).not.toHaveProperty('benefitToday'))
})

it('asks for the location only when "Mais perto" is chosen and sends it with the search', async () => {
  queries.useSearch.mockReturnValue({
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
  })
  const view = await render(<ExploreScreen />)

  await fireEvent.press(orders(view).getByRole('radio', { name: 'Mais perto' }))

  await waitFor(() => expect(lastSearch()).toMatchObject({ sort: 'distance', origin: POSITION }))
  expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1)
  expect(announced).toHaveBeenCalledWith('Procurando sua localização…')
  expect(announced).toHaveBeenCalledWith('Lista ordenada pelos lugares mais perto.')
  expect(
    orders(view).getByRole('radio', { name: 'Mais perto' }).props.accessibilityState
  ).toMatchObject({ checked: true })
  expect(view.queryByTestId('sort-location-notice')).toBeNull()

  // The map shows the same search: one filter state, the position included.
  const listSearch = lastSearch()
  await fireEvent.press(view.getByRole('button', { name: 'Ver no mapa' }))
  expect(view.getByText('Mapa de resultados')).toBeOnTheScreen()
  expect(lastSearch()).toEqual(listSearch)
  expect(orders(view).getByRole('radio', { name: 'Mais perto' })).toBeOnTheScreen()

  // Another order drops the position from the search.
  await fireEvent.press(orders(view).getByRole('radio', { name: 'Relevância' }))
  await waitFor(() => expect(lastSearch()).not.toHaveProperty('origin'))
  expect(lastSearch()).not.toHaveProperty('sort')
})

// "Mais perto" is only an order the person can follow when each card says how near it is.
it('shows how far each place is while "Mais perto" orders the list, and only then', async () => {
  const place = (slug: string, name: string, latitude: number | null) => ({
    slug,
    name,
    address: {
      district: 'Centro',
      latitude,
      longitude: latitude === null ? null : POSITION.longitude,
    },
    business_status: 'open',
    is_open_now: true,
  })
  queries.useSearch.mockReturnValue({
    data: {
      organic: [
        // 0,0031° and 0,0108° of latitude from the position: about 350 m and 1,2 km.
        place('cafe', 'Café da Praça', POSITION.latitude + 0.0031),
        place('bar', 'Bar do Lago', POSITION.latitude + 0.0108),
        place('sem-mapa', 'Sem Mapa', null),
      ],
      meta: { total: 3 },
    },
  })
  const view = await render(<ExploreScreen />)
  expect(view.queryByText(/^a \d/)).toBeNull()

  await fireEvent.press(orders(view).getByRole('radio', { name: 'Mais perto' }))
  await waitFor(() => expect(lastSearch()).toMatchObject({ sort: 'distance', origin: POSITION }))

  expect(view.getByText('a 350 m · Centro')).toBeOnTheScreen()
  expect(view.getByText('a 1,2 km · Centro')).toBeOnTheScreen()
  expect(
    view.getByRole('button', { name: /^Café da Praça, a 350 m, Aberto agora/ })
  ).toBeOnTheScreen()
  expect(view.getByRole('button', { name: /^Bar do Lago, a 1,2 km, / })).toBeOnTheScreen()
  // A place without a point on the map says nothing rather than a wrong distance.
  expect(view.getByRole('button', { name: /^Sem Mapa, Aberto agora/ })).toBeOnTheScreen()

  // Computed here and nowhere else: the search sends the position, not the distances.
  expect(JSON.stringify(queries.useSearch.mock.calls)).not.toMatch(/350|1,2 km/)
  const { track } = jest.requireMock('@/analytics/events') as { track: jest.Mock }
  expect(JSON.stringify(track.mock.calls)).not.toMatch(/km| m"|latitude/)

  // Another order, and the position with it, takes the distances away.
  await fireEvent.press(orders(view).getByRole('radio', { name: 'Relevância' }))
  await waitFor(() => expect(lastSearch()).not.toHaveProperty('origin'))
  expect(view.queryByText(/^a \d/)).toBeNull()
  expect(view.getByRole('button', { name: /^Café da Praça, Aberto agora/ })).toBeOnTheScreen()
})

it('stays in relevance and says why when the location is refused', async () => {
  location.requestForegroundPermissionsAsync.mockResolvedValue(permission(false, true))
  const view = await render(<ExploreScreen />)

  await fireEvent.press(orders(view).getByRole('radio', { name: 'Mais perto' }))

  const message = 'Sem permissão para usar sua localização. A lista segue por relevância.'
  expect(await view.findByText(message)).toBeOnTheScreen()
  expect(announced).toHaveBeenCalledWith(message)
  expect(
    orders(view).getByRole('radio', { name: 'Relevância' }).props.accessibilityState
  ).toMatchObject({ checked: true })
  expect(lastSearch()).not.toHaveProperty('origin')
  expect(lastSearch()).not.toHaveProperty('sort')
  // A refusal is respected: no button pushes for it again.
  expect(within(view.getByTestId('sort-location-notice')).queryByRole('button')).toBeNull()
})

it('offers the system settings when the permission is blocked for good', async () => {
  location.getForegroundPermissionsAsync.mockResolvedValue(permission(false, false))
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined)
  const view = await render(<ExploreScreen />)

  await fireEvent.press(orders(view).getByRole('radio', { name: 'Mais perto' }))

  expect(
    await view.findByText(
      'A localização está bloqueada para o Experimente+. A lista segue por relevância.'
    )
  ).toBeOnTheScreen()
  expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled()
  await fireEvent.press(view.getByRole('button', { name: 'Abrir configurações' }))
  expect(openSettings).toHaveBeenCalledTimes(1)
  openSettings.mockRestore()
})

it('asks to try again when the device location is off, and recovers once it is on', async () => {
  location.getForegroundPermissionsAsync.mockResolvedValue(permission(true))
  location.hasServicesEnabledAsync.mockResolvedValueOnce(false)
  const view = await render(<ExploreScreen />)

  await fireEvent.press(orders(view).getByRole('radio', { name: 'Mais perto' }))
  expect(
    await view.findByText('A localização do aparelho está desligada. A lista segue por relevância.')
  ).toBeOnTheScreen()
  expect(lastSearch()).not.toHaveProperty('origin')

  await fireEvent.press(view.getByRole('button', { name: 'Tentar de novo' }))
  await waitFor(() => expect(lastSearch()).toMatchObject({ sort: 'distance', origin: POSITION }))
  expect(view.queryByTestId('sort-location-notice')).toBeNull()
})

it('marks a card "Vale hoje" and reads it with the card', async () => {
  const place = {
    slug: 'cafe',
    name: 'Café da Praça',
    short_description: null,
    city: { slug: 'londrina', name: 'Londrina', state_code: 'PR' },
    address: { district: 'Centro', latitude: null, longitude: null },
    business_status: 'open',
    is_open_now: true,
    primary_category: null,
    categories: [],
    cover: null,
    is_sponsored: false,
    reviews: { count: 0, average: null },
    benefit_today: true,
    published_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  } as unknown as EstablishmentSummary

  const view = await render(<EstablishmentCard establishment={place} onPress={jest.fn()} />)
  expect(view.getByText('Vale hoje')).toBeOnTheScreen()
  expect(view.getByRole('button').props.accessibilityLabel).toBe(
    'Café da Praça, Aberto agora, Centro, Vale hoje'
  )

  await view.rerender(
    <EstablishmentCard establishment={{ ...place, benefit_today: false }} onPress={jest.fn()} />
  )
  expect(view.queryByText('Vale hoje')).toBeNull()

  // With "Mais perto", the distance comes right after the name.
  await view.rerender(
    <EstablishmentCard establishment={place} onPress={jest.fn()} distance="a 1,2 km" />
  )
  expect(view.getByText('a 1,2 km · Centro')).toBeOnTheScreen()
  expect(view.getByRole('button').props.accessibilityLabel).toBe(
    'Café da Praça, a 1,2 km, Aberto agora, Centro, Vale hoje'
  )
})

import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { AccessibilityInfo, Linking } from 'react-native'

import EstablishmentScreen from '@/app/estabelecimento/[city]/[slug]'
import type { EstablishmentDetail } from '@/catalog/types'

const mockRouter = { push: jest.fn(), back: jest.fn(), navigate: jest.fn() }
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: jest.fn(),
  Stack: { Screen: () => null },
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 0, left: 0 }),
}))
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('expo-image', () => ({ Image: jest.requireActual('react-native').View }))
jest.mock('@/analytics/events', () => ({ track: jest.fn() }))
jest.mock('@/api/client', () => ({ ApiError: class ApiError extends Error {} }))
jest.mock('@/purchases/queries', () => ({
  usePurchaseEditions: () => ({ data: { products: [] } }),
}))
jest.mock('@/catalog/queries', () => ({ useEstablishment: jest.fn() }))
jest.mock('@/session/context', () => ({ useSession: jest.fn() }))
jest.mock('@/reviews/queries', () => ({
  useEstablishmentReviews: () => ({ data: undefined, isError: false }),
}))
jest.mock('@/explorer/queries', () => ({
  useSavedStatus: () => ({ data: undefined }),
  useToggleSaved: jest.fn(),
  useSavedContent: () => ({ data: undefined }),
  useToggleSavedContent: () => ({ mutate: jest.fn(), isPending: false }),
}))
jest.mock('@/partner-content/queries', () => ({
  usePartnerContent: () => ({ data: [], isPending: false, isError: false }),
}))
jest.mock('@/place/follow-hint', () => ({
  followExplained: () => false,
  markFollowExplained: jest.fn(),
}))
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))

const router = jest.requireMock('expo-router') as { useLocalSearchParams: jest.Mock }
const queries = jest.requireMock('@/catalog/queries') as { useEstablishment: jest.Mock }
const saved = jest.requireMock('@/explorer/queries') as { useToggleSaved: jest.Mock }
const session = jest.requireMock('@/session/context') as { useSession: jest.Mock }
const { track } = jest.requireMock('@/analytics/events') as { track: jest.Mock }

const detail: EstablishmentDetail = {
  id: 1,
  slug: 'cafe',
  name: 'Café da Praça',
  short_description: null,
  description: null,
  reviews: { count: 0, average: null },
  city: { slug: 'londrina', name: 'Londrina', state_code: 'PR', timezone: 'America/Sao_Paulo' },
  address: {
    postal_code: null,
    street: 'Rua Central',
    number: '10',
    without_number: false,
    complement: null,
    district: 'Centro',
    reference: null,
    latitude: -23.31,
    longitude: -51.16,
  },
  contacts: {
    phone: '43999999999',
    whatsapp: null,
    email: null,
    website: 'https://example.com',
    instagram: null,
    booking_url: null,
  },
  business_status: 'open',
  availability_type: 'regular_hours',
  is_open_now: false,
  categories: [],
  attributes: [
    {
      key: 'wifi',
      name: 'Wi-Fi',
      description: null,
      type: 'boolean',
      unit: null,
      value: true,
      options: [],
    },
  ],
  opening_hours: {
    weekly: [1, 2, 3, 4, 5].map((weekday) => ({
      weekday,
      opens_at: '11:00:00',
      closes_at: '15:00:00',
      spans_next_day: false,
      sort_order: 0,
    })),
    special_days: [],
  },
  media: [],
  cover: {
    purpose: 'cover',
    is_cover: true,
    sort_order: 0,
    alt_text: 'Fachada do café',
    caption: null,
    asset: {
      url: 'https://example.com/cover.jpg',
      mime_type: 'image/jpeg',
      file_extension: 'jpg',
      width: 800,
      height: 600,
    },
  },
  is_sponsored: false,
  published_at: '',
  updated_at: '',
}

const idleToggle = { mutate: jest.fn(), isPending: false, isError: false }

beforeEach(() => {
  jest.clearAllMocks()
  router.useLocalSearchParams.mockReturnValue({ city: 'londrina', slug: 'cafe' })
  queries.useEstablishment.mockReturnValue({ data: detail, isPending: false, isError: false })
  session.useSession.mockReturnValue({ status: 'anonymous' })
  saved.useToggleSaved.mockReturnValue(idleToggle)
})

describe('the route of a place', () => {
  it.each([
    ['a path', { city: 'londrina', slug: '../../me/context' }],
    ['a query string', { city: 'londrina', slug: 'cafe?page=2' }],
    ['a repeated parameter', { city: ['londrina', 'cambe'], slug: 'cafe' }],
    ['an empty slug', { city: 'londrina', slug: '' }],
    ['no city', { slug: 'cafe' }],
  ])('answers %s as a place that is not there, without asking', async (_case, params) => {
    router.useLocalSearchParams.mockReturnValue(params)
    queries.useEstablishment.mockReturnValue({ isPending: true })
    const view = await render(<EstablishmentScreen />)

    expect(queries.useEstablishment).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String)
    )
    expect(view.queryByRole('progressbar')).toBeNull()
    expect(
      view.getByRole('header', { name: 'Este lugar não está mais disponível' })
    ).toBeOnTheScreen()
    await fireEvent.press(view.getByRole('button', { name: 'Explorar lugares' }))
    expect(mockRouter.navigate).toHaveBeenCalledWith('/')
  })

  it('reads the slugs as the public catalogue does: trimmed and lowercased', async () => {
    router.useLocalSearchParams.mockReturnValue({ city: ' Londrina', slug: 'CAFE' })
    await render(<EstablishmentScreen />)
    expect(queries.useEstablishment).toHaveBeenCalledWith('londrina', 'cafe')
  })

  it('counts a view once per visit, however often the page is refetched', async () => {
    const view = await render(<EstablishmentScreen />)
    queries.useEstablishment.mockReturnValue({ data: { ...detail, updated_at: 'later' } })
    await view.rerender(<EstablishmentScreen />)
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('establishment_view', {
      city_slug: 'londrina',
      establishment_slug: 'cafe',
    })
  })
})

describe('contacts', () => {
  it.each(['www.cafe.com.br', 'javascript:alert(1)', 'intent://scan#Intent;end', 'ftp://cafe'])(
    'offers no site for "%s", which is not an http(s) address',
    async (website) => {
      queries.useEstablishment.mockReturnValue({
        data: { ...detail, contacts: { ...detail.contacts, website } },
      })
      const view = await render(<EstablishmentScreen />)
      expect(view.queryByRole('button', { name: 'Site' })).toBeNull()
      expect(view.getByRole('button', { name: 'Ligar' })).toBeOnTheScreen()
    }
  )

  it('says so when the device has nothing to open a contact with', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('No handler'))
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility')
    try {
      const view = await render(<EstablishmentScreen />)
      await fireEvent.press(view.getByRole('button', { name: 'Ligar' }))
      expect(openURL).toHaveBeenCalledWith('tel:43999999999')
      await waitFor(() =>
        expect(announce).toHaveBeenCalledWith('Não foi possível abrir a ligação neste aparelho.')
      )
    } finally {
      openURL.mockRestore()
      announce.mockRestore()
    }
  })
})

it('names what the place offers once each, by its key', async () => {
  queries.useEstablishment.mockReturnValue({
    data: {
      ...detail,
      attributes: [
        detail.attributes[0],
        { ...detail.attributes[0], key: 'wifi_free', name: 'Wi-Fi' },
      ],
    },
  })
  const error = jest.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const view = await render(<EstablishmentScreen />)
    expect(view.getAllByText('Wi-Fi')).toHaveLength(2)
    expect(error.mock.calls.flat().join(' ')).not.toMatch(/same key/)
  } finally {
    error.mockRestore()
  }
})

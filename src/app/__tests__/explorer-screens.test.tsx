import { fireEvent, render } from '@testing-library/react-native'

import InterestsScreen from '@/app/conta/interesses'
import FavoritesScreen from '@/app/conta/favoritos'
import ItineraryScreen from '@/app/roteiros/[id]'

jest.mock('@/api/client', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number) {
      super(`request failed with ${status}`)
      this.status = status
    }
  },
}))
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('expo-image', () => ({ Image: 'Image' }))
jest.mock('@/api/config', () => ({ resolveMediaUrl: (url: string) => url }))
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))

const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: jest.fn(),
}))
jest.mock('@/catalog/city-store', () => ({ useSelectedCity: () => 'londrina' }))
jest.mock('@/catalog/queries', () => ({ useCategories: jest.fn() }))
jest.mock('@/explorer/queries', () => ({
  useSavedList: jest.fn(),
  useSavedContent: jest.fn(),
  useToggleSavedContent: jest.fn(),
  useToggleSaved: jest.fn(),
  useInterests: jest.fn(),
  useReplaceInterests: jest.fn(),
  useItinerary: jest.fn(),
  useUpdateItinerary: jest.fn(),
  useReorderItineraryStops: jest.fn(),
  useRemoveItineraryStop: jest.fn(),
  useDeleteItinerary: jest.fn(),
}))

const router = jest.requireMock('expo-router') as { useLocalSearchParams: jest.Mock }
const catalog = jest.requireMock('@/catalog/queries') as { useCategories: jest.Mock }
const queries = jest.requireMock('@/explorer/queries') as Record<string, jest.Mock>

const idle = (overrides = {}) => ({
  mutate: jest.fn(),
  isPending: false,
  isError: false,
  isSuccess: false,
  error: null,
  ...overrides,
})

const card = (id: number, name: string) => ({
  id,
  slug: `lugar-${id}`,
  name,
  city_slug: 'londrina',
  city_name: 'Londrina',
  cover_url: null,
  category: 'Cafés',
})

beforeEach(() => {
  jest.clearAllMocks()
  for (const hook of [
    'useToggleSaved',
    'useReplaceInterests',
    'useUpdateItinerary',
    'useReorderItineraryStops',
    'useRemoveItineraryStop',
    'useDeleteItinerary',
    'useToggleSavedContent',
  ]) {
    queries[hook].mockReturnValue(idle())
  }
  queries.useSavedContent.mockReturnValue({ isPending: false, data: { data: [], unavailable: 0 } })
})

describe('favourites', () => {
  it('says how many saved places are unavailable instead of letting them vanish', async () => {
    queries.useSavedList.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        data: [{ id: 1, establishment: card(7, 'Ateliê do Café'), created_at: '2026-09-23T12:00:00Z' }],
        unavailable: 2,
      },
    })

    const view = await render(<FavoritesScreen />)

    expect(view.getByText('Ateliê do Café')).toBeTruthy()
    expect(view.getByTestId('saved-unavailable').props.children).toMatch(/^2 lugares salvos/)
  })

  it('opens the establishment through its city and slug', async () => {
    queries.useSavedList.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        data: [{ id: 1, establishment: card(7, 'Ateliê do Café'), created_at: '2026-09-23T12:00:00Z' }],
        unavailable: 0,
      },
    })

    const view = await render(<FavoritesScreen />)
    await fireEvent.press(view.getByLabelText('Ateliê do Café, Cafés · Londrina'))

    expect(mockPush).toHaveBeenCalledWith('/estabelecimento/londrina/lugar-7')
  })
})

describe('content favourites', () => {
  const savedPlaces = () =>
    queries.useSavedList.mockReturnValue({
      isPending: false,
      isError: false,
      data: { data: [], unavailable: 0 },
    })

  it('lists favourited experiences and events above the places, with unavailable ones counted', async () => {
    savedPlaces()
    queries.useSavedContent.mockReturnValue({
      isPending: false,
      data: {
        data: [
          {
            id: 4,
            content: {
              kind: 'event',
              id: 21,
              title: 'Noite de jazz',
              starts_at: '2026-09-26T23:00:00Z',
              ends_at: '2026-09-27T02:00:00Z',
              cover_url: null,
              establishment: card(7, 'Ateliê do Café'),
            },
            created_at: '2026-09-23T12:00:00Z',
          },
        ],
        unavailable: 1,
      },
    })

    const view = await render(<FavoritesScreen />)

    expect(view.getByText('Noite de jazz')).toBeTruthy()
    expect(view.getByTestId('content-unavailable').props.children).toMatch(/^1 item salvo/)
    await fireEvent.press(view.getByLabelText('Noite de jazz, Ateliê do Café'))
    expect(mockPush).toHaveBeenCalledWith('/estabelecimento/londrina/lugar-7')
  })

  it('removes a content favourite under its route kind', async () => {
    savedPlaces()
    const mutate = jest.fn()
    queries.useToggleSavedContent.mockReturnValue(idle({ mutate }))
    queries.useSavedContent.mockReturnValue({
      isPending: false,
      data: {
        data: [
          {
            id: 5,
            content: {
              kind: 'experience',
              id: 31,
              title: 'Degustação guiada',
              starts_at: null,
              ends_at: null,
              cover_url: null,
              establishment: card(7, 'Ateliê do Café'),
            },
            created_at: '2026-09-23T12:00:00Z',
          },
        ],
        unavailable: 0,
      },
    })

    const view = await render(<FavoritesScreen />)
    await fireEvent.press(view.getByTestId('unsave-content-experience-31'))

    expect(mutate).toHaveBeenCalledWith({ kind: 'experiences', id: 31, save: false })
  })
})

describe('interests', () => {
  it('sends the whole set as slugs, the identity the catalogue publishes', async () => {
    const mutate = jest.fn()
    queries.useReplaceInterests.mockReturnValue(idle({ mutate }))
    queries.useInterests.mockReturnValue({
      isPending: false,
      isError: false,
      data: { data: [] },
    })
    catalog.useCategories.mockReturnValue({
      isPending: false,
      data: {
        categories: [
          { slug: 'cafes', name: 'Cafés' },
          { slug: 'bares', name: 'Bares' },
        ],
      },
    })

    const view = await render(<InterestsScreen />)
    await fireEvent.press(view.getByTestId('interest-cafes'))
    await fireEvent.press(view.getByTestId('interest-bares'))
    await fireEvent.press(view.getByTestId('save-interests'))

    expect(mutate).toHaveBeenCalledWith(['cafes', 'bares'])
  })

  it('keeps a retired interest visible so the person can undo it', async () => {
    queries.useInterests.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        data: [
          {
            id: 3,
            category: { slug: 'museus', name: 'Museus', is_active: false },
            created_at: '2026-09-23T12:00:00Z',
          },
        ],
      },
    })
    catalog.useCategories.mockReturnValue({
      isPending: false,
      data: { categories: [{ slug: 'cafes', name: 'Cafés' }] },
    })

    const view = await render(<InterestsScreen />)

    expect(view.getByLabelText('Museus, não oferecida no momento')).toBeTruthy()
    expect(view.getByTestId('interest-museus').props.accessibilityState).toMatchObject({
      checked: true,
    })
  })

  it('does not offer to save when nothing changed', async () => {
    queries.useInterests.mockReturnValue({ isPending: false, isError: false, data: { data: [] } })
    catalog.useCategories.mockReturnValue({
      isPending: false,
      data: { categories: [{ slug: 'cafes', name: 'Cafés' }] },
    })

    const view = await render(<InterestsScreen />)

    expect(view.getByTestId('save-interests').props.accessibilityState).toMatchObject({
      disabled: true,
    })
  })
})

describe('itinerary', () => {
  const itinerary = {
    id: 5,
    name: 'Sábado no centro',
    notes: null,
    created_at: '2026-09-23T12:00:00Z',
    updated_at: '2026-09-23T12:00:00Z',
    stops: [
      { id: 11, position: 0, note: null, establishment: card(7, 'Café da Manhã') },
      { id: 12, position: 1, note: 'voltar à noite', establishment: null },
      { id: 13, position: 2, note: null, establishment: card(8, 'Bar da Noite') },
    ],
  }

  beforeEach(() => {
    router.useLocalSearchParams.mockReturnValue({ id: '5' })
    queries.useItinerary.mockReturnValue({ isPending: false, data: itinerary })
  })

  it('keeps a stop whose place left the catalogue, with its note', async () => {
    const view = await render(<ItineraryScreen />)

    expect(view.getByTestId('stop-12-unavailable')).toBeTruthy()
    expect(view.getByText('voltar à noite')).toBeTruthy()
  })

  it('sends the whole new order when a stop moves', async () => {
    const mutate = jest.fn()
    queries.useReorderItineraryStops.mockReturnValue(idle({ mutate }))

    const view = await render(<ItineraryScreen />)
    await fireEvent.press(view.getByTestId('stop-13-up'))

    expect(mutate).toHaveBeenCalledWith([11, 13, 12])
  })

  it('cannot move the first stop up or the last one down', async () => {
    const view = await render(<ItineraryScreen />)

    expect(view.getByTestId('stop-11-up').props.accessibilityState).toMatchObject({ disabled: true })
    expect(view.getByTestId('stop-13-down').props.accessibilityState).toMatchObject({
      disabled: true,
    })
  })

  it('asks before deleting the itinerary', async () => {
    const mutate = jest.fn()
    queries.useDeleteItinerary.mockReturnValue(idle({ mutate }))

    const view = await render(<ItineraryScreen />)
    await fireEvent.press(view.getByTestId('delete-itinerary'))
    expect(mutate).not.toHaveBeenCalled()

    await fireEvent.press(view.getByTestId('confirm-delete-itinerary'))
    expect(mutate).toHaveBeenCalledWith(5, expect.any(Object))
  })

  it('says so when the itinerary is not the caller’s or does not exist', async () => {
    queries.useItinerary.mockReturnValue({ isPending: false, data: undefined })

    const view = await render(<ItineraryScreen />)

    expect(view.getByText('Este roteiro não foi encontrado.')).toBeTruthy()
  })
})

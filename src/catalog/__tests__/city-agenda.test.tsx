import { fireEvent, render, within } from '@testing-library/react-native'

import { CityAgenda } from '@/catalog/city-agenda'
import { COMPACT_CARD } from '@/components/compact-card'
import { palette } from '@/theme/tokens'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('expo-image', () => ({ Image: jest.requireActual('react-native').View }))
jest.mock('@/api/config', () => ({ resolveMediaUrl: (url: string) => url }))
jest.mock('@/theme/use-colors', () => ({ useColors: () => jest.requireActual('@/theme/tokens').palette.light }))
jest.mock('@/catalog/queries', () => ({ useCityAgenda: jest.fn() }))

const catalog = jest.requireMock('@/catalog/queries') as { useCityAgenda: jest.Mock }

const event = (id: number, title: string, startsAt: string, endsAt: string) => ({
  kind: 'event' as const, id, title, description: null, cover: null,
  establishmentName: 'Ateliê do Café', establishmentSlug: 'atelie', citySlug: 'londrina',
  startsAt, endsAt,
})

beforeEach(() => {
  jest.clearAllMocks()
  catalog.useCityAgenda.mockReturnValue({
    isPending: false,
    data: {
      city: { slug: 'londrina', name: 'Londrina', stateCode: 'PR', timeZone: 'America/Sao_Paulo' },
      localDate: '2026-09-28',
      // 19:00 UTC is 16:00 in Londrina.
      happeningToday: [event(1, 'Tarde de degustação de cafés', '2026-09-28T19:00:00Z', '2026-09-28T22:00:00Z')],
      upcoming: [event(2, 'Festival de petiscos', '2026-10-01T23:00:00Z', '2026-10-02T02:00:00Z')],
      newExperiences: [{
        kind: 'experience', id: 3, title: 'Menu de primavera', description: null,
        cover: { url: 'https://cdn.example/menu.jpg', altText: 'Prato do menu de primavera' },
        establishmentName: 'Casa de Petiscos', establishmentSlug: 'casa', citySlug: 'londrina',
        publishedAt: '2026-09-25T15:00:00Z',
      }],
      isEmpty: false,
    },
  })
})

it('leads each event with its date in the city, never with an empty photo box', async () => {
  const view = await render(<CityAgenda citySlug="londrina" />)

  expect(view.getByRole('header', { name: 'Acontece em Londrina' })).toBeOnTheScreen()
  expect(view.queryByText('Foto indisponível')).toBeNull()

  const today = view.getByTestId('agenda-card-event-1')
  const tile = within(today).getByTestId('date-tile', { includeHiddenElements: true })
  expect(tile).toHaveStyle({ backgroundColor: palette.light.chrome })
  expect(within(today).getByText('28', { includeHiddenElements: true })).toBeOnTheScreen()
  // The tile carries the day, so the row keeps only the hours and the place.
  expect(within(today).getByText('16:00–19:00 · Ateliê do Café')).toBeOnTheScreen()

  const upcoming = view.getByTestId('agenda-card-event-2')
  expect(within(upcoming).getByTestId('date-tile', { includeHiddenElements: true })).toHaveStyle({ backgroundColor: palette.light.primarySoft })
  // 23:00 UTC on the 1st is still 20:00 on the 1st in Londrina.
  expect(within(upcoming).getByText('01', { includeHiddenElements: true })).toBeOnTheScreen()
  // A screen reader still hears the date, which the tile shows only visually.
  expect(upcoming.props.accessibilityLabel).toMatch(/^Festival de petiscos, Ateliê do Café, 01 de out\.?,? 20:00–23:00$/)
})

it('keeps experiences in fixed-size cards and opens every item by its public identity', async () => {
  const view = await render(<CityAgenda citySlug="londrina" />)

  expect(view.getByText('Novidades')).toBeOnTheScreen()
  const card = view.getByTestId('agenda-card-experience-3')
  expect(card).toHaveStyle({ width: COMPACT_CARD.width, height: COMPACT_CARD.height })
  expect(within(card).getByLabelText('Prato do menu de primavera')).toBeOnTheScreen()

  await fireEvent.press(card)
  expect(mockPush).toHaveBeenLastCalledWith('/estabelecimento/londrina/casa')
  await fireEvent.press(view.getByTestId('agenda-card-event-1'))
  expect(mockPush).toHaveBeenLastCalledWith('/estabelecimento/londrina/atelie')
})

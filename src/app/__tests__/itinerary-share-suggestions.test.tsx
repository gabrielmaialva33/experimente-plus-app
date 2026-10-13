import { fireEvent, render, within } from '@testing-library/react-native'
import { AccessibilityInfo, Share } from 'react-native'

import ItineraryScreen from '@/app/roteiros/[id]'
import { distanceLabel } from '@/catalog/distance'

jest.mock('@/api/client', () => ({ ApiError: class ApiError extends Error {} }))
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('expo-image', () => ({ Image: 'Image' }))
jest.mock('@/api/config', () => ({
  resolveMediaUrl: (url: string) => url,
  apiUrl: (path: string) => `https://experimente.test${path}`,
}))
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))

const mockPush = jest.fn()
const mockNavigate = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), navigate: mockNavigate }),
  useLocalSearchParams: () => ({ id: '5' }),
}))
jest.mock('@/catalog/city-store', () => ({ useSelectedCity: jest.fn(() => 'londrina') }))
jest.mock('@/explorer/queries', () => ({
  useItinerary: jest.fn(),
  useUpdateItinerary: jest.fn(),
  useReorderItineraryStops: jest.fn(),
  useRemoveItineraryStop: jest.fn(),
  useDeleteItinerary: jest.fn(),
  useAddItineraryStop: jest.fn(),
  useSavedList: jest.fn(),
  useItinerarySuggestions: jest.fn(),
}))
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  onlineManager: { isOnline: () => mockOnline.value, subscribe: () => () => {} },
}))

const mockOnline = { value: true }
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

const address = {
  street: 'Rua Sergipe',
  number: '100',
  without_number: false,
  complement: null,
  district: 'Centro',
}

const itinerary = (stops: unknown[]) => ({
  id: 5,
  name: 'Sábado no centro',
  notes: null,
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
  stops,
})

const withStops = itinerary([
  { id: 11, position: 0, note: 'só eu leio', establishment: card(7, 'Café da Manhã'), address },
  { id: 12, position: 1, note: null, establishment: card(8, 'Bar da Noite'), address: null },
])

beforeEach(() => {
  jest.clearAllMocks()
  mockOnline.value = true
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {})
  for (const hook of [
    'useUpdateItinerary',
    'useReorderItineraryStops',
    'useRemoveItineraryStop',
    'useDeleteItinerary',
    'useAddItineraryStop',
  ]) {
    queries[hook].mockReturnValue(idle())
  }
  queries.useItinerary.mockReturnValue({ isPending: false, data: withStops })
  queries.useItinerarySuggestions.mockReturnValue({
    isPending: false,
    isError: false,
    data: { basis: 'popular', data: [] },
  })
})

describe('sharing an itinerary', () => {
  it('hands the route to the system’s share sheet as text', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction })
    const view = await render(<ItineraryScreen />)

    await fireEvent.press(view.getByRole('button', { name: 'Compartilhar roteiro' }))

    expect(share).toHaveBeenCalledTimes(1)
    const [content] = share.mock.calls[0]
    expect(content).toMatchObject({ title: 'Sábado no centro' })
    const message = (content as { message: string }).message
    expect(message).toContain('Roteiro: Sábado no centro')
    expect(message).toContain(
      '1. Café da Manhã\nRua Sergipe, 100 · Centro · Londrina\nhttps://experimente.test/cidades/londrina/estabelecimentos/lugar-7'
    )
    expect(message).toContain(
      '2. Bar da Noite\nhttps://experimente.test/cidades/londrina/estabelecimentos/lugar-8'
    )
    expect(message).not.toContain('só eu leio')
  })

  it('says so when the sheet cannot open', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('no activity'))
    const view = await render(<ItineraryScreen />)

    await fireEvent.press(view.getByRole('button', { name: 'Compartilhar roteiro' }))

    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Não foi possível abrir o compartilhamento agora.'
    )
  })

  it('offers no sharing while no stop has a public place', async () => {
    queries.useItinerary.mockReturnValue({
      isPending: false,
      data: itinerary([{ id: 12, position: 0, note: null, establishment: null, address: null }]),
    })
    const view = await render(<ItineraryScreen />)

    expect(view.queryByRole('button', { name: 'Compartilhar roteiro' })).toBeNull()
  })
})

describe('suggestions for the itinerary', () => {
  it('asks for the itinerary and the city on screen, near the stops', async () => {
    const mutate = jest.fn()
    queries.useAddItineraryStop.mockReturnValue(idle({ mutate }))
    queries.useItinerarySuggestions.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        basis: 'nearby',
        data: [
          // Already a stop: left out at once, before the list is asked again.
          { establishment: card(7, 'Café da Manhã'), distance_km: 0 },
          { establishment: card(9, 'Sorveteria da Praça'), distance_km: 0.4 },
          { establishment: card(10, 'Museu do Café'), distance_km: 2.5 },
        ],
      },
    })
    const view = await render(<ItineraryScreen />)

    expect(queries.useItinerarySuggestions).toHaveBeenCalledWith(5, 'londrina')
    expect(view.getByText('Sugestões para o roteiro')).toBeOnTheScreen()
    expect(view.getByText('Perto das suas paradas')).toBeOnTheScreen()
    expect(view.queryByTestId('suggestion-7')).toBeNull()
    expect(view.getByLabelText('Sorveteria da Praça, Cafés · Londrina · a 400 m')).toBeOnTheScreen()
    expect(view.getByLabelText('Museu do Café, Cafés · Londrina · a 2,5 km')).toBeOnTheScreen()

    await fireEvent.press(
      view.getByRole('button', { name: 'Adicionar Sorveteria da Praça ao roteiro' })
    )
    expect(mutate).toHaveBeenCalledWith({ id: 5, establishmentId: 9 }, expect.any(Object))
    mutate.mock.calls[0][1].onSuccess()
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Sorveteria da Praça adicionado ao roteiro.'
    )

    await fireEvent.press(view.getByLabelText('Museu do Café, Cafés · Londrina · a 2,5 km'))
    expect(mockPush).toHaveBeenCalledWith('/estabelecimento/londrina/lugar-10')
  })

  it('says when it shows the most visited places instead', async () => {
    queries.useItinerarySuggestions.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        basis: 'popular',
        data: [{ establishment: card(9, 'Sorveteria'), distance_km: null }],
      },
    })
    const view = await render(<ItineraryScreen />)

    expect(view.getByText('Os mais visitados')).toBeOnTheScreen()
    expect(view.getByLabelText('Sorveteria, Cafés · Londrina')).toBeOnTheScreen()
  })

  it('says it is loading, and what it waits for when offline', async () => {
    queries.useItinerarySuggestions.mockReturnValue({ isPending: true, isError: false })
    const view = await render(<ItineraryScreen />)
    expect(view.getByText('Carregando sugestões…')).toBeOnTheScreen()

    mockOnline.value = false
    const offline = await render(<ItineraryScreen />)
    expect(offline.getAllByText(/Sem conexão com a internet/)[0]).toBeOnTheScreen()
  })

  it('leads to Explorar when there is nothing to suggest', async () => {
    const view = await render(<ItineraryScreen />)

    expect(view.getByText('Nenhuma sugestão por enquanto. Procure mais lugares em Explorar.'))
    await fireEvent.press(view.getByRole('button', { name: 'Procurar em Explorar' }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('offers another try when the suggestions fail', async () => {
    const refetch = jest.fn()
    queries.useItinerarySuggestions.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
      refetch,
    })
    const view = await render(<ItineraryScreen />)

    expect(view.getByText('Não foi possível carregar as sugestões agora.')).toBeOnTheScreen()
    await fireEvent.press(view.getByTestId('retry-suggestions'))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('says so when adding a suggestion fails', async () => {
    queries.useAddItineraryStop.mockReturnValue(idle({ isError: true }))
    queries.useItinerarySuggestions.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        basis: 'popular',
        data: [{ establishment: card(9, 'Sorveteria'), distance_km: null }],
      },
    })
    const view = await render(<ItineraryScreen />)

    expect(within(view.getByTestId('itinerary-suggestions')).getByRole('alert')).toHaveTextContent(
      'Não foi possível adicionar agora.'
    )
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Não foi possível adicionar agora.'
    )
  })
})

describe('distanceLabel', () => {
  it('reads metres under a kilometre and kilometres with a comma above it', () => {
    expect(distanceLabel(0)).toBe('a menos de 100 m')
    expect(distanceLabel(0.5)).toBe('a 500 m')
    expect(distanceLabel(1)).toBe('a 1 km')
    expect(distanceLabel(12.3)).toBe('a 12,3 km')
    expect(distanceLabel(null)).toBeNull()
  })
})

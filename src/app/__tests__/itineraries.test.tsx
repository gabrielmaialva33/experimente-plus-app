import { fireEvent, render } from '@testing-library/react-native'

import ItinerariesScreen from '@/app/roteiros/index'
import AddToItineraryScreen from '@/app/roteiros/adicionar/[establishmentId]'

jest.mock('@/api/client', () => ({ ApiError: class ApiError extends Error {} }))
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() }
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ establishmentId: '9' }),
}))
jest.mock('@/explorer/queries', () => ({
  useItineraries: jest.fn(),
  useCreateItinerary: jest.fn(),
  useAddItineraryStop: jest.fn(),
}))

const queries = jest.requireMock('@/explorer/queries') as Record<string, jest.Mock>

const idle = (overrides = {}) => ({ mutate: jest.fn(), isPending: false, isError: false, error: null, ...overrides })
const summaries = [
  { id: 5, name: 'Sábado no centro', stops_count: 3 },
  { id: 6, name: 'Domingo no lago', stops_count: 1 },
]

beforeEach(() => {
  jest.clearAllMocks()
  queries.useCreateItinerary.mockReturnValue(idle())
  queries.useAddItineraryStop.mockReturnValue(idle())
  queries.useItineraries.mockReturnValue({ isPending: false, isError: false, data: { data: summaries }, refetch: jest.fn() })
})

const order = (view: Awaited<ReturnType<typeof render>>) =>
  view.getAllByRole(/^(link|button)$/).map((element) => element.props.accessibilityLabel)

// Audit A37: what a person already has comes first, a new one last.
describe('itinerary list', () => {
  it('lists the existing itineraries first and "Novo roteiro" last', async () => {
    const view = await render(<ItinerariesScreen />)

    expect(order(view)).toEqual(['Sábado no centro, 3 paradas', 'Domingo no lago, 1 parada', 'Novo roteiro'])
    expect(view.queryByLabelText('Nome do novo roteiro')).toBeNull()
  })

  it('opens the new itinerary after creating it', async () => {
    const mutate = jest.fn((_body, options) => options.onSuccess({ id: 8 }))
    queries.useCreateItinerary.mockReturnValue(idle({ mutate }))
    const view = await render(<ItinerariesScreen />)

    await fireEvent.press(view.getByRole('button', { name: 'Novo roteiro' }))
    await fireEvent.changeText(view.getByLabelText('Nome do novo roteiro'), ' Feriado ')
    await fireEvent.press(view.getByRole('button', { name: 'Criar roteiro' }))

    expect(mutate).toHaveBeenCalledWith({ name: 'Feriado' }, expect.any(Object))
    expect(mockRouter.push).toHaveBeenCalledWith('/roteiros/8')
  })

  // Audit A34: an empty list offers the way to fill it.
  it('offers to create the first itinerary', async () => {
    queries.useItineraries.mockReturnValue({ isPending: false, isError: false, data: { data: [] }, refetch: jest.fn() })
    const view = await render(<ItinerariesScreen />)

    expect(view.getByRole('header', { name: 'Nenhum roteiro ainda' })).toBeOnTheScreen()
    await fireEvent.press(view.getByRole('button', { name: 'Criar roteiro' }))
    expect(view.getByLabelText('Nome do novo roteiro')).toBeOnTheScreen()
  })
})

describe('adding a place to an itinerary', () => {
  it('offers the existing itineraries first and a new one last', async () => {
    const view = await render(<AddToItineraryScreen />)

    expect(order(view)).toEqual(['Adicionar a Sábado no centro', 'Adicionar a Domingo no lago', 'Novo roteiro'])
  })

  // Audit A25: the person came from a place and stays with it.
  it('confirms the addition and leads back to the place', async () => {
    const mutate = jest.fn((_variables, options) => options.onSuccess())
    queries.useAddItineraryStop.mockReturnValue(idle({ mutate }))
    const view = await render(<AddToItineraryScreen />)

    await fireEvent.press(view.getByRole('button', { name: 'Adicionar a Domingo no lago' }))
    expect(mutate).toHaveBeenCalledWith({ id: 6, establishmentId: 9 }, expect.any(Object))
    expect(mockRouter.replace).not.toHaveBeenCalled()
    expect(view.getByRole('header', { name: 'Adicionado a Domingo no lago' })).toBeOnTheScreen()

    await fireEvent.press(view.getByRole('button', { name: 'Voltar ao lugar' }))
    expect(mockRouter.back).toHaveBeenCalledTimes(1)
    await fireEvent.press(view.getByRole('button', { name: 'Ver roteiro' }))
    expect(mockRouter.replace).toHaveBeenCalledWith('/roteiros/6')
  })

  it('creates a new itinerary with the place in it', async () => {
    const add = jest.fn((_variables, options) => options.onSuccess())
    const create = jest.fn((_body, options) => options.onSuccess({ id: 8, name: 'Feriado' }))
    queries.useAddItineraryStop.mockReturnValue(idle({ mutate: add }))
    queries.useCreateItinerary.mockReturnValue(idle({ mutate: create }))
    const view = await render(<AddToItineraryScreen />)

    await fireEvent.press(view.getByRole('button', { name: 'Novo roteiro' }))
    await fireEvent.changeText(view.getByLabelText('Nome do novo roteiro'), 'Feriado')
    await fireEvent.press(view.getByRole('button', { name: 'Criar e adicionar' }))

    expect(add).toHaveBeenCalledWith({ id: 8, establishmentId: 9 }, expect.any(Object))
    expect(view.getByRole('header', { name: 'Adicionado a Feriado' })).toBeOnTheScreen()
  })
})

import { fireEvent, render, waitFor } from '@testing-library/react-native'

import ExploreScreen from '@/app/(tabs)/index'

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
}))
jest.mock('@/analytics/events', () => ({ track: jest.fn() }))
jest.mock('@/session/context', () => ({ useSession: jest.fn(() => { throw new Error('Discovery must not require a session') }) }))
jest.mock('@/api/purchases', () => ({
  listPurchaseEditions: jest.fn(() => { throw new Error('Payments unavailable') }),
  listPurchases: jest.fn(() => { throw new Error('Payments unavailable') }),
}))
jest.mock('@/catalog/city-store', () => ({
  useSelectedCity: () => 'londrina', selectCity: jest.fn(),
}))
jest.mock('@/catalog/queries', () => ({
  useCities: () => ({ data: [
    { slug: 'londrina', name: 'Londrina', state_code: 'PR', coordinates: { latitude: null, longitude: null } },
    { slug: 'cambe', name: 'Cambé', state_code: 'PR', coordinates: { latitude: null, longitude: null } },
  ] }),
  useCategories: () => ({ data: { categories: [{ slug: 'cafes', name: 'Cafés' }] } }),
  useFilters: () => ({ data: { attributes: [{ key: 'wifi', name: 'Wi-Fi' }] } }),
  useSearch: jest.fn(),
}))
jest.mock('@/components/establishment-map', () => ({
  EstablishmentMap: () => {
    const { Text } = jest.requireActual('react-native')
    return <Text>Mapa de resultados</Text>
  },
}))

const queries = jest.requireMock('@/catalog/queries') as { useSearch: jest.Mock }
const cityStore = jest.requireMock('@/catalog/city-store') as { selectCity: jest.Mock }

beforeEach(() => {
  jest.clearAllMocks()
  queries.useSearch.mockReturnValue({ data: { organic: [], meta: { total: 0 } } })
})

it('keeps all discovery filters when switching between list and map', async () => {
  const view = await render(<ExploreScreen />)
  await fireEvent.changeText(view.getByPlaceholderText('Buscar lugares'), 'café')
  await fireEvent.press(view.getByRole('button', { name: 'Aberto agora' }))
  await fireEvent.press(view.getByRole('button', { name: 'Cafés' }))
  await fireEvent.press(view.getByRole('button', { name: 'Wi-Fi' }))
  const expected = { q: 'café', category: 'cafes', openNow: true, attributes: ['wifi'] }
  await waitFor(() => expect(queries.useSearch).toHaveBeenLastCalledWith('londrina', expected))

  await fireEvent.press(view.getByRole('button', { name: 'Ver no mapa' }))
  expect(view.getByText('Mapa de resultados')).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Ver no mapa', selected: true })).toBeOnTheScreen()
  expect(queries.useSearch).toHaveBeenLastCalledWith('londrina', expected)

  await fireEvent.press(view.getByRole('button', { name: 'Ver em lista' }))
  expect(view.queryByText('Mapa de resultados')).toBeNull()
  expect(view.getByRole('button', { name: 'Wi-Fi', selected: true })).toBeOnTheScreen()
  expect(queries.useSearch).toHaveBeenLastCalledWith('londrina', expected)
})

it('keeps city selection separate from attribute and view controls', async () => {
  const view = await render(<ExploreScreen />)
  expect(view.getByText('Cidade')).toBeOnTheScreen()
  expect(view.getByText('Filtros')).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('button', { name: 'Cambé, PR' }))
  expect(cityStore.selectCity).toHaveBeenCalledWith('cambe')
  expect(view.getByRole('button', { name: 'Ver em lista', selected: true })).toBeOnTheScreen()
})

it('allows discovery without login or purchase checks even when payments are unavailable', async () => {
  const view = await render(<ExploreScreen />)
  expect(view.getByPlaceholderText('Buscar lugares')).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('button', { name: 'Ver no mapa' }))
  expect(view.getByText('Mapa de resultados')).toBeOnTheScreen()
  expect(view.queryByText(/comprar|pagamento|assinar|entre para explorar/i)).toBeNull()
  expect(jest.requireMock('@/session/context').useSession).not.toHaveBeenCalled()
  expect(jest.requireMock('@/api/purchases').listPurchaseEditions).not.toHaveBeenCalled()
  expect(jest.requireMock('@/api/purchases').listPurchases).not.toHaveBeenCalled()
})

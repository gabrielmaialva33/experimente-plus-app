import { fireEvent, render, waitFor, within } from '@testing-library/react-native'

import { StyleSheet } from 'react-native'
import { spacing } from '@/theme/tokens'

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
  useFilters: () => ({ data: { attributes: [{ key: 'wifi', name: 'Wi-Fi' }, { key: 'live_music', name: 'Música ao vivo' }] } }),
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

  await fireEvent.press(view.getByRole('radio', { name: 'Ver no mapa' }))
  expect(view.getByText('Mapa de resultados')).toBeOnTheScreen()
  expect(view.getByRole('radio', { name: 'Ver no mapa', selected: true })).toBeOnTheScreen()
  expect(queries.useSearch).toHaveBeenLastCalledWith('londrina', expected)

  await fireEvent.press(view.getByRole('radio', { name: 'Ver em lista' }))
  expect(view.queryByText('Mapa de resultados')).toBeNull()
  expect(view.getByRole('button', { name: 'Wi-Fi', selected: true })).toBeOnTheScreen()
  expect(queries.useSearch).toHaveBeenLastCalledWith('londrina', expected)
})

it('keeps city selection separate from attribute and view controls', async () => {
  const view = await render(<ExploreScreen />)
  expect(view.getByText('Cidade')).toBeOnTheScreen()
  expect(view.getByText('Filtros')).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('radio', { name: 'Cambé, PR' }))
  expect(cityStore.selectCity).toHaveBeenCalledWith('cambe')
  expect(view.getByRole('radio', { name: 'Ver em lista', selected: true })).toBeOnTheScreen()
})

it('allows discovery without login or purchase checks even when payments are unavailable', async () => {
  const view = await render(<ExploreScreen />)
  expect(view.getByPlaceholderText('Buscar lugares')).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('radio', { name: 'Ver no mapa' }))
  expect(view.getByText('Mapa de resultados')).toBeOnTheScreen()
  expect(view.queryByText(/comprar|pagamento|assinar|entre para explorar/i)).toBeNull()
  expect(jest.requireMock('@/session/context').useSession).not.toHaveBeenCalled()
  expect(jest.requireMock('@/api/purchases').listPurchaseEditions).not.toHaveBeenCalled()
  expect(jest.requireMock('@/api/purchases').listPurchases).not.toHaveBeenCalled()
})

it('uses the same full choice contour and marker for cities and list/map, without an active underline', async () => {
  const view = await render(<ExploreScreen />)
  const city = view.getByRole('radio', { name: 'Londrina, PR', checked: true })
  const mode = view.getByRole('radio', { name: 'Ver em lista', checked: true })
  for (const target of [city, mode]) {
    expect(target).toHaveStyle({ borderWidth: 2, minHeight: 40 })
    expect(target).not.toHaveStyle({ borderBottomWidth: 2 })
  }
  expect(view.getAllByText('✓', { includeHiddenElements: true })).toHaveLength(2)
  await fireEvent.press(view.getByRole('radio', { name: 'Ver no mapa' }))
  expect(view.getByRole('radio', { name: 'Ver no mapa', checked: true })).toBeOnTheScreen()
  expect(view.getByRole('radio', { name: 'Ver em lista', checked: false })).toBeOnTheScreen()
  expect(view.getAllByText('✓', { includeHiddenElements: true })).toHaveLength(2)
})


it('bounds every scrolling choice to its measured viewport, including after a narrow resize', async () => {
  const view = await render(<ExploreScreen />)
  for (const width of [768, 320, 240]) {
    for (const label of ['Cidade', 'Filtros']) {
      const row = view.getByTestId(`choice-row-${label}`)
      await fireEvent(row, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 56 } } })
      expect(row).toHaveStyle({ width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden' })
      const scroll = within(row).getByTestId(`choice-scroll-${label}`)
      expect(scroll.props.horizontal).toBe(true)
      expect(StyleSheet.flatten(scroll.props.style)).toMatchObject({ width: '100%', maxWidth: '100%', minWidth: 0, flexGrow: 0, flexShrink: 1, overflow: 'hidden' })
      const gutter = StyleSheet.flatten(scroll.props.contentContainerStyle).paddingHorizontal
      expect(gutter).toBe(spacing.lg)
      // Content must stay wider than the viewport and scroll, never wrap into a form.
      expect(within(row).getByRole(label === 'Cidade' ? 'radio' : 'button', { name: label === 'Cidade' ? 'Londrina, PR' : 'Música ao vivo' }).parent).toHaveStyle({ flexDirection: 'row', paddingVertical: 4 })
      const controls = within(row).getAllByRole(label === 'Cidade' ? 'radio' : 'button')
      for (const control of controls) {
        const { maxWidth } = StyleSheet.flatten(control.props.style)
        expect(typeof maxWidth).toBe('number')
        expect(maxWidth).toBeLessThanOrEqual(width - 2 * gutter)
        expect(maxWidth).toBeGreaterThanOrEqual(48)
      }
    }
  }
  const music = view.getByText('Música ao vivo')
  expect(music).toHaveStyle({ flexShrink: 1, minWidth: 0 })
  expect(music.props.numberOfLines).toBeUndefined()
  await fireEvent.press(view.getByRole('button', { name: 'Música ao vivo' }))
  expect(view.getByRole('button', { name: 'Música ao vivo', selected: true })).toBeOnTheScreen()
  expect(queries.useSearch).toHaveBeenLastCalledWith('londrina', expect.objectContaining({ attributes: ['live_music'] }))
})

it('fills both halves of the view selector and aligns it with the scrollable controls', async () => {
  const view = await render(<ExploreScreen />)
  const group = view.getByRole('radio', { name: 'Ver em lista' }).parent!
  expect(group).toHaveStyle({ width: '100%', minWidth: 0, flexDirection: 'row', paddingVertical: 4 })
  expect(group.parent).toHaveStyle({ width: '100%', paddingHorizontal: spacing.lg })
  for (const name of ['Ver em lista', 'Ver no mapa']) {
    expect(view.getByRole('radio', { name })).toHaveStyle({ flexBasis: 0, flexGrow: 1, minWidth: 0, maxWidth: '100%' })
  }
})

it('keeps city identity only in the selector beneath the existing screen chrome', async () => {
  const view = await render(<ExploreScreen />)
  expect(view.getAllByText('Londrina · PR')).toHaveLength(1)
  expect(within(view.getByTestId('choice-row-Cidade')).getByRole('radio', { name: 'Londrina, PR', checked: true })).toBeOnTheScreen()
})

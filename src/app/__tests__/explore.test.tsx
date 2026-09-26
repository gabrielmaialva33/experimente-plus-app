import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native'

import { FlatList, StyleSheet } from 'react-native'
import { minTouch, spacing } from '@/theme/tokens'

import ExploreScreen from '@/app/(tabs)/index'

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }), useFocusEffect: jest.fn() }))
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 0, left: 0 }),
}))
jest.mock('@/analytics/events', () => ({ track: jest.fn() }))
jest.mock('@/session/context', () => ({ useSession: jest.fn(() => { throw new Error('Discovery must not require a session') }) }))
// The assistant decides between the public and the personal route inside the API
// layer, at the moment of asking; the screen itself never touches the session.
jest.mock('@/api/concierge', () => ({ askAssistant: jest.fn() }))
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
  // The agenda is its own regression suite; here it only has to stay out of the
  // way of the filter, city and view assertions.
  useCityAgenda: () => ({ data: undefined, isPending: false }),
}))
// The one personal piece of Explorar reads the session itself and has its own
// suite; standing in for it keeps this suite's guarantee that nothing else here does.
jest.mock('@/explorer/for-you-row', () => ({
  ForYouRow: ({ citySlug }: { citySlug: string | null }) => {
    const { Text } = jest.requireActual('react-native')
    return <Text testID="for-you-slot">{citySlug}</Text>
  },
}))
jest.mock('@/components/establishment-map', () => ({
  EstablishmentMap: () => {
    const { Text } = jest.requireActual('react-native')
    return <Text>Mapa de resultados</Text>
  },
}))

const queries = jest.requireMock('@/catalog/queries') as { useSearch: jest.Mock }
const cityStore = jest.requireMock('@/catalog/city-store') as { selectCity: jest.Mock }

type Rendered = ReturnType<Awaited<ReturnType<typeof render>>['getByText']>

/** The nearest page-level scroll around a node; choice rows scroll sideways and do not count. */
function verticalScrollOf(node: Rendered) {
  let current: Rendered | null = node
  while (current && !(current.type === 'RCTScrollView' && !current.props.horizontal)) current = current.parent
  return current
}

const oneResult = { data: { organic: [{
  slug: 'cafe', name: 'Café da Praça', address: { district: 'Centro' },
  business_status: 'open', is_open_now: true,
}], meta: { total: 1 } } }

/** The city list folds into the button on the header band until someone asks for it. */
async function openCities(view: Awaited<ReturnType<typeof render>>) {
  await fireEvent.press(view.getByRole('button', { name: 'Cidade: Londrina. Trocar cidade' }))
}

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
  expect(view.getByText('Nada encontrado para “café” em Londrina com os filtros: Cafés, Aberto agora, Wi-Fi.')).toBeOnTheScreen()
  // The map offers the way back from the same place, and nothing else changes.
  expect(view.queryByRole('button', { name: 'Ver no mapa' })).toBeNull()
  expect(view.getByPlaceholderText('Buscar lugares')).toHaveDisplayValue('café')
  expect(queries.useSearch).toHaveBeenLastCalledWith('londrina', expected)

  await fireEvent.press(view.getByRole('button', { name: 'Ver em lista' }))
  expect(view.queryByText('Mapa de resultados')).toBeNull()
  expect(view.getByRole('button', { name: 'Wi-Fi', selected: true })).toBeOnTheScreen()
  expect(queries.useSearch).toHaveBeenLastCalledWith('londrina', expected)
})

it('keeps city selection separate from attribute and view controls', async () => {
  const view = await render(<ExploreScreen />)
  expect(view.queryByText('Cidade')).toBeNull()
  expect(view.getByTestId('choice-row-Filtros')).toBeOnTheScreen()
  await openCities(view)
  expect(view.getByText('Cidade')).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('radio', { name: 'Cambé, PR' }))
  expect(cityStore.selectCity).toHaveBeenCalledWith('cambe')
  // Choosing folds the list again and leaves the view where it was.
  expect(view.queryByRole('radio', { name: 'Cambé, PR' })).toBeNull()
  expect(view.getByRole('button', { name: 'Ver no mapa' })).toBeOnTheScreen()
})

it('allows discovery without login or purchase checks even when payments are unavailable', async () => {
  const view = await render(<ExploreScreen />)
  expect(view.getByPlaceholderText('Buscar lugares')).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('button', { name: 'Ver no mapa' }))
  expect(view.getByText('Ainda não há lugares publicados em Londrina.')).toBeOnTheScreen()
  expect(view.queryByText(/comprar|pagamento|assinar|entre para explorar/i)).toBeNull()
  expect(jest.requireMock('@/session/context').useSession).not.toHaveBeenCalled()
  expect(jest.requireMock('@/api/purchases').listPurchaseEditions).not.toHaveBeenCalled()
  expect(jest.requireMock('@/api/purchases').listPurchases).not.toHaveBeenCalled()
})

it('marks the chosen city with the full choice contour and marker, without an active underline', async () => {
  const view = await render(<ExploreScreen />)
  const button = view.getByRole('button', { name: 'Cidade: Londrina. Trocar cidade' })
  expect(button.props.accessibilityState).toMatchObject({ expanded: false })
  expect(button).toHaveStyle({ minHeight: minTouch })
  await openCities(view)
  expect(view.getByRole('button', { name: 'Cidade: Londrina. Trocar cidade' }).props.accessibilityState).toMatchObject({ expanded: true })
  const city = view.getByRole('radio', { name: 'Londrina, PR', checked: true })
  expect(city).toHaveStyle({ borderWidth: 2, minHeight: 48 })
  expect(city).not.toHaveStyle({ borderBottomWidth: 2 })
  expect(view.getByRole('radio', { name: 'Cambé, PR', checked: false })).toBeOnTheScreen()
  // One marker: the city. No filter is on, and the view switch is an action, not a choice.
  expect(view.getAllByText('✓', { includeHiddenElements: true })).toHaveLength(1)
})


it('bounds every scrolling choice to its measured viewport, including after a narrow resize', async () => {
  const view = await render(<ExploreScreen />)
  await openCities(view)
  for (const width of [768, 320, 240]) {
    for (const label of ['Cidade', 'Filtros']) {
      const row = view.getByTestId(`choice-row-${label}`)
      await fireEvent(row, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 56 } } })
      expect(row).toHaveStyle({ width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden' })
      const scroll = within(row).getByTestId(`choice-scroll-${label}`)
      expect(scroll.props.horizontal).toBe(true)
      expect(StyleSheet.flatten(scroll.props.style)).toMatchObject({ width: '100%', maxWidth: '100%', minWidth: 0, flexGrow: 0, flexShrink: 1, overflow: 'hidden' })
      const gutter = StyleSheet.flatten(scroll.props.contentContainerStyle).paddingHorizontal
      // Filters line up with the screen margin; cities with the panel they open in.
      expect(gutter).toBe(label === 'Cidade' ? spacing.lg : spacing.gutter)
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

it('offers the other view from the results header, with a 44-unit target', async () => {
  const view = await render(<ExploreScreen />)
  expect(view.getByRole('header', { name: 'Lugares em Londrina' })).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Ver no mapa' })).toHaveStyle({ minHeight: minTouch })
  await fireEvent.press(view.getByRole('button', { name: 'Ver no mapa' }))
  expect(view.getByRole('header', { name: 'Lugares em Londrina' })).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Ver em lista' })).toHaveStyle({ minHeight: minTouch })
})

it('names the city once, on the header band, and lists the cities only when asked', async () => {
  const view = await render(<ExploreScreen />)
  expect(view.getByRole('header', { name: 'O que você quer experimentar hoje?' })).toBeOnTheScreen()
  expect(view.getByText('Experimente+')).toBeOnTheScreen()
  expect(view.getAllByText('Londrina')).toHaveLength(1)
  expect(view.queryByText('Londrina · PR')).toBeNull()
  await openCities(view)
  expect(view.getAllByText('Londrina · PR')).toHaveLength(1)
  expect(within(view.getByTestId('choice-row-Cidade')).getByRole('radio', { name: 'Londrina, PR', checked: true })).toBeOnTheScreen()
})


it('shows a stable skeleton while the initial catalog is pending, without empty feedback', async () => {
  queries.useSearch.mockReturnValue({ isPending: true })
  const view = await render(<ExploreScreen />)
  expect(view.getByRole('progressbar', { name: 'Carregando lugares' }).props.accessibilityState).toEqual({ busy: true })
  expect(view.queryByText(/Ainda não há|Nada encontrado/)).toBeNull()
  queries.useSearch.mockReturnValue({ data: { organic: [], meta: { total: 0 } } })
  await view.rerender(<ExploreScreen />)
  expect(view.queryByRole('progressbar')).toBeNull()
  expect(view.getByText('Ainda não há lugares publicados em Londrina.')).toBeOnTheScreen()
})

it.each(['list', 'map'])('explains and clears a text-only empty search in %s without changing city or view', async (mode) => {
  jest.useFakeTimers()
  try {
    const view = await render(<ExploreScreen />)
    await fireEvent.changeText(view.getByPlaceholderText('Buscar lugares'), 'pizzaria')
    await act(async () => { jest.advanceTimersByTime(350) })
    if (mode === 'map') await fireEvent.press(view.getByRole('button', { name: 'Ver no mapa' }))
    expect(view.getByText('Nada encontrado para “pizzaria” em Londrina.')).toBeOnTheScreen()
    await fireEvent.press(view.getByRole('button', { name: 'Limpar filtros' }))
    expect(view.getByPlaceholderText('Buscar lugares')).toHaveDisplayValue('')
    expect(queries.useSearch).toHaveBeenLastCalledWith('londrina', { q: undefined, category: undefined, openNow: false, attributes: [] })
    await act(async () => { jest.advanceTimersByTime(350) })
    expect(queries.useSearch).toHaveBeenLastCalledWith('londrina', { q: undefined, category: undefined, openNow: false, attributes: [] })
    expect(view.getByRole('button', { name: mode === 'map' ? 'Ver em lista' : 'Ver no mapa' })).toBeOnTheScreen()
    expect(cityStore.selectCity).not.toHaveBeenCalled()
  } finally { jest.useRealTimers() }
})

it('refreshes the results on a pull', async () => {
  const refetch = jest.fn(() => Promise.resolve())
  queries.useSearch.mockReturnValue({ data: { organic: [], meta: { total: 0 } }, refetch })
  const view = await render(<ExploreScreen />)
  const scroll = verticalScrollOf(view.getByText('Ainda não há lugares publicados em Londrina.'))
  await act(async () => scroll?.props.refreshControl.props.onRefresh())
  expect(refetch).toHaveBeenCalledTimes(1)
})

it('names active category and attribute filters and clears them together', async () => {
  const view = await render(<ExploreScreen />)
  await fireEvent.press(view.getByRole('button', { name: 'Cafés' }))
  await fireEvent.press(view.getByRole('button', { name: 'Aberto agora' }))
  await fireEvent.press(view.getByRole('button', { name: 'Wi-Fi' }))
  expect(view.getByText('Nada encontrado em Londrina com os filtros: Cafés, Aberto agora, Wi-Fi.')).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('button', { name: 'Limpar filtros' }))
  expect(queries.useSearch).toHaveBeenLastCalledWith('londrina', { q: undefined, category: undefined, openNow: false, attributes: [] })
  expect(view.queryByRole('button', { name: 'Limpar filtros' })).toBeNull()
})


it('still renders results in both views when the catalog is not empty', async () => {
  queries.useSearch.mockReturnValue(oneResult)
  const view = await render(<ExploreScreen />)
  expect(view.getByText('Café da Praça')).toBeOnTheScreen()
  expect(view.getByText('1 lugar')).toBeOnTheScreen()
  expect(view.queryByText(/Ainda não há|Nada encontrado/)).toBeNull()
  await fireEvent.press(view.getByRole('button', { name: 'Ver no mapa' }))
  expect(view.getByText('Mapa de resultados')).toBeOnTheScreen()
  expect(view.queryByText(/Ainda não há|Nada encontrado/)).toBeNull()
})


it('keeps long empty feedback scrollable so clear filters remains reachable', async () => {
  const view = await render(<ExploreScreen />)
  await fireEvent.press(view.getByRole('button', { name: 'Cafés' }))
  for (const mode of ['list', 'map']) {
    if (mode === 'map') await fireEvent.press(view.getByRole('button', { name: 'Ver no mapa' }))
    const empty = view.getByTestId('catalog-empty')
    const scroll = verticalScrollOf(empty)
    expect(within(empty).getByRole('button', { name: 'Limpar filtros' })).toBeOnTheScreen()
    expect(scroll?.props.keyboardShouldPersistTaps).toBe('handled')
    expect(scroll?.props.scrollEnabled).not.toBe(false)
  }
})


it('scrolls the band, the filters, the results and the Concierge together so the list stays reachable on a phone', async () => {
  queries.useSearch.mockReturnValue(oneResult)
  const view = await render(<ExploreScreen />)
  const feed = verticalScrollOf(view.getByText('Café da Praça'))
  expect(feed).not.toBeNull()
  expect(verticalScrollOf(view.getByPlaceholderText('Buscar lugares'))).toBe(feed)
  expect(verticalScrollOf(view.getByTestId('choice-row-Filtros'))).toBe(feed)
  expect(verticalScrollOf(view.getByRole('button', { name: 'Ver no mapa' }))).toBe(feed)
  // The Concierge waits folded as a card and opens where it is.
  expect(view.queryByLabelText('Pergunta para o Concierge')).toBeNull()
  await fireEvent.press(view.getByRole('button', { name: 'Perguntar ao Concierge' }))
  expect(verticalScrollOf(view.getByLabelText('Pergunta para o Concierge'))).toBe(feed)
})


it('keeps a slot for the personal row after the places, in list mode only', async () => {
  const view = await render(<ExploreScreen />)
  expect(view.getByTestId('for-you-slot')).toHaveTextContent('londrina')

  await fireEvent.press(view.getByRole('button', { name: 'Ver no mapa' }))
  expect(view.queryByTestId('for-you-slot')).toBeNull()
})

it('answers a search with its count under the controls, alone and from the top', async () => {
  jest.useFakeTimers()
  const scrollToOffset = jest.spyOn(FlatList.prototype, 'scrollToOffset')
  try {
    queries.useSearch.mockReturnValue(oneResult)
    const view = await render(<ExploreScreen />)
    expect(view.getByRole('header', { name: 'Lugares em Londrina' })).toBeOnTheScreen()
    expect(view.getByTestId('for-you-slot')).toBeOnTheScreen()
    expect(view.getByRole('button', { name: 'Perguntar ao Concierge' })).toBeOnTheScreen()
    expect(scrollToOffset).not.toHaveBeenCalled()

    await fireEvent.changeText(view.getByPlaceholderText('Buscar lugares'), 'café')
    await act(async () => { jest.advanceTimersByTime(350) })
    expect(view.getByRole('header', { name: '1 resultado em Londrina' })).toBeOnTheScreen()
    expect(view.getByText('“café”')).toBeOnTheScreen()
    expect(view.queryByTestId('for-you-slot')).toBeNull()
    expect(view.queryByRole('button', { name: 'Perguntar ao Concierge' })).toBeNull()
    expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: 0, animated: true })

    await fireEvent.press(view.getByRole('button', { name: 'Aberto agora' }))
    expect(view.getByText('“café” · Aberto agora')).toBeOnTheScreen()
    expect(scrollToOffset).toHaveBeenCalledTimes(2)

    // Clearing the field and the chip is the way back to browsing.
    await fireEvent.press(view.getByRole('button', { name: 'Limpar busca' }))
    await fireEvent.press(view.getByRole('button', { name: 'Aberto agora' }))
    await act(async () => { jest.advanceTimersByTime(350) })
    expect(view.getByRole('header', { name: 'Lugares em Londrina' })).toBeOnTheScreen()
    expect(view.getByTestId('for-you-slot')).toBeOnTheScreen()
  } finally {
    scrollToOffset.mockRestore()
    jest.useRealTimers()
  }
})

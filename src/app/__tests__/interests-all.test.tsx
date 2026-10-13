import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render } from '@testing-library/react-native'
import { AccessibilityInfo } from 'react-native'

import InterestsScreen from '@/app/conta/interesses'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('@/catalog/city-store', () => ({ useSelectedCity: () => 'londrina' }))
jest.mock('@/catalog/queries', () => ({
  useCategories: () => ({ isPending: false, data: { categories: mockCategories } }),
}))
jest.mock('@/api/explorer', () => ({ listInterests: jest.fn(), replaceInterests: jest.fn() }))
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: jest.fn(), push: jest.fn() }) }))

let mockCategories = [
  { slug: 'cafes', name: 'Cafés' },
  { slug: 'bares', name: 'Bares' },
  { slug: 'museus', name: 'Museus' },
]

const api = jest.requireMock('@/api/explorer') as {
  listInterests: jest.Mock
  replaceInterests: jest.Mock
}
const chosen = (slug: string, name: string, isActive = true) => ({
  id: slug.length,
  category: { slug, name, is_active: isActive },
  created_at: '2026-10-01T12:00:00.000Z',
})
let client: QueryClient

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {})
  mockCategories = [
    { slug: 'cafes', name: 'Cafés' },
    { slug: 'bares', name: 'Bares' },
    { slug: 'museus', name: 'Museus' },
  ]
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  })
})

afterEach(() => client.clear())

const screen = () =>
  render(
    <QueryClientProvider client={client}>
      <InterestsScreen />
    </QueryClientProvider>
  )

const state = (view: Awaited<ReturnType<typeof screen>>, testID: string) =>
  view.getByTestId(testID).props.accessibilityState

it('marks every category with one checkbox, mixed while only some are marked', async () => {
  api.listInterests.mockResolvedValue({ data: [chosen('cafes', 'Cafés')] })
  api.replaceInterests.mockImplementation(async (slugs: string[]) => ({
    data: slugs.map((slug) => chosen(slug, slug)),
  }))
  const view = await screen()

  const all = await view.findByRole('checkbox', { name: 'Marcar todos' })
  expect(all.props.accessibilityState).toMatchObject({ checked: 'mixed' })
  expect(view.getByText('1 de 3 marcados')).toBeOnTheScreen()

  await fireEvent.press(all)

  for (const slug of ['cafes', 'bares', 'museus']) {
    expect(state(view, `interest-${slug}`)).toMatchObject({ checked: true })
  }
  const none = view.getByRole('checkbox', { name: 'Desmarcar todos' })
  expect(none.props.accessibilityState).toMatchObject({ checked: true })
  expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
    'Todos os interesses marcados. Toque em Salvar interesses para guardar.'
  )

  // Marking is a change to the form; saving is still the one button, with the whole set.
  expect(api.replaceInterests).not.toHaveBeenCalled()
  await fireEvent.press(view.getByTestId('save-interests'))
  expect(await view.findByText('Interesses salvos.')).toBeOnTheScreen()
  expect([...api.replaceInterests.mock.calls[0][0]].sort()).toEqual(['bares', 'cafes', 'museus'])
})

it('clears every mark, a retired interest included, once all are marked', async () => {
  api.listInterests.mockResolvedValue({
    data: [
      chosen('cafes', 'Cafés'),
      chosen('bares', 'Bares'),
      chosen('museus', 'Museus'),
      chosen('cinemas', 'Cinemas', false),
    ],
  })
  const view = await screen()

  const all = await view.findByRole('checkbox', { name: 'Desmarcar todos' })
  expect(all.props.accessibilityState).toMatchObject({ checked: true })

  await fireEvent.press(all)

  for (const slug of ['cafes', 'bares', 'museus', 'cinemas']) {
    expect(state(view, `interest-${slug}`)).toMatchObject({ checked: false })
  }
  expect(state(view, 'interests-all')).toMatchObject({ checked: false })
  expect(view.getByText('0 de 3 marcados')).toBeOnTheScreen()
  expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
    'Todos os interesses desmarcados.'
  )
})

it('starts unchecked and never adds back a retired interest', async () => {
  api.listInterests.mockResolvedValue({ data: [] })
  const view = await screen()

  const all = await view.findByRole('checkbox', { name: 'Marcar todos' })
  expect(all.props.accessibilityState).toMatchObject({ checked: false })
  await fireEvent.press(all)
  expect(view.queryByTestId('interest-cinemas')).toBeNull()
  expect(view.getByText('3 de 3 marcados')).toBeOnTheScreen()
})

it('offers no "Todos" for a single category', async () => {
  mockCategories = [{ slug: 'cafes', name: 'Cafés' }]
  api.listInterests.mockResolvedValue({ data: [] })
  const view = await screen()

  expect(await view.findByTestId('interest-cafes')).toBeOnTheScreen()
  expect(view.queryByTestId('interests-all')).toBeNull()
})

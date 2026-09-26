import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render } from '@testing-library/react-native'

import InterestsScreen from '@/app/conta/interesses'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({ useColors: () => jest.requireActual('@/theme/tokens').palette.light }))
jest.mock('@/catalog/city-store', () => ({ useSelectedCity: () => 'londrina' }))
jest.mock('@/catalog/queries', () => ({
  useCategories: () => ({ isPending: false, data: { categories: [{ slug: 'cafes', name: 'Cafés' }] } }),
}))
jest.mock('@/api/explorer', () => ({ listInterests: jest.fn(), replaceInterests: jest.fn() }))

const api = jest.requireMock('@/api/explorer') as { listInterests: jest.Mock; replaceInterests: jest.Mock }
const cafes = { category: { slug: 'cafes', name: 'Cafés' } }
let client: QueryClient

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
})

// Also after a failure: a live cache keeps its timers and jest from exiting.
afterEach(() => client.clear())

it('confirms the save after the screen starts over from the saved set', async () => {
  api.listInterests.mockResolvedValue({ data: [] })
  api.replaceInterests.mockResolvedValue({ data: [cafes] })
  const view = await render(
    <QueryClientProvider client={client}>
      <InterestsScreen />
    </QueryClientProvider>
  )

  expect(await view.findByText('Marque o que você gosta de explorar. Usamos seus interesses no Para você, em Explorar.')).toBeOnTheScreen()
  await fireEvent.press(view.getByTestId('interest-cafes'))
  await fireEvent.press(view.getByTestId('save-interests'))

  expect(await view.findByText('Interesses salvos.')).toBeOnTheScreen()
  expect(api.replaceInterests).toHaveBeenCalledWith(['cafes'])
  expect(view.getByTestId('interest-cafes').props.accessibilityState).toMatchObject({ checked: true })
})

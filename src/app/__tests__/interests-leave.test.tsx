import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native'
import { Stack, router } from 'expo-router'
import { renderRouter } from 'expo-router/testing-library'
import { Text } from 'react-native'

import InterestsScreen from '@/app/conta/interesses'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('@/catalog/city-store', () => ({ useSelectedCity: () => 'londrina' }))
jest.mock('@/catalog/queries', () => ({
  useCategories: () => ({
    isPending: false,
    data: {
      categories: [
        { slug: 'cafes', name: 'Cafés' },
        { slug: 'bares', name: 'Bares' },
      ],
    },
  }),
}))
jest.mock('@/api/explorer', () => ({ listInterests: jest.fn(), replaceInterests: jest.fn() }))

const api = jest.requireMock('@/api/explorer') as {
  listInterests: jest.Mock
  replaceInterests: jest.Mock
}
const cafes = { category: { slug: 'cafes', name: 'Cafés' } }
let client: QueryClient

beforeEach(() => {
  jest.clearAllMocks()
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  })
  api.listInterests.mockResolvedValue({ data: [] })
})

afterEach(() => {
  client.clear()
  jest.useRealTimers()
})

/** Conta, with Interesses pushed on top of it, as the account opens it. */
async function openInterests() {
  await renderRouter(
    {
      '_layout': () => (
        <QueryClientProvider client={client}>
          <Stack />
        </QueryClientProvider>
      ),
      'index': () => <Text>Conta</Text>,
      'conta/interesses': InterestsScreen,
    },
    { initialUrl: '/' }
  )
  await act(async () => router.push('/conta/interesses'))
  await waitFor(() => expect(screen.getByTestId('interest-cafes')).toBeOnTheScreen())
}

const back = () => act(async () => router.back())
const sheet = () => within(screen.getByTestId('leave-interests'))

it('leaves at once when nothing changed', async () => {
  await openInterests()

  await back()

  expect(screen.getByText('Conta')).toBeOnTheScreen()
  expect(router.canGoBack()).toBe(false)
  expect(screen.queryByTestId('leave-interests')).toBeNull()
})

it('asks before leaving unsaved interests, and stays to keep editing', async () => {
  await openInterests()
  await fireEvent.press(screen.getByTestId('interest-cafes'))

  await back()

  // Still on the form, with the question over it.
  expect(router.canGoBack()).toBe(true)
  expect(sheet().getByRole('header', { name: 'Salvar seus interesses?' })).toBeOnTheScreen()
  expect(
    sheet().getByText('Você mudou os interesses marcados e ainda não salvou.')
  ).toBeOnTheScreen()
  expect(
    sheet()
      .getAllByRole('button')
      .map((button) => button.props.accessibilityLabel)
  ).toEqual(['Salvar', 'Descartar', 'Continuar editando'])

  await fireEvent.press(sheet().getByRole('button', { name: 'Continuar editando' }))

  expect(screen.queryByTestId('leave-interests')).toBeNull()
  expect(screen.queryByText('Conta')).toBeNull()
  expect(screen.getByTestId('interest-cafes').props.accessibilityState).toMatchObject({
    checked: true,
  })
  expect(api.replaceInterests).not.toHaveBeenCalled()
})

it('leaves the changes behind when asked to discard them', async () => {
  await openInterests()
  await fireEvent.press(screen.getByTestId('interest-cafes'))
  await back()

  await fireEvent.press(sheet().getByRole('button', { name: 'Descartar' }))

  await waitFor(() => expect(screen.getByText('Conta')).toBeOnTheScreen())
  expect(router.canGoBack()).toBe(false)
  expect(api.replaceInterests).not.toHaveBeenCalled()
})

it('saves, waits for the server, and then leaves', async () => {
  let answer: (value: unknown) => void = () => {}
  api.replaceInterests.mockReturnValue(new Promise((resolve) => (answer = resolve)))
  await openInterests()
  await fireEvent.press(screen.getByTestId('interest-cafes'))
  await back()

  await fireEvent.press(sheet().getByRole('button', { name: 'Salvar' }))

  // Not before the server took it: the sheet waits, its answers unavailable.
  expect(api.replaceInterests).toHaveBeenCalledWith(['cafes'])
  expect(sheet().getByText('Salvando…')).toBeOnTheScreen()
  expect(sheet().getByRole('button', { name: 'Descartar' }).props.accessibilityState).toMatchObject(
    { disabled: true }
  )
  expect(router.canGoBack()).toBe(true)

  await act(async () => answer({ data: [cafes] }))

  await waitFor(() => expect(screen.getByText('Conta')).toBeOnTheScreen())
  expect(router.canGoBack()).toBe(false)
})

it('stays and says so when saving fails, and can still leave the changes', async () => {
  api.replaceInterests.mockRejectedValue(new Error('offline'))
  await openInterests()
  await fireEvent.press(screen.getByTestId('interest-cafes'))
  await back()

  await fireEvent.press(sheet().getByRole('button', { name: 'Salvar' }))

  await waitFor(() =>
    expect(sheet().getByRole('alert')).toHaveTextContent('Não foi possível salvar agora.')
  )
  expect(screen.queryByText('Conta')).toBeNull()
  expect(sheet().getByRole('button', { name: 'Salvar' }).props.accessibilityState).toMatchObject({
    disabled: false,
  })

  // The guard is back: leaving again still asks, and discarding goes.
  await fireEvent.press(sheet().getByRole('button', { name: 'Continuar editando' }))
  await back()
  await fireEvent.press(sheet().getByRole('button', { name: 'Descartar' }))
  await waitFor(() => expect(screen.getByText('Conta')).toBeOnTheScreen())
})

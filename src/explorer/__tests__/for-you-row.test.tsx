import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native'
import type { ReactNode } from 'react'

import type { ForYou } from '@/api/explorer'
import type { EstablishmentSummary } from '@/catalog/types'
import { ForYouRow } from '@/explorer/for-you-row'
import { useReplaceInterests } from '@/explorer/queries'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@/session/context', () => ({ useSession: jest.fn() }))
jest.mock('@/api/explorer', () => ({ listForYou: jest.fn(), replaceInterests: jest.fn() }))
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))

const session = jest.requireMock('@/session/context') as { useSession: jest.Mock }
const api = jest.requireMock('@/api/explorer') as {
  listForYou: jest.Mock
  replaceInterests: jest.Mock
}

const signedIn = (userId = 7, operationId = 1) => ({
  status: 'authenticated',
  context: { user: { id: userId }, active_operation: { id: operationId } },
})

// The list's own fixtures carry no cover; the card falls back like the search list does.
const place = (slug: string, name: string) =>
  ({
    slug,
    name,
    short_description: null,
    city: { slug: 'londrina', name: 'Londrina', state_code: 'PR' },
    address: { district: 'Centro', latitude: null, longitude: null },
    business_status: 'open',
    is_open_now: true,
    primary_category: null,
    categories: [],
    is_sponsored: false,
    reviews: { count: 0, average: null },
  }) as unknown as EstablishmentSummary

const row = (data: EstablishmentSummary[], hasInterests = true): ForYou => ({
  data,
  has_interests: hasInterests,
})

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

function wrapper(client: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

const renderRow = (client = newClient()) =>
  render(<ForYouRow citySlug="londrina" />, { wrapper: wrapper(client) })

beforeEach(() => {
  jest.clearAllMocks()
  session.useSession.mockReturnValue(signedIn())
})

it.each(['anonymous', 'loading', 'unavailable'])(
  'stays out of the way and asks nothing while the session is %s',
  async (status) => {
    session.useSession.mockReturnValue({ status, context: null })
    const view = await renderRow()

    expect(view.queryByTestId('for-you')).toBeNull()
    expect(api.listForYou).not.toHaveBeenCalled()
  }
)

it('draws nothing while the row loads, rather than a placeholder that then vanishes', async () => {
  api.listForYou.mockReturnValue(new Promise(() => {}))
  const view = await renderRow()

  expect(api.listForYou).toHaveBeenCalledWith('londrina')
  expect(view.queryByTestId('for-you')).toBeNull()
})

it('draws nothing when the row fails, leaving the catalogue alone', async () => {
  api.listForYou.mockRejectedValue(new Error('offline'))
  const view = await renderRow()

  await waitFor(() => expect(api.listForYou).toHaveBeenCalled())
  await act(async () => {})
  expect(view.queryByTestId('for-you')).toBeNull()
})

it('invites a person who chose nothing to pick interests', async () => {
  api.listForYou.mockResolvedValue(row([], false))
  const view = await renderRow()

  const invite = await view.findByRole('button', {
    name: 'Escolher interesses para ver lugares para você',
  })
  await fireEvent.press(invite)
  expect(mockPush).toHaveBeenCalledWith('/conta/interesses')
  expect(view.queryByText('Para você')).toBeNull()
})

it('draws nothing when the chosen interests have nothing in this city', async () => {
  api.listForYou.mockResolvedValue(row([]))
  const view = await renderRow()

  await waitFor(() => expect(api.listForYou).toHaveBeenCalled())
  await act(async () => {})
  expect(view.queryByTestId('for-you')).toBeNull()
})

it('shows the chosen places, says how they are ordered, and opens each one', async () => {
  api.listForYou.mockResolvedValue(row([place('alfa', 'Alfa Café'), place('beta', 'Beta Bar')]))
  const view = await renderRow()

  expect(await view.findByRole('header', { name: 'Para você' })).toBeOnTheScreen()
  expect(view.getByText('Pelos seus interesses, em ordem alfabética')).toBeOnTheScreen()
  expect(view.getByText('Alfa Café')).toBeOnTheScreen()

  await fireEvent.press(view.getByText('Beta Bar'))
  expect(mockPush).toHaveBeenCalledWith('/estabelecimento/londrina/beta')
})

it('never shows one account’s row to the next account on the same device', async () => {
  const client = newClient()
  api.listForYou.mockResolvedValueOnce(row([place('alfa', 'Café da Ana')]))
  const first = await renderRow(client)
  expect(await first.findByText('Café da Ana')).toBeOnTheScreen()
  await first.unmount()

  // The cache outlives the sign-out. Another person signs in on this device.
  session.useSession.mockReturnValue(signedIn(8))
  api.listForYou.mockReturnValueOnce(new Promise(() => {}))
  const second = await renderRow(client)

  expect(second.queryByText('Café da Ana')).toBeNull()
  expect(api.listForYou).toHaveBeenCalledTimes(2)
})

it('asks again once the interests are saved', async () => {
  const client = newClient()
  api.listForYou.mockResolvedValue(row([place('alfa', 'Alfa Café')]))
  api.replaceInterests.mockResolvedValue({ data: [] })
  const view = await renderRow(client)
  expect(await view.findByText('Alfa Café')).toBeOnTheScreen()
  expect(api.listForYou).toHaveBeenCalledTimes(1)

  const { result } = await renderHook(() => useReplaceInterests(), { wrapper: wrapper(client) })
  await act(async () => {
    await result.current.mutateAsync(['cafes'])
  })

  await waitFor(() => expect(api.listForYou).toHaveBeenCalledTimes(2))
})

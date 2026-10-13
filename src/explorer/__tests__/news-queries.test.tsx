import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { ReactNode } from 'react'

import {
  explorerKeys,
  useAddItineraryStop,
  useFollowingUpdates,
  useItinerarySuggestions,
  useToggleSaved,
} from '@/explorer/queries'

jest.mock('@/api/explorer', () => ({
  listFollowingUpdates: jest.fn(),
  listItinerarySuggestions: jest.fn(),
  addItineraryStop: jest.fn(),
  saveEstablishment: jest.fn(),
  unsaveEstablishment: jest.fn(),
}))

const api = jest.requireMock('@/api/explorer') as Record<string, jest.Mock>

const newClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  })

function wrapper(client: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

const page = (current: number, last: number) => ({
  data: [],
  has_follows: true,
  meta: { total: last * 10, per_page: 10, current_page: current, last_page: last },
})

beforeAll(() => notifyManager.setScheduler((notify) => notify()))
afterAll(() => notifyManager.setScheduler((notify) => setTimeout(notify, 0)))
beforeEach(() => jest.clearAllMocks())

describe('useFollowingUpdates', () => {
  it('asks nothing for a visitor', async () => {
    const client = newClient()
    await renderHook(() => useFollowingUpdates(null), { wrapper: wrapper(client) })

    expect(api.listFollowingUpdates).not.toHaveBeenCalled()
  })

  it('pages until the server says it was the last page', async () => {
    api.listFollowingUpdates.mockImplementation(async (current: number) => page(current, 2))
    const client = newClient()
    const { result } = await renderHook(() => useFollowingUpdates({ operationId: 1, userId: 7 }), {
      wrapper: wrapper(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.listFollowingUpdates).toHaveBeenCalledWith(1, 10)
    expect(result.current.hasNextPage).toBe(true)

    await act(async () => {
      await result.current.fetchNextPage()
    })
    expect(api.listFollowingUpdates).toHaveBeenLastCalledWith(2, 10)
    expect(result.current.hasNextPage).toBe(false)
  })

  it('is asked again once a place is followed or unfollowed', async () => {
    api.listFollowingUpdates.mockResolvedValue(page(1, 1))
    api.saveEstablishment.mockResolvedValue({ favorited: false, following: true })
    const client = newClient()
    const { result } = await renderHook(
      () => ({
        updates: useFollowingUpdates({ operationId: 1, userId: 7 }),
        follow: useToggleSaved('follows', 9),
      }),
      { wrapper: wrapper(client) }
    )
    await waitFor(() => expect(result.current.updates.isSuccess).toBe(true))
    expect(api.listFollowingUpdates).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.follow.mutateAsync(true)
    })
    await waitFor(() => expect(api.listFollowingUpdates).toHaveBeenCalledTimes(2))
  })
})

describe('useItinerarySuggestions', () => {
  it('asks for the itinerary and the city, and again once the route changes', async () => {
    api.listItinerarySuggestions.mockResolvedValue({ basis: 'popular', data: [] })
    api.addItineraryStop.mockResolvedValue({ id: 5, name: 'Sábado', stops: [] })
    const client = newClient()
    const { result } = await renderHook(
      () => ({ suggestions: useItinerarySuggestions(5, 'londrina'), add: useAddItineraryStop() }),
      { wrapper: wrapper(client) }
    )

    await waitFor(() => expect(result.current.suggestions.isSuccess).toBe(true))
    expect(api.listItinerarySuggestions).toHaveBeenCalledWith(5, 'londrina')
    expect(client.getQueryData(explorerKeys.suggestions(5, 'londrina'))).toEqual({
      basis: 'popular',
      data: [],
    })

    await act(async () => {
      await result.current.add.mutateAsync({ id: 5, establishmentId: 9 })
    })
    await waitFor(() => expect(api.listItinerarySuggestions).toHaveBeenCalledTimes(2))
  })
})

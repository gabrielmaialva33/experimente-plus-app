import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { AccessibilityInfo } from 'react-native'

import { explorerKeys, useToggleSaved, useToggleSavedContent } from '@/explorer/queries'

jest.mock('@/api/explorer', () => ({
  saveEstablishment: jest.fn(),
  unsaveEstablishment: jest.fn(),
  saveContent: jest.fn(),
  unsaveContent: jest.fn(),
}))

const api = jest.requireMock('@/api/explorer') as Record<string, jest.Mock>

let client: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
)

// The query layer tells its observers on a timer by default, after `act` has
// returned; telling them at once keeps every update of these hooks inside it.
beforeAll(() => notifyManager.setScheduler((notify) => notify()))
afterAll(() => notifyManager.setScheduler((notify) => setTimeout(notify, 0)))

// No garbage-collection timers: one left behind keeps jest from exiting.
beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {})
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  })
})
afterEach(() => client.clear())

const refused = () => Promise.reject(new Error('refused'))

describe('a follow or favourite the server refuses', () => {
  it('rolls the bell back and says the follow did not go through', async () => {
    api.saveEstablishment.mockImplementation(refused)
    client.setQueryData(explorerKeys.status(7), { favorited: true, following: false })
    const { result } = await renderHook(() => useToggleSaved('follows', 7), { wrapper })

    await act(async () => {
      await result.current.mutateAsync(true).catch(() => {})
    })

    expect(client.getQueryData(explorerKeys.status(7))).toEqual({
      favorited: true,
      following: false,
    })
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Não foi possível seguir o lugar agora.'
    )
  })

  it('is said even once the button that asked is gone, as an undone removal is', async () => {
    api.saveEstablishment.mockImplementation(refused)
    const { result, unmount } = await renderHook(() => useToggleSaved('favorites', 7), {
      wrapper,
    })

    let pending: Promise<unknown> = Promise.resolve()
    await act(async () => {
      pending = result.current.mutateAsync(true).catch(() => {})
    })
    await unmount()
    await act(async () => {
      await pending
    })

    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Não foi possível favoritar agora.'
    )
  })

  it('says a refused removal of a favourite experience', async () => {
    api.unsaveContent.mockImplementation(refused)
    const { result } = await renderHook(() => useToggleSavedContent(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ kind: 'experiences', id: 31, save: false }).catch(() => {})
    })

    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Não foi possível remover dos favoritos agora.'
    )
  })

  it('says nothing when the server agrees', async () => {
    api.unsaveEstablishment.mockResolvedValue({ favorited: false, following: false })
    const { result } = await renderHook(() => useToggleSaved('favorites', 7), { wrapper })

    await act(async () => {
      await result.current.mutateAsync(false)
    })

    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled()
  })
})

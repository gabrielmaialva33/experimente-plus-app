import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react-native'
import type { ReactNode } from 'react'

import type { SearchParams } from '@/api/catalog'
import { useSearch } from '@/catalog/queries'

jest.mock('@/api/catalog', () => ({
  searchEstablishments: jest.fn(async () => ({
    organic_results: [],
    sponsored_results: [],
    meta: { total: 0 },
  })),
}))

const origin = { latitude: -23.3105, longitude: -51.1628 }

async function searchAndLeave(client: QueryClient, params: SearchParams) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = await renderHook(() => useSearch('londrina', params), { wrapper })
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
  await hook.unmount()
}

const cachedKeys = (client: QueryClient) =>
  client
    .getQueryCache()
    .findAll({ queryKey: ['catalog', 'search'] })
    .map((query) => query.queryKey)

it('forgets a search from somewhere as soon as nothing shows it', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  await searchAndLeave(client, { sort: 'distance', origin })
  await searchAndLeave(client, { sort: 'rating' })

  // The position left memory with its search; the other search waits for the usual collection.
  await waitFor(() =>
    expect(cachedKeys(client)).toEqual([['catalog', 'search', 'londrina', { sort: 'rating' }]])
  )
  client.clear()
})

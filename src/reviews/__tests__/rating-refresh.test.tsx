import {
  notifyManager,
  QueryClient,
  QueryClientProvider,
  type QueryKey,
} from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react-native'
import type { ReactNode } from 'react'

import { catalogKeys } from '@/catalog/queries'
import {
  useAddReviewPhoto,
  useCreateReview,
  useCreateReviewWithPhotos,
  useDeleteReview,
  useRemoveReviewPhoto,
  useUpdateReview,
} from '@/reviews/queries'

jest.mock('@/api/catalog', () => ({}))
jest.mock('@/api/agenda', () => ({}))
jest.mock('@/reviews/anonymous-token', () => ({ anonymousReportToken: () => 'token' }))
jest.mock('@/api/reviews', () => ({
  createReview: jest.fn(async () => ({ id: 9 })),
  updateReview: jest.fn(async () => ({ id: 9 })),
  deleteReview: jest.fn(async () => null),
  uploadReviewPhoto: jest.fn(async () => ({ id: 1 })),
  deleteReviewPhoto: jest.fn(async () => null),
}))

const PLACE_PAGE = catalogKeys.establishment('londrina', 'cafe')
const SEARCH = catalogKeys.search('londrina', { q: 'café' })
const OTHER_CITY_SEARCH = catalogKeys.search('maringa', {})
const CITIES = catalogKeys.cities
const AGENDA = catalogKeys.agenda('londrina')
const MY_REVIEWS = ['reviews', 'mine', {}]

// The query layer tells its observers on a timer by default, after `act` has
// returned; telling them at once keeps every update of these hooks inside it.
beforeAll(() => notifyManager.setScheduler((notify) => notify()))
afterAll(() => notifyManager.setScheduler((notify) => setTimeout(notify, 0)))

const clients: QueryClient[] = []
afterEach(() => clients.splice(0).forEach((client) => client.clear()))

/** A cache holding a place page, searches and what carries no rating, all fresh. */
function seededClient() {
  // No collection timers: seeded entries have no observer, and a pending one keeps Jest alive.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  clients.push(client)
  for (const key of [PLACE_PAGE, SEARCH, OTHER_CITY_SEARCH, CITIES, AGENDA, MY_REVIEWS]) {
    client.setQueryData(key as QueryKey, { seeded: true })
  }
  return client
}

const stale = (client: QueryClient, key: readonly unknown[]) =>
  client.getQueryState(key as QueryKey)?.isInvalidated === true

async function write<T>(useWrite: () => { mutateAsync: (value: T) => Promise<unknown> }, value: T) {
  const client = seededClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = await renderHook(useWrite, { wrapper })
  await act(async () => {
    await result.current.mutateAsync(value)
  })
  return client
}

// The average and count come with the place's page and every search that lists
// it; a write that left them cached kept the old rating on screen.
it.each([
  ['writing a review', () => useCreateReview(), { establishment_id: 1, rating: 5, body: 'Ótimo' }],
  ['editing a review', () => useUpdateReview(9), { rating: 3 }],
  ['deleting a review', () => useDeleteReview(), 9],
  ['writing a review with photos', () => useCreateReviewWithPhotos(), { body: {}, photos: [] }],
] as const)('refreshes the place’s rating after %s', async (_, useWrite, value) => {
  const client = await write(
    useWrite as () => { mutateAsync: (value: unknown) => Promise<unknown> },
    value
  )
  expect(stale(client, MY_REVIEWS)).toBe(true)
  expect(stale(client, PLACE_PAGE)).toBe(true)
  expect(stale(client, SEARCH)).toBe(true)
  expect(stale(client, OTHER_CITY_SEARCH)).toBe(true)
  // Nothing else in the catalogue carries a rating.
  expect(stale(client, CITIES)).toBe(false)
  expect(stale(client, AGENDA)).toBe(false)
})

it.each([
  ['adding', () => useAddReviewPhoto(9), { uri: 'file:///photo.jpg' }],
  ['removing', () => useRemoveReviewPhoto(9), 1],
] as const)('leaves the rating alone when %s a photo', async (_, useWrite, value) => {
  const client = await write(
    useWrite as () => { mutateAsync: (value: unknown) => Promise<unknown> },
    value
  )
  expect(stale(client, MY_REVIEWS)).toBe(true)
  expect(stale(client, PLACE_PAGE)).toBe(false)
  expect(stale(client, SEARCH)).toBe(false)
})

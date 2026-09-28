jest.mock('expo-crypto', () => ({ randomUUID: () => 'event-id' }))

const load = () => {
  jest.resetModules()
  return require('../events') as typeof import('../events')
}

const posted = (fetchMock: jest.SpyInstance) =>
  fetchMock.mock.calls.map(([url, init]) => ({
    path: new URL(String(url)).pathname,
    headers: (init as RequestInit).headers as Record<string, string>,
    body: JSON.parse((init as RequestInit).body as string),
  }))

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(Date.parse('2026-09-28T12:00:00Z'))
})
afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

it('posts one batch after the delay, with no credential and a bounded search term', async () => {
  const { track } = load()
  const fetchMock = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(null, { status: 202 }))

  track('establishment_view', { city_slug: 'londrina', establishment_slug: 'atelier' })
  track('search_without_results', { city_slug: 'londrina', search_term: 'x'.repeat(200) })
  expect(fetchMock).not.toHaveBeenCalled()

  await jest.advanceTimersByTimeAsync(2000)

  const [batch] = posted(fetchMock)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(batch.path).toBe('/api/v1/analytics/events')
  expect(batch.headers.authorization).toBeUndefined()
  expect(batch.body.events).toEqual([
    {
      event_id: 'event-id',
      event_type: 'establishment_view',
      city_slug: 'londrina',
      establishment_slug: 'atelier',
    },
    {
      event_id: 'event-id',
      event_type: 'search_without_results',
      city_slug: 'londrina',
      search_term: 'x'.repeat(120),
    },
  ])
})

it('holds later batches until Retry-After instead of posting into the limit', async () => {
  const { track, flushEvents } = load()
  const fetchMock = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'Retry-After': '60' } }))
    .mockResolvedValue(new Response(null, { status: 202 }))

  track('catalog_impression', { city_slug: 'londrina', establishment_slug: 'a' })
  await expect(flushEvents()).resolves.toBeUndefined()
  expect(fetchMock).toHaveBeenCalledTimes(1)

  await jest.advanceTimersByTimeAsync(59_000)
  track('catalog_impression', { city_slug: 'londrina', establishment_slug: 'b' })
  await expect(flushEvents()).resolves.toBeUndefined()
  expect(fetchMock).toHaveBeenCalledTimes(1)

  await jest.advanceTimersByTimeAsync(1_000)
  track('catalog_impression', { city_slug: 'londrina', establishment_slug: 'c' })
  await flushEvents()
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it('never lets a failed post reach the screen', async () => {
  const { track, flushEvents } = load()
  jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'))

  track('phone_click', { city_slug: 'londrina', establishment_slug: 'atelier' })
  await expect(flushEvents()).resolves.toBeUndefined()
})

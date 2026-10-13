import { searchEstablishments } from '@/api/catalog'

jest.mock('@/api/client', () => ({
  request: jest.fn(async (path: string) => ({ path })),
  ApiError: class extends Error {},
}))

const { request } = jest.requireMock('@/api/client') as { request: jest.Mock }

const pathFor = async (params: Parameters<typeof searchEstablishments>[1]) => {
  request.mockClear()
  await searchEstablishments('londrina', params)
  return request.mock.calls[0][0] as string
}

describe('catalog search parameters', () => {
  it('omits every default so an unfiltered search has a clean URL', async () => {
    expect(await pathFor({})).toBe('/api/v1/catalog/cities/londrina/establishments')
    expect(await pathFor({ openNow: false, attributes: [], page: 1, sort: 'relevance' })).toBe(
      '/api/v1/catalog/cities/londrina/establishments'
    )
  })

  it('sends attributes as one comma separated parameter', async () => {
    const path = await pathFor({ attributes: ['live_music', 'pet_friendly'] })
    expect(path).toContain('attributes=live_music%2Cpet_friendly')
  })

  it('carries the remaining filters', async () => {
    const path = await pathFor({ q: 'café', category: 'bares', openNow: true, page: 3 })
    expect(path).toContain('q=caf%C3%A9')
    expect(path).toContain('category=bares')
    expect(path).toContain('open_now=true')
    expect(path).toContain('page=3')
  })

  it('sends the orders and "Vale hoje" the server knows', async () => {
    expect(await pathFor({ sort: 'rating' })).toBe(
      '/api/v1/catalog/cities/londrina/establishments?sort=rating'
    )
    expect(await pathFor({ sort: 'price', benefitToday: true })).toBe(
      '/api/v1/catalog/cities/londrina/establishments?benefit_today=true&sort=price'
    )
    expect(await pathFor({ benefitToday: false })).toBe(
      '/api/v1/catalog/cities/londrina/establishments'
    )
  })

  it('sends the position with nearest first only, kept out of every cache', async () => {
    const origin = { latitude: -23.3105, longitude: -51.1628 }

    request.mockClear()
    await searchEstablishments('londrina', { sort: 'distance', origin })
    expect(request).toHaveBeenLastCalledWith(
      '/api/v1/catalog/cities/londrina/establishments?sort=distance&lat=-23.3105&lng=-51.1628',
      { sensitive: true }
    )

    // Without a position the server would refuse nearest first: the default order goes.
    expect(await pathFor({ sort: 'distance' })).toBe(
      '/api/v1/catalog/cities/londrina/establishments'
    )
    // A position left over beside another order is not sent.
    request.mockClear()
    await searchEstablishments('londrina', { sort: 'rating', origin })
    expect(request).toHaveBeenLastCalledWith(
      '/api/v1/catalog/cities/londrina/establishments?sort=rating',
      undefined
    )
  })
})

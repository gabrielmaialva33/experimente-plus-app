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
})

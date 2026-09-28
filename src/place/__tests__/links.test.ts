import { highlightParam, placeHref, publicEstablishmentUrl, publicSlug } from '@/place/links'

jest.mock('@/api/config', () => ({
  apiUrl: (path: string) => `https://experimente.test${path}`,
}))

it('builds the shared link from the city and establishment slugs', () => {
  expect(publicEstablishmentUrl('londrina', 'atelie-do-cafe')).toBe(
    'https://experimente.test/cidades/londrina/estabelecimentos/atelie-do-cafe'
  )
  expect(publicEstablishmentUrl('são paulo', 'a/b')).toBe(
    'https://experimente.test/cidades/s%C3%A3o%20paulo/estabelecimentos/a%2Fb'
  )
})

it('opens a place at the top unless a link names one of its items', () => {
  expect(placeHref('londrina', 'atelie')).toBe('/estabelecimento/londrina/atelie')
  expect(placeHref('londrina', 'atelie', { kind: 'event', id: 7 })).toBe(
    '/estabelecimento/londrina/atelie?destaque=event-7'
  )
})

it('reads a slug from a route as the public catalogue does', () => {
  expect(publicSlug('atelie-do-cafe')).toBe('atelie-do-cafe')
  expect(publicSlug(' Londrina ')).toBe('londrina')
  for (const value of ['', '-cafe', 'cafe--bar', 'café', 'a/b', '../me', 'cafe?x=1', 'a b']) {
    expect(publicSlug(value)).toBeNull()
  }
  expect(publicSlug(['londrina', 'cambe'])).toBeNull()
  expect(publicSlug(undefined)).toBeNull()
})

it('takes the item a place link names only in the shape the app writes it', () => {
  expect(highlightParam('event-7')).toBe('event-7')
  expect(highlightParam('showcase_item-12')).toBe('showcase_item-12')
  expect(highlightParam('event-')).toBeNull()
  expect(highlightParam(['event-7', 'event-8'])).toBeNull()
  expect(highlightParam(undefined)).toBeNull()
})

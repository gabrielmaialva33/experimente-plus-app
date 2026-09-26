import { placeHref, publicEstablishmentUrl } from '@/place/links'

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

import type { ItineraryStop } from '@/api/explorer'
import {
  ITINERARY_SHARE_FOOTER,
  itineraryShareMessage,
  stopAddressLine,
} from '@/explorer/itinerary-share'

jest.mock('@/api/config', () => ({
  apiUrl: (path: string) => `https://experimente.test${path}`,
}))

const place = (id: number, name: string, citySlug = 'londrina', cityName = 'Londrina') => ({
  id,
  slug: `lugar-${id}`,
  name,
  city_slug: citySlug,
  city_name: cityName,
  cover_url: null,
  category: 'Cafés',
})

const address = (overrides: Partial<NonNullable<ItineraryStop['address']>> = {}) => ({
  street: 'Rua Sergipe',
  number: '100',
  without_number: false,
  complement: null,
  district: 'Centro',
  ...overrides,
})

const stop = (
  id: number,
  establishment: ItineraryStop['establishment'],
  stopAddress: ItineraryStop['address'] = null,
  note: string | null = null
): ItineraryStop => ({ id, position: id, note, establishment, address: stopAddress })

describe('stopAddressLine', () => {
  it('reads street, number, district and city', () => {
    expect(stopAddressLine(stop(1, place(7, 'Café'), address()))).toBe(
      'Rua Sergipe, 100 · Centro · Londrina'
    )
  })

  it('says "s/n" for a place without a number and keeps the complement', () => {
    expect(
      stopAddressLine(
        stop(
          1,
          place(7, 'Café'),
          address({ number: null, without_number: true, complement: 'Loja 2' })
        )
      )
    ).toBe('Rua Sergipe, s/n - Loja 2 · Centro · Londrina')
  })

  it('keeps a district alone, but never reduces an address to the city', () => {
    expect(
      stopAddressLine(stop(1, place(7, 'Café'), address({ street: null, number: null })))
    ).toBe('Centro · Londrina')
    expect(
      stopAddressLine(
        stop(1, place(7, 'Café'), address({ street: null, number: null, district: null }))
      )
    ).toBeNull()
    expect(stopAddressLine(stop(1, place(7, 'Café'), null))).toBeNull()
  })
})

describe('itineraryShareMessage', () => {
  it('lists the stops in order with name, address and public page, then the footer', () => {
    const message = itineraryShareMessage({
      name: ' Sábado no centro ',
      stops: [
        stop(1, place(7, 'Café da Manhã'), address(), 'pedir o bolo'),
        stop(2, place(8, 'Bar da Noite', 'maringa', 'Maringá'), address({ number: '9' })),
      ],
    })

    expect(message).toBe(
      [
        'Roteiro: Sábado no centro',
        '1. Café da Manhã\nRua Sergipe, 100 · Centro · Londrina\nhttps://experimente.test/cidades/londrina/estabelecimentos/lugar-7',
        '2. Bar da Noite\nRua Sergipe, 9 · Centro · Maringá\nhttps://experimente.test/cidades/maringa/estabelecimentos/lugar-8',
        ITINERARY_SHARE_FOOTER,
      ].join('\n\n')
    )
    // The person's own notes stay in the app.
    expect(message).not.toContain('pedir o bolo')
  })

  it('shares a stop without an address with its name and page alone', () => {
    const message = itineraryShareMessage({
      name: 'Domingo',
      stops: [
        stop(1, place(7, 'Café Sem Rua'), address({ street: null, number: null, district: null })),
        stop(2, place(8, 'Bar Sem Endereço'), null),
      ],
    })

    expect(message).toContain(
      '1. Café Sem Rua\nhttps://experimente.test/cidades/londrina/estabelecimentos/lugar-7'
    )
    expect(message).toContain(
      '2. Bar Sem Endereço\nhttps://experimente.test/cidades/londrina/estabelecimentos/lugar-8'
    )
  })

  it('skips a stop whose place left the catalogue and numbers the rest in order', () => {
    const message = itineraryShareMessage({
      name: 'Com lacuna',
      stops: [stop(1, null, null, 'voltar à noite'), stop(2, place(8, 'Bar da Noite'), address())],
    })

    expect(message).toContain('1. Bar da Noite')
    expect(message).not.toContain('voltar à noite')
    expect(message).not.toContain('2.')
  })

  it('has nothing to share without a public stop', () => {
    expect(itineraryShareMessage({ name: 'Vazio', stops: [] })).toBeNull()
    expect(itineraryShareMessage({ name: 'Só lacunas', stops: [stop(1, null)] })).toBeNull()
  })

  it('never links to the itinerary itself, which stays private', () => {
    const message = itineraryShareMessage({
      name: 'Privado',
      stops: [stop(1, place(7, 'Café'), address())],
    })

    const links = message?.match(/https?:\/\/\S+/g) ?? []
    expect(links).toEqual(['https://experimente.test/cidades/londrina/estabelecimentos/lugar-7'])
  })
})

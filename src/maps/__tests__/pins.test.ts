import { groupLabel, groupPins, toPins, type MapPin } from '../types'
import type { EstablishmentSummary } from '@/catalog/types'

const item = (slug: string, lat: number | null, lng: number | null) =>
  ({
    slug,
    name: slug,
    short_description: null,
    city: { slug: 'londrina', name: 'Londrina', state_code: 'PR' },
    address: { district: 'Centro', latitude: lat, longitude: lng },
    business_status: 'open',
    is_open_now: true,
    primary_category: { name: 'Bares' },
    categories: [],
    cover: {},
    is_sponsored: false,
    published_at: '',
    updated_at: '',
  }) as unknown as EstablishmentSummary

describe('toPins', () => {
  it('keeps only what the projection actually located', () => {
    const pins = toPins([
      item('com-coordenadas', -23.3, -51.16),
      item('sem-latitude', null, -51.16),
      item('sem-longitude', -23.3, null),
      item('sem-nenhuma', null, null),
    ])

    expect(pins.map((pin) => pin.slug)).toEqual(['com-coordenadas'])
  })

  it('carries the primary category as the pin subtitle', () => {
    const [pin] = toPins([item('bar', -23.3, -51.16)])

    expect(pin).toMatchObject({ name: 'bar', category: 'Bares', latitude: -23.3, longitude: -51.16 })
  })
})

describe('groupPins', () => {
  const pin = (slug: string, latitude: number, longitude: number): MapPin => ({
    slug, name: slug, category: null, latitude, longitude,
  })

  it('gives places at the same point one marker that names how many', () => {
    const groups = groupPins([pin('casa', -23.3103, -51.1628), pin('atelie', -23.3103, -51.1628)])

    expect(groups).toHaveLength(1)
    expect(groups[0].pins.map((item) => item.slug)).toEqual(['casa', 'atelie'])
    expect(groupLabel(groups[0])).toBe('2 lugares aqui')
  })

  it('treats a few metres as the same spot and a street away as another', () => {
    // ~11 m apart: the same building. ~330 m apart: another block.
    const groups = groupPins([
      pin('loja-1', -23.3103, -51.1628),
      pin('loja-2', -23.3104, -51.1628),
      pin('outra-quadra', -23.3133, -51.1628),
    ])

    expect(groups.map((group) => group.pins.map((item) => item.slug))).toEqual([
      ['loja-1', 'loja-2'],
      ['outra-quadra'],
    ])
    expect(groupLabel(groups[1])).toBe('outra-quadra')
  })
})

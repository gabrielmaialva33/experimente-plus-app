import { toPins } from '../types'
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

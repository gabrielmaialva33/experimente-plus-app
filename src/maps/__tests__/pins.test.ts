import {
  groupLabel,
  groupPins,
  placeFeatures,
  pressedTarget,
  spotOfLeaves,
  toPins,
  type MapPin,
} from '../types'
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

    expect(pin).toMatchObject({
      name: 'bar',
      category: 'Bares',
      latitude: -23.3,
      longitude: -51.16,
    })
  })
})

const pin = (slug: string, latitude: number, longitude: number): MapPin => ({
  slug,
  name: slug,
  category: null,
  latitude,
  longitude,
})

describe('groupPins', () => {
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

describe('placeFeatures', () => {
  it('gives the map one point per spot, in the order the server ranked them', () => {
    const groups = groupPins([
      pin('casa', -23.3103, -51.1628),
      pin('atelie', -23.3103, -51.1628),
      pin('forno', -23.29, -51.17),
    ])

    expect(placeFeatures(groups)).toEqual({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-51.1628, -23.3103] },
          properties: { key: 'casa', name: '2 lugares aqui', places: 2, rank: 0 },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-51.17, -23.29] },
          properties: { key: 'forno', name: 'forno', places: 1, rank: 1 },
        },
      ],
    })
  })
})

describe('pressedTarget', () => {
  const groups = groupPins([
    pin('casa', -23.3103, -51.1628),
    pin('atelie', -23.3103, -51.1628),
    pin('forno', -23.29, -51.17),
  ])
  const at = (key: string, longitude: number, latitude: number, extra = {}) => ({
    geometry: { type: 'Point', coordinates: [longitude, latitude] },
    properties: { key, ...extra },
  })

  it('opens a lone place and lists a spot that holds several', () => {
    expect(pressedTarget([at('forno', -51.17, -23.29)], [-51.17, -23.29], groups)).toEqual({
      kind: 'place',
      slug: 'forno',
    })
    expect(
      pressedTarget([at('casa', -51.1628, -23.3103)], [-51.1628, -23.3103], groups)
    ).toMatchObject({ kind: 'spot', group: { key: 'casa' } })
  })

  it('asks a cluster to open where it stands', () => {
    const cluster = {
      geometry: { type: 'Point', coordinates: [-51.166, -23.3] },
      properties: { cluster: true, cluster_id: 7, places: 3 },
    }
    expect(pressedTarget([cluster], [-51.166, -23.3], groups)).toEqual({
      kind: 'cluster',
      clusterId: 7,
      center: [-51.166, -23.3],
    })
  })

  // A label reaches past its dot: two marks can answer one tap.
  it('picks the mark closest to the finger', () => {
    const features = [at('casa', -51.1628, -23.3103), at('forno', -51.17, -23.29)]

    expect(pressedTarget(features, [-51.1699, -23.2905], groups)).toEqual({
      kind: 'place',
      slug: 'forno',
    })
    expect(pressedTarget(features, [-51.163, -23.31], groups)).toMatchObject({ kind: 'spot' })
  })

  it('ignores what is not one of its marks', () => {
    expect(pressedTarget([at('gone', -51.17, -23.29)], [-51.17, -23.29], groups)).toBeNull()
    expect(pressedTarget([{ properties: { key: 'forno' } }], [-51.17, -23.29], groups)).toBeNull()
    expect(pressedTarget([], [-51.17, -23.29], groups)).toBeNull()
  })
})

describe('spotOfLeaves', () => {
  const groups = groupPins([
    pin('casa', -23.3103, -51.1628),
    pin('atelie', -23.3103, -51.1628),
    pin('forno', -23.29, -51.17),
  ])

  it('lists every place behind a cluster that cannot split', () => {
    const spot = spotOfLeaves(
      [{ properties: { key: 'casa' } }, { properties: { key: 'forno' } }],
      [-51.166, -23.3],
      groups
    )

    expect(spot?.pins.map((item) => item.slug)).toEqual(['casa', 'atelie', 'forno'])
    expect(spot).toMatchObject({ longitude: -51.166, latitude: -23.3 })
    expect(groupLabel(spot!)).toBe('3 lugares aqui')
  })

  it('has nothing to list when the leaves name no known spot', () => {
    expect(spotOfLeaves([{ properties: { key: 'gone' } }], [0, 0], groups)).toBeNull()
  })
})

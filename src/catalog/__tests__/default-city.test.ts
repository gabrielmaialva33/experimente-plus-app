import { defaultCity } from '@/catalog/default-city'

const published = [{ slug: 'londrina' }, { slug: 'cambe' }]

describe('defaultCity', () => {
  it('keeps the remembered city while the published cities are unknown', () => {
    expect(defaultCity('cambe', undefined)).toBeNull()
    expect(defaultCity(null, undefined)).toBeNull()
  })

  it('keeps a remembered city that is still published', () => {
    expect(defaultCity('cambe', published)).toBeNull()
  })

  it('opens on the first published city until someone chooses one', () => {
    expect(defaultCity(null, published)).toBe('londrina')
  })

  it('replaces a remembered city that is no longer published', () => {
    expect(defaultCity('arapongas', published)).toBe('londrina')
  })

  it('has nothing to offer when no city is published', () => {
    expect(defaultCity('arapongas', [])).toBeNull()
    expect(defaultCity(null, [])).toBeNull()
  })
})

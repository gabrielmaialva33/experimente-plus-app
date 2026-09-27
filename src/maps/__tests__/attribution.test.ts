import { creditFromAttribution, creditFromStyle } from '../attribution'

/** The attribution the published regional style actually declares. */
const declared =
  '<a href="https://protomaps.com">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'

describe('creditFromAttribution', () => {
  it('renders the declared HTML as plain text', () => {
    expect(creditFromAttribution(declared)).toBe('Protomaps © OpenStreetMap contributors')
  })
})

describe('creditFromStyle', () => {
  it('keeps the producer the native dialog drops', () => {
    const credit = creditFromStyle({ sources: { protomaps: { attribution: declared } } })

    expect(credit).toContain('Protomaps')
    expect(credit).toContain('OpenStreetMap')
  })

  it('shows one credit when sources repeat it', () => {
    const credit = creditFromStyle({
      sources: { tiles: { attribution: declared }, extra: { attribution: declared } },
    })

    expect(credit).toBe('Protomaps © OpenStreetMap contributors')
  })

  it('never claims a producer the style did not declare', () => {
    expect(creditFromStyle({ sources: { demo: {} } })).toBe('© OpenStreetMap')
    expect(creditFromStyle({})).toBe('© OpenStreetMap')
  })
})

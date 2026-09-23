import type { Interest } from '@/api/explorer'
import { interestOptions, selectionChanged } from '@/explorer/interest-options'
import { moveStop } from '@/explorer/itinerary-order'

const interest = (slug: string, name = slug, isActive = true): Interest => ({
  id: slug.length,
  category: { slug, name, is_active: isActive },
  created_at: '2026-09-23T12:00:00.000Z',
})

describe('moveStop', () => {
  it('returns the whole sequence, because the server takes nothing less', () => {
    expect(moveStop([10, 20, 30], 2, -1)).toEqual([10, 30, 20])
    expect(moveStop([10, 20, 30], 0, 1)).toEqual([20, 10, 30])
  })

  it('keeps a stop at the top when it is pushed further up, instead of wrapping', () => {
    const order = [10, 20, 30]
    expect(moveStop(order, 0, -1)).toBe(order)
    expect(moveStop(order, 2, 1)).toBe(order)
  })

  it('treats the same place twice as two stops, since they are two stops', () => {
    expect(moveStop([7, 8, 7], 0, 1)).toEqual([8, 7, 7])
  })
})

describe('interestOptions', () => {
  const city = [
    { slug: 'cafes', name: 'Cafés' },
    { slug: 'bares', name: 'Bares' },
  ]

  it('offers the categories of the city', () => {
    expect(interestOptions(city, []).map((option) => option.slug)).toEqual(['cafes', 'bares'])
  })

  it('keeps visible a chosen category the city no longer offers, so it can be undone', () => {
    const options = interestOptions(city, [interest('museus', 'Museus', false)])

    expect(options.map((option) => option.slug)).toEqual(['cafes', 'bares', 'museus'])
    expect(options.find((option) => option.slug === 'museus')?.retired).toBe(true)
  })

  it('does not list a chosen category twice when the city still offers it', () => {
    expect(interestOptions(city, [interest('cafes', 'Cafés')])).toHaveLength(2)
  })
})

describe('selectionChanged', () => {
  it('notices an addition, a removal and a swap of the same size', () => {
    const chosen = [interest('cafes'), interest('bares')]

    expect(selectionChanged(new Set(['cafes', 'bares']), chosen)).toBe(false)
    expect(selectionChanged(new Set(['cafes']), chosen)).toBe(true)
    expect(selectionChanged(new Set(['cafes', 'bares', 'museus']), chosen)).toBe(true)
    expect(selectionChanged(new Set(['cafes', 'museus']), chosen)).toBe(true)
  })
})

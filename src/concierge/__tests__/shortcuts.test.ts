import { CONCIERGE_SHORTCUTS, conciergeFiltersOf, type ConciergeShortcut } from '../shortcuts'

const of = (...ids: ConciergeShortcut[]) => conciergeFiltersOf(new Set(ids))

it('sends nothing when no shortcut is ticked, so the question goes out as before', () => {
  expect(of()).toBeNull()
})

it('maps each shortcut onto the filter the server reads', () => {
  expect(of('open_now')).toEqual({ open_now: true })
  expect(of('food')).toEqual({ kind: ['food'] })
  expect(of('leisure')).toEqual({ kind: ['leisure'] })
  expect(of('services')).toEqual({ kind: ['services'] })
  expect(of('well_rated')).toEqual({ min_rating: 4 })
  expect(of('up_to_50')).toEqual({ price: ['up_to_50'] })
  expect(of('50_100')).toEqual({ price: ['50_100'] })
  expect(of('over_100')).toEqual({ price: ['over_100'] })
})

it('keeps kinds and prices in a stable order, whatever order they were ticked in', () => {
  expect(of('over_100', 'services', 'up_to_50', 'food', 'open_now', 'well_rated')).toEqual({
    open_now: true,
    kind: ['food', 'services'],
    min_rating: 4,
    price: ['up_to_50', 'over_100'],
  })
})

it('names the same shortcuts as the site, and spells out the price ones', () => {
  expect(CONCIERGE_SHORTCUTS.map((shortcut) => shortcut.label)).toEqual([
    'Aberto agora',
    'Comida',
    'Lazer',
    'Serviços',
    'Bem avaliados (4+)',
    'Até R$ 50',
    'R$ 50 a 100',
    'Acima de R$ 100',
  ])
  for (const id of ['up_to_50', '50_100', 'over_100'] as const) {
    const shortcut = CONCIERGE_SHORTCUTS.find((item) => item.id === id)!
    expect(shortcut.accessibilityLabel).toMatch(/^Ticket médio /)
  }
})

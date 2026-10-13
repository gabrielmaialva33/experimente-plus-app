import type { ConciergeFilters } from '@/api/concierge'

/**
 * The shortcuts shown above the question, the same as the site's Concierge.
 *
 * Each is a checkbox that narrows the catalogue the answer may draw on. The
 * server applies them before the model sees anything, so the app only says
 * which were ticked: it never filters a reply on its own. The price buckets
 * read the place's "Ticket médio", which the visible label alone does not say,
 * so their spoken names do.
 */
export const CONCIERGE_SHORTCUTS = [
  { id: 'open_now', label: 'Aberto agora', accessibilityLabel: 'Aberto agora' },
  { id: 'food', label: 'Comida', accessibilityLabel: 'Comida' },
  { id: 'leisure', label: 'Lazer', accessibilityLabel: 'Lazer' },
  { id: 'services', label: 'Serviços', accessibilityLabel: 'Serviços' },
  {
    id: 'well_rated',
    label: 'Bem avaliados (4+)',
    accessibilityLabel: 'Bem avaliados, nota 4 ou mais',
  },
  { id: 'up_to_50', label: 'Até R$ 50', accessibilityLabel: 'Ticket médio até 50 reais' },
  {
    id: '50_100',
    label: 'R$ 50 a 100',
    accessibilityLabel: 'Ticket médio de 50 a 100 reais',
  },
  {
    id: 'over_100',
    label: 'Acima de R$ 100',
    accessibilityLabel: 'Ticket médio acima de 100 reais',
  },
] as const

export type ConciergeShortcut = (typeof CONCIERGE_SHORTCUTS)[number]['id']

/** "Bem avaliados" is a public review average of at least four. */
const WELL_RATED = 4

const KINDS = ['food', 'leisure', 'services'] as const
const PRICES = ['up_to_50', '50_100', 'over_100'] as const

/**
 * The ticked shortcuts as the question's `filters`, or nothing when none is
 * ticked, so a question without shortcuts goes out exactly as before. Within
 * kinds and within prices any ticked value matches; across them, all hold.
 */
export function conciergeFiltersOf(
  selected: ReadonlySet<ConciergeShortcut>
): ConciergeFilters | null {
  const kind = KINDS.filter((id) => selected.has(id))
  const price = PRICES.filter((id) => selected.has(id))
  const filters: ConciergeFilters = {
    ...(selected.has('open_now') ? { open_now: true } : {}),
    ...(kind.length > 0 ? { kind } : {}),
    ...(selected.has('well_rated') ? { min_rating: WELL_RATED } : {}),
    ...(price.length > 0 ? { price } : {}),
  }

  return Object.keys(filters).length > 0 ? filters : null
}

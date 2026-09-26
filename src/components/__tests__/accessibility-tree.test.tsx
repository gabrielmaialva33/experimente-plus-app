import { render } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import type { JsonElement, JsonNode } from 'test-renderer'

import type { EstablishmentDetail } from '@/catalog/types'
import { Badge } from '@/components/badge'
import { EmptyState } from '@/components/empty-state'
import { SearchField } from '@/components/search-field'
import { TicketCard } from '@/components/ticket-card'
import { PracticalInfo } from '@/place/practical-info'
import { palette } from '@/theme/tokens'
import { ReceiptCard } from '@/wallet/receipt-card'
import type { Receipt } from '@/wallet/types'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({ useColors: jest.fn() }))

const theme = jest.requireMock('@/theme/use-colors') as { useColors: jest.Mock }
beforeEach(() => theme.useColors.mockReturnValue(palette.light))

const hidden = (node: JsonElement) =>
  node.props.importantForAccessibility === 'no-hide-descendants' ||
  node.props.accessibilityElementsHidden === true

/** An element a screen reader stops on as a whole, whose drawing is never reached alone. */
const speaksAsOne = (node: JsonElement) =>
  node.props.accessible === true && typeof node.props.accessibilityLabel === 'string'

/**
 * Every icon a screen reader could land on by itself: an Ionicons glyph outside
 * any element that speaks as one and not hidden. It would be read as an
 * unnamed character, or as nothing, and still take a swipe.
 */
function strayIcons(root: JsonElement | null): string[] {
  const found: string[] = []
  const walk = (node: JsonNode, covered: boolean) => {
    if (typeof node === 'string') return
    if (hidden(node)) return
    if (node.type === 'Icon' && !covered) found.push(String(node.props.name))
    const next = covered || speaksAsOne(node)
    for (const child of node.children ?? []) walk(child, next)
  }
  if (root) walk(root, false)
  return found
}

const receipt: Receipt = {
  id: 1,
  receipt_code: 'ABC123',
  redemption_number: 1,
  redeemed_at: '2026-09-26T15:00:00Z',
  edition: { id: 1, name: 'Pacote Londrina' },
  offer: { id: 2, title: 'Item em dobro', benefit_type: 'discount', terms: null },
  establishment: { id: 1, name: 'Café' },
  holder: { id: 1, full_name: 'Ana', email: 'ana@example.test' },
  redeemed_by: 2,
}

const place = {
  address: {
    street: 'Rua Central',
    number: '10',
    without_number: false,
    district: 'Centro',
  },
  city: { name: 'Londrina', state_code: 'PR', timezone: 'America/Sao_Paulo' },
  availability_type: 'regular_hours',
  opening_hours: { weekly: [], special_days: [] },
} as unknown as EstablishmentDetail

it.each<[string, ReactNode]>([
  ['a badge with an icon', <Badge key="badge" label="2 usos restantes" icon="ticket-outline" />],
  [
    'an empty state',
    <EmptyState
      key="empty"
      icon="heart-outline"
      title="Nenhum favorito"
      text="Toque no coração."
    />,
  ],
  [
    'the search field',
    <SearchField key="search" value="" onChangeText={jest.fn()} placeholder="Buscar lugares" />,
  ],
  ['a benefit ticket', <TicketCard key="ticket" stubLabel="Item em dobro" title="Café" />],
  ['a receipt', <ReceiptCard key="receipt" receipt={receipt} />],
  [
    'the practical information of a place',
    <PracticalInfo
      key="info"
      detail={place}
      contacts={[{ label: 'WhatsApp', icon: 'logo-whatsapp', onPress: jest.fn() }]}
    />,
  ],
])('leaves no icon for a screen reader to land on alone in %s', async (_name, element) => {
  const view = await render(<>{element}</>)
  expect(strayIcons(view.toJSON())).toEqual([])
})

it('still reaches the icons inside a pressable through its label', async () => {
  const view = await render(
    <PracticalInfo
      detail={place}
      contacts={[{ label: 'WhatsApp', icon: 'logo-whatsapp', onPress: jest.fn() }]}
    />
  )
  expect(view.getByRole('button', { name: 'WhatsApp' })).toBeOnTheScreen()
})

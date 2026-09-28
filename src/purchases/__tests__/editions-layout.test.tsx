import { act, render, within } from '@testing-library/react-native'
import { Dimensions, StyleSheet } from 'react-native'

import EditionsScreen from '@/app/(tabs)/wallet/edicoes'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('@/api/client', () => ({ ApiError: class ApiError extends Error {} }))
jest.mock('@/purchases/queries', () => ({
  usePurchaseEditions: jest.fn(),
  usePurchases: jest.fn(),
}))

const queries = jest.requireMock('@/purchases/queries') as Record<string, jest.Mock>

const product = {
  edition_id: 2,
  offer_id: null,
  product_type: 'edition',
  amount_cents: 12300,
  currency: 'BRL',
  name: 'Edição 2026',
  city: { name: 'Londrina', timezone: 'America/Sao_Paulo' },
  snapshot: {
    usage_starts_at: '2026-10-01T00:00:00Z',
    usage_ends_at: '2026-12-31T00:00:00Z',
    sales_starts_at: '2026-09-01T00:00:00Z',
    sales_ends_at: '2026-09-30T00:00:00Z',
    offers: [{ title: 'Oferta', establishment: { public_name: 'Café' } }],
  },
}

/** The system text size; React Native's Jest setup reports 2 (200%). */
const setFontScale = (fontScale: number) =>
  act(() =>
    Dimensions.set({
      window: { ...Dimensions.get('window'), fontScale },
      screen: { ...Dimensions.get('screen'), fontScale },
    })
  )
afterEach(() => setFontScale(2))

const style = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, unknown>

beforeEach(() => {
  queries.usePurchaseEditions.mockReturnValue({ data: { products: [product] } })
  queries.usePurchases.mockReturnValue({ data: { purchases: [] } })
})

it.each([
  [1, 'row'],
  [1.15, 'row'],
  // Android's "Large" step arrives as a float just under 1.3.
  [1.2999999523162842, 'column'],
  [2, 'column'],
])(
  'puts "Ver detalhes" beside the price, or under it from the "Large" text step (scale %s)',
  async (scale, direction) => {
    await setFontScale(scale)
    const view = await render(<EditionsScreen />)
    const footer = view.getByTestId('product-footer-2:edition')
    expect(style(footer)).toMatchObject({ flexDirection: direction })
    // Stacked on purpose, never wrapped wherever the amount happens to end.
    expect(style(footer).flexWrap).toBeUndefined()
    expect(within(footer).getByText('R$ 123,00')).toBeOnTheScreen()
    expect(within(footer).getByText('Ver detalhes')).toBeOnTheScreen()
  }
)

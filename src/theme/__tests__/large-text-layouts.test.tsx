import { act, render, within } from '@testing-library/react-native'
import { Dimensions, StyleSheet, Text } from 'react-native'

import { Button } from '@/components/button'
import { StickyFooter } from '@/components/sticky-footer'
import { SectionHeader } from '@/components/section-header'
import { PlaceBenefits } from '@/place/benefit-ticket'
import { PlaceActions } from '@/place/place-actions'
import { ReviewCard } from '@/reviews/review-card'
import { STACK_FROM_SCALE, useStackedLayout } from '@/theme/font-scale'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/purchases/queries', () => ({ usePurchaseEditions: jest.fn() }))
jest.mock('@/api/client', () => ({ ApiError: class ApiError extends Error {} }))
jest.mock('@/session/context', () => ({ useSession: () => ({ status: 'anonymous' }) }))
jest.mock('@/explorer/queries', () => ({
  useSavedStatus: () => ({ data: undefined }),
  useToggleSaved: () => ({ isPending: false, mutate: jest.fn() }),
}))
jest.mock('@/place/follow-hint', () => ({
  followExplained: () => true,
  markFollowExplained: jest.fn(),
}))

const purchases = jest.requireMock('@/purchases/queries') as { usePurchaseEditions: jest.Mock }

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

function Probe() {
  return <Text>{String(useStackedLayout())}</Text>
}

it.each([
  [1, 'false'],
  [1.15, 'false'],
  [STACK_FROM_SCALE, 'true'],
  // Android reports its 1.3 step as a float.
  [1.2999999523162842, 'true'],
  [2, 'true'],
])('stacks side-by-side blocks from the "Large" text step on (scale %s)', async (scale, out) => {
  await setFontScale(scale)
  const view = await render(<Probe />)
  expect(view.getByText(out)).toBeOnTheScreen()
})

describe('the place benefit ticket', () => {
  const offer = {
    id: 9,
    edition_id: 5,
    offer_id: 9,
    product_type: 'offer',
    purchasable: true,
    name: 'Item em dobro',
    amount_cents: 1490,
    currency: 'BRL',
    usage_ends_at: '2027-05-09T15:00:00Z',
    city: { slug: 'londrina' },
    establishment: { slug: 'cafe' },
    snapshot: { offers: [{ title: 'Item em dobro', description: 'Peça um e ganhe outro.' }] },
  }
  beforeEach(() => purchases.usePurchaseEditions.mockReturnValue({ data: { products: [offer] } }))
  const ticket = () => (
    <PlaceBenefits citySlug="londrina" slug="cafe" timeZone="America/Sao_Paulo" />
  )

  it('keeps the price in its stub column at the drawn size', async () => {
    await setFontScale(1)
    const view = await render(ticket())
    expect(style(view.getByTestId('benefit-5:9'))).toMatchObject({ flexDirection: 'row' })
    expect(view.queryByTestId('benefit-cut', { includeHiddenElements: true })).toBeNull()
  })

  it('tears across with large text, so price and action take the full width', async () => {
    await setFontScale(2)
    const view = await render(ticket())
    expect(style(view.getByTestId('benefit-5:9'))).toMatchObject({ flexDirection: 'column' })
    expect(view.getByTestId('benefit-cut', { includeHiddenElements: true })).toBeTruthy()
    expect(view.getByRole('button', { name: /^Ver oferta/ })).toBeOnTheScreen()
  })
})

it.each([
  [1, 'row'],
  [2, 'column'],
])('puts the button under the total when the text is large (scale %s)', async (scale, dir) => {
  await setFontScale(scale)
  const view = await render(
    <StickyFooter caption="Total" value="R$ 14,90" testID="footer">
      <Button label="Ir para o pagamento" fill onPress={jest.fn()} />
    </StickyFooter>
  )
  expect(style(view.getByTestId('footer'))).toMatchObject({ flexDirection: dir })
  // Under the total the action keeps its own height; `flex: 1` in a column is zero.
  expect(style(view.getByTestId('sticky-footer-action')).flex).toBe(dir === 'row' ? 1 : 0)
})

it('lets a review date wrap under its stars instead of running under the menu', async () => {
  const view = await render(
    <ReviewCard
      review={{
        id: 1,
        tenant_id: 1,
        establishment_id: 7,
        user_id: 42,
        rating: 4,
        comment: 'Café muito bom.',
        status: 'published',
        photos_count: 0,
        videos_count: 0,
        created_at: '2026-09-26T12:00:00.000Z',
        updated_at: '2026-09-26T12:00:00.000Z',
        author: { id: 42, full_name: 'Ana Ribeiro', username: 'ana' },
      }}
      onReport={jest.fn()}
    />
  )
  const date = view.getByText(/set\. de 2026|set de 2026/)
  expect(style(date.parent as never)).toMatchObject({ flexWrap: 'wrap' })
})

it.each([
  [1, undefined],
  [2, 'wrap'],
])('lets a section action move under its title with large text (scale %s)', async (scale, wrap) => {
  await setFontScale(scale)
  const view = await render(
    <SectionHeader
      title="Lugares em Londrina"
      action={{ label: 'Ver no mapa', onPress: jest.fn() }}
    />
  )
  expect(style(view.getByTestId('section-header')).flexWrap).toBe(wrap)
})

describe("a place's main action", () => {
  const actions = () =>
    render(
      <PlaceActions
        establishmentId={7}
        name="Ateliê do Café"
        primary={{ label: 'Como chegar', icon: 'navigate-outline', onPress: jest.fn() }}
      />
    )

  /** The row that holds the follow and itinerary buttons. */
  const iconRow = (view: Awaited<ReturnType<typeof actions>>) =>
    view.getByTestId('place-follow').parent as Parameters<typeof within>[0]

  it('shares its line with the follow and itinerary buttons at the drawn size', async () => {
    await setFontScale(1)
    const view = await actions()
    expect(within(iconRow(view)).getByRole('button', { name: 'Como chegar' })).toBeOnTheScreen()
  })

  it('takes a line of its own with large text, the buttons under it', async () => {
    const view = await actions()
    expect(view.getByRole('button', { name: 'Como chegar' })).toBeOnTheScreen()
    expect(within(iconRow(view)).queryByRole('button', { name: 'Como chegar' })).toBeNull()
    expect(within(iconRow(view)).getByTestId('place-itinerary')).toBeOnTheScreen()
  })
})

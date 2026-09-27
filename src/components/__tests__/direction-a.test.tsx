import { act, fireEvent, render } from '@testing-library/react-native'
import { Dimensions, StyleSheet, Text } from 'react-native'

import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { COMPACT_CARD, CompactCard } from '@/components/compact-card'
import { DateTile } from '@/components/date-tile'
import { IconButton } from '@/components/icon-button'
import { ScreenHeader } from '@/components/screen-header'
import { SearchField } from '@/components/search-field'
import { SectionHeader } from '@/components/section-header'
import { minTouch, palette, radius } from '@/theme/tokens'

jest.mock('@/theme/use-colors', () => ({ useColors: jest.fn() }))
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 0, left: 0 }),
}))

const theme = jest.requireMock('@/theme/use-colors') as { useColors: jest.Mock }
beforeEach(() => theme.useColors.mockReturnValue(palette.light))

/** The system text size; React Native's Jest setup reports 2 (200%). */
const setFontScale = (fontScale: number) =>
  act(() =>
    Dimensions.set({
      window: { ...Dimensions.get('window'), fontScale },
      screen: { ...Dimensions.get('screen'), fontScale },
    })
  )
afterEach(() => setFontScale(2))

describe('Button', () => {
  it.each([
    ['primary', 'primary', 'primaryForeground'],
    ['cta', 'cta', 'ctaForeground'],
  ] as const)(
    'fills the %s variant with its role and keeps the pill',
    async (variant, fill, text) => {
      const press = jest.fn()
      const view = await render(
        <Button label="Continuar" variant={variant} size={52} onPress={press} />
      )
      const button = view.getByRole('button', { name: 'Continuar' })
      expect(button).toHaveStyle({
        minHeight: 52,
        borderRadius: radius.pill,
        backgroundColor: palette.light[fill],
      })
      expect(view.getByText('Continuar')).toHaveStyle({ color: palette.light[text] })
      await fireEvent.press(button)
      expect(press).toHaveBeenCalledTimes(1)
    }
  )

  it('keeps a disabled button shaped and readable instead of fading it into text', async () => {
    const press = jest.fn()
    const view = await render(<Button label="Salvar" disabled onPress={press} />)
    const button = view.getByRole('button', { name: 'Salvar', disabled: true })
    expect(button).toHaveStyle({ backgroundColor: palette.light.muted, borderRadius: radius.pill })
    expect(view.getByText('Salvar')).toHaveStyle({ color: palette.light.mutedForeground })
    await fireEvent.press(button)
    expect(press).not.toHaveBeenCalled()
  })
})

it('draws icon buttons as 44-unit circles that say what they do', async () => {
  const view = await render(
    <IconButton icon="heart-outline" accessibilityLabel="Favoritar Ateliê" onPress={jest.fn()} />
  )
  expect(view.getByRole('button', { name: 'Favoritar Ateliê' })).toHaveStyle({
    width: minTouch,
    height: minTouch,
    borderRadius: radius.pill,
  })
})

it('offers a clear control only once there is a term, and it empties the field', async () => {
  const change = jest.fn()
  const view = await render(
    <SearchField value="" onChangeText={change} placeholder="Buscar lugares" />
  )
  expect(view.getByLabelText('Buscar lugares')).toBeOnTheScreen()
  expect(view.queryByRole('button', { name: 'Limpar busca' })).toBeNull()
  await view.rerender(
    <SearchField value="café" onChangeText={change} placeholder="Buscar lugares" />
  )
  await fireEvent.press(view.getByRole('button', { name: 'Limpar busca' }))
  expect(change).toHaveBeenCalledWith('')
})

it.each(['light', 'dark'] as const)(
  'paints the header band on chrome and reserves the status bar in %s',
  async (mode) => {
    theme.useColors.mockReturnValue(palette[mode])
    const view = await render(<ScreenHeader title="Carteira" subtitle="Seus benefícios" />)
    const band = view.getByTestId('screen-header')
    expect(band).toHaveStyle({
      backgroundColor: palette[mode].chrome,
      borderBottomLeftRadius: radius.sheet,
    })
    expect(StyleSheet.flatten(band.props.style).paddingTop).toBeGreaterThan(24)
    expect(view.getByRole('header', { name: 'Carteira' })).toHaveStyle({
      color: palette[mode].chromeForeground,
    })
  }
)

it('gives a section a header and its action a 44-unit target', async () => {
  const press = jest.fn()
  const view = await render(
    <SectionHeader
      title="Lugares em Londrina"
      hint="2 lugares"
      action={{ label: 'Ver no mapa', onPress: press }}
    />
  )
  expect(view.getByRole('header', { name: 'Lugares em Londrina' })).toBeOnTheScreen()
  const action = view.getByRole('button', { name: 'Ver no mapa' })
  expect(action).toHaveStyle({ minHeight: minTouch })
  await fireEvent.press(action)
  expect(press).toHaveBeenCalled()
})

it('keeps compact cards the same size whether the title wraps or not', async () => {
  await setFontScale(1)
  const view = await render(
    <>
      <CompactCard title="Café" onPress={jest.fn()} testID="short" />
      <CompactCard
        title="Uma experiência com um nome longo demais para uma linha só"
        meta="Centro"
        onPress={jest.fn()}
        testID="long"
      />
    </>
  )
  for (const id of ['short', 'long']) {
    expect(view.getByTestId(id)).toHaveStyle({
      width: COMPACT_CARD.width,
      minHeight: COMPACT_CARD.height,
    })
  }
  expect(
    view.getByText('Uma experiência com um nome longo demais para uma linha só').props.numberOfLines
  ).toBe(2)
})

it.each([
  [1, 220],
  [1.3, 286],
  [2, 352],
])(
  'widens every compact card of a row with the text, so a word fits a line (scale %s)',
  async (scale, width) => {
    await setFontScale(scale)
    const view = await render(
      <>
        <CompactCard title="Café" onPress={jest.fn()} testID="short" />
        <CompactCard title="Oficina — demonstração" onPress={jest.fn()} testID="long" />
      </>
    )
    expect(view.getByTestId('short')).toHaveStyle({ width })
    expect(view.getByTestId('long')).toHaveStyle({ width })
  }
)

// At 200% a two-line cut hides most of a name: the card grows instead (a floor, not a box).
it('lets a compact card grow instead of cutting its words at large text', async () => {
  const view = await render(
    <CompactCard
      overline="Experiência"
      title="Uma experiência com um nome longo demais para uma linha só"
      meta="Centro"
      onPress={jest.fn()}
      testID="long"
    />
  )
  for (const text of [
    'Experiência',
    'Uma experiência com um nome longo demais para uma linha só',
    'Centro',
  ]) {
    expect(view.getByText(text).props.numberOfLines).toBeUndefined()
  }
  expect(StyleSheet.flatten(view.getByTestId('long').props.style).height).toBeUndefined()
})

it.each([
  [1, 1],
  [2, undefined],
] as const)(
  'keeps a button label on one line only at the drawn size (scale %s)',
  async (scale, lines) => {
    await setFontScale(scale)
    const view = await render(<Button label="Ir para o pagamento" onPress={jest.fn()} />)
    expect(view.getByText('Ir para o pagamento').props.numberOfLines).toBe(lines)
  }
)

it('reads a date tile in the city time zone and names the whole date', async () => {
  // 02:30 UTC on the 29th is still the 28th in São Paulo.
  const view = await render(<DateTile iso="2026-09-29T02:30:00Z" timeZone="America/Sao_Paulo" />)
  expect(view.getByText('28')).toBeOnTheScreen()
  expect(view.getByTestId('date-tile').props.accessibilityLabel).toMatch(/28 de setembro/)
  // Its size is a floor, so a larger day and month grow the tile instead of spilling out.
  const tile = StyleSheet.flatten(view.getByTestId('date-tile').props.style)
  expect(tile).toMatchObject({ minHeight: 72, minWidth: 64 })
  expect(tile.height).toBeUndefined()
  expect(tile.width).toBeUndefined()
})

it.each(['success', 'warning', 'info', 'neutral', 'benefit'] as const)(
  'gives the %s badge a pill with its own readable pair',
  async (tone) => {
    const view = await render(<Badge label="Estado" tone={tone} testID="badge" />)
    expect(view.getByTestId('badge')).toHaveStyle({ borderRadius: radius.pill, minHeight: 30 })
    expect(view.getByText('Estado')).toBeOnTheScreen()
  }
)

it.each(['light', 'dark'] as const)(
  'edges every badge, so a neutral pill still reads as one on a card of its colour in %s',
  async (mode) => {
    theme.useColors.mockReturnValue(palette[mode])
    const view = await render(<Badge label="Pedido não concluído" tone="neutral" testID="badge" />)
    expect(view.getByTestId('badge')).toHaveStyle({
      backgroundColor: palette[mode].statusNeutral,
      borderColor: palette[mode].statusNeutralBorder,
      borderWidth: 1,
    })
    // In dark the neutral fill is the card itself; the edge is what draws the pill.
    if (mode === 'dark') expect(palette.dark.statusNeutral).toBe(palette.dark.card)
    expect(palette[mode].statusNeutralBorder).not.toBe(palette[mode].card)
  }
)

it.each(['light', 'dark'] as const)(
  'fills a strong date tile apart from the soft plane a card without a photo lays behind it, in %s',
  async (mode) => {
    theme.useColors.mockReturnValue(palette[mode])
    const view = await render(
      <DateTile iso="2026-09-29T02:30:00Z" timeZone="America/Sao_Paulo" tone="strong" />
    )
    const tile = StyleSheet.flatten(view.getByTestId('date-tile').props.style)
    expect(tile.backgroundColor).toBe(palette[mode].primary)
    expect(tile.backgroundColor).not.toBe(palette[mode].primarySoft)
    expect(view.getByText('28')).toHaveStyle({ color: palette[mode].primaryForeground })
  }
)

it('keeps a fallback behind a compact card without a photo', async () => {
  const view = await render(
    <CompactCard
      title="Sem foto"
      media={<Text>28</Text>}
      accessibilityLabel="Evento, Sem foto, 28 de setembro"
      onPress={jest.fn()}
    />
  )
  // Drawn for the eye; the card's own label is what a screen reader hears.
  expect(view.getByText('28', { includeHiddenElements: true })).toBeOnTheScreen()
  expect(view.queryByText('28')).toBeNull()
  expect(view.getByRole('button', { name: 'Evento, Sem foto, 28 de setembro' })).toBeOnTheScreen()
})

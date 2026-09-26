import { fireEvent, render } from '@testing-library/react-native'
import { StyleSheet, Text } from 'react-native'

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

describe('Button', () => {
  it.each([
    ['primary', 'primary', 'primaryForeground'],
    ['cta', 'cta', 'ctaForeground'],
  ] as const)('fills the %s variant with its role and keeps the pill', async (variant, fill, text) => {
    const press = jest.fn()
    const view = await render(<Button label="Continuar" variant={variant} size={52} onPress={press} />)
    const button = view.getByRole('button', { name: 'Continuar' })
    expect(button).toHaveStyle({ minHeight: 52, borderRadius: radius.pill, backgroundColor: palette.light[fill] })
    expect(view.getByText('Continuar')).toHaveStyle({ color: palette.light[text] })
    await fireEvent.press(button)
    expect(press).toHaveBeenCalledTimes(1)
  })

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
  const view = await render(<IconButton icon="heart-outline" accessibilityLabel="Favoritar Ateliê" onPress={jest.fn()} />)
  expect(view.getByRole('button', { name: 'Favoritar Ateliê' })).toHaveStyle({ width: minTouch, height: minTouch, borderRadius: radius.pill })
})

it('offers a clear control only once there is a term, and it empties the field', async () => {
  const change = jest.fn()
  const view = await render(<SearchField value="" onChangeText={change} placeholder="Buscar lugares" />)
  expect(view.getByLabelText('Buscar lugares')).toBeOnTheScreen()
  expect(view.queryByRole('button', { name: 'Limpar busca' })).toBeNull()
  await view.rerender(<SearchField value="café" onChangeText={change} placeholder="Buscar lugares" />)
  await fireEvent.press(view.getByRole('button', { name: 'Limpar busca' }))
  expect(change).toHaveBeenCalledWith('')
})

it.each(['light', 'dark'] as const)('paints the header band on chrome and reserves the status bar in %s', async (mode) => {
  theme.useColors.mockReturnValue(palette[mode])
  const view = await render(<ScreenHeader title="Carteira" subtitle="Seus benefícios" />)
  const band = view.getByTestId('screen-header')
  expect(band).toHaveStyle({ backgroundColor: palette[mode].chrome, borderBottomLeftRadius: radius.sheet })
  expect(StyleSheet.flatten(band.props.style).paddingTop).toBeGreaterThan(24)
  expect(view.getByRole('header', { name: 'Carteira' })).toHaveStyle({ color: palette[mode].chromeForeground })
})

it('gives a section a header and its action a 44-unit target', async () => {
  const press = jest.fn()
  const view = await render(<SectionHeader title="Lugares em Londrina" hint="2 lugares" action={{ label: 'Ver no mapa', onPress: press }} />)
  expect(view.getByRole('header', { name: 'Lugares em Londrina' })).toBeOnTheScreen()
  const action = view.getByRole('button', { name: 'Ver no mapa' })
  expect(action).toHaveStyle({ minHeight: minTouch })
  await fireEvent.press(action)
  expect(press).toHaveBeenCalled()
})

it('keeps compact cards the same size whether the title wraps or not', async () => {
  const view = await render(<>
    <CompactCard title="Café" onPress={jest.fn()} testID="short" />
    <CompactCard title="Uma experiência com um nome longo demais para uma linha só" meta="Centro" onPress={jest.fn()} testID="long" />
  </>)
  for (const id of ['short', 'long']) {
    expect(view.getByTestId(id)).toHaveStyle({ width: COMPACT_CARD.width, height: COMPACT_CARD.height })
  }
  expect(view.getByText('Uma experiência com um nome longo demais para uma linha só').props.numberOfLines).toBe(2)
})

it('reads a date tile in the city time zone and names the whole date', async () => {
  // 02:30 UTC on the 29th is still the 28th in São Paulo.
  const view = await render(<DateTile iso="2026-09-29T02:30:00Z" timeZone="America/Sao_Paulo" />)
  expect(view.getByText('28')).toBeOnTheScreen()
  expect(view.getByTestId('date-tile').props.accessibilityLabel).toMatch(/28 de setembro/)
})

it.each(['success', 'warning', 'info', 'neutral', 'benefit'] as const)('gives the %s badge a pill with its own readable pair', async (tone) => {
  const view = await render(<Badge label="Estado" tone={tone} testID="badge" />)
  expect(view.getByTestId('badge')).toHaveStyle({ borderRadius: radius.pill, minHeight: 30 })
  expect(view.getByText('Estado')).toBeOnTheScreen()
})

it('keeps a fallback behind a compact card without a photo', async () => {
  const view = await render(<CompactCard title="Sem foto" media={<Text>28</Text>} onPress={jest.fn()} />)
  expect(view.getByText('28')).toBeOnTheScreen()
})

import { fireEvent, render } from '@testing-library/react-native'
import { useState } from 'react'
import { StyleSheet } from 'react-native'

import { Chip } from '@/components/chip'
import { ChoiceControl } from '@/components/choice-control'
import { palette, radius, fontFamilies } from '@/theme/tokens'

jest.mock('@/theme/use-colors', () => ({ useColors: jest.fn() }))

it.each(['light', 'dark'] as const)('marks selection without relying on color or moving the label in %s', async (mode) => {
  jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette[mode])
  const changed = jest.fn()
  function Filter() {
    const [selected, setSelected] = useState(false)
    return <Chip label="Wi-Fi" selected={selected} onPress={() => { changed(); setSelected(!selected) }} />
  }
  const view = await render(<Filter />)
  const target = view.getByRole('button', { name: 'Wi-Fi', selected: false })
  // Direction A: a 44-unit pill, no hit slop to borrow from its neighbours.
  expect(target).toHaveStyle({ minWidth: 44, minHeight: 44, borderRadius: radius.pill, flexDirection: 'row',
    borderWidth: 1.5, borderColor: palette[mode].choiceBorder, backgroundColor: palette[mode].card })
  expect(view.getByText('Wi-Fi')).toHaveStyle({ color: palette[mode].foreground, fontFamily: fontFamilies.text[500] })
  expect(target.props.hitSlop).toBeUndefined()
  const initialStyle = StyleSheet.flatten(target.props.style)
  const slot = target.children[0] as Exclude<typeof target.children[number], string>
  expect(slot).toHaveStyle({ width: 16 })
  const geometry = StyleSheet.flatten(slot.props.style)
  expect(view.queryByText('✓', { includeHiddenElements: true })).toBeNull()

  await fireEvent.press(target)
  expect(view.getByRole('button', { name: 'Wi-Fi', selected: true })).toBeOnTheScreen()
  // On: the brand fills the pill; the border width stays, so nothing moves.
  expect(view.getByRole('button', { name: 'Wi-Fi' })).toHaveStyle({
    borderWidth: 1.5, borderColor: palette[mode].primary, backgroundColor: palette[mode].primary,
  })
  const selectedStyle = StyleSheet.flatten(view.getByRole('button', { name: 'Wi-Fi' }).props.style)
  expect([selectedStyle.paddingLeft, selectedStyle.paddingRight]).toEqual([initialStyle.paddingLeft, initialStyle.paddingRight])
  expect(view.getByText('Wi-Fi')).toHaveStyle({ color: palette[mode].primaryForeground, fontFamily: fontFamilies.text[700] })
  const indicator = view.getByText('✓', { includeHiddenElements: true }).parent!
  expect(StyleSheet.flatten(indicator.props.style)).toEqual(geometry)
  expect(indicator.props.accessibilityElementsHidden).toBe(true)
  expect(indicator.props.importantForAccessibility).toBe('no-hide-descendants')
  expect(changed).toHaveBeenCalledTimes(1)

  await fireEvent.press(view.getByRole('button', { name: 'Wi-Fi' }))
  expect(view.getByRole('button', { name: 'Wi-Fi', selected: false })).toBeOnTheScreen()
  expect(view.queryByText('✓', { includeHiddenElements: true })).toBeNull()
})

it.each(['light', 'dark'] as const)('keeps a selected filter readable in %s', (mode) => {
  expect(contrastOf(palette[mode].primaryForeground, palette[mode].primary)).toBeGreaterThanOrEqual(4.5)
})

function contrastOf(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, b2] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b2
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}


it('keeps standalone purchase choices at 48 units without overlapping hit slop', async () => {
  jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette.light)
  const view = await render(<ChoiceControl label="Condições" shape="segment" onPress={() => {}} />)
  const target = view.getByRole('button', { name: 'Condições' })
  expect(target).toHaveStyle({ minHeight: 48 })
  expect(target.props.hitSlop).toBeUndefined()
})

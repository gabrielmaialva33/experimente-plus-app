import { fireEvent, render } from '@testing-library/react-native'
import { useState } from 'react'
import { StyleSheet } from 'react-native'

import { Chip } from '@/components/chip'
import { ChoiceControl } from '@/components/choice-control'
import { palette, radius } from '@/theme/tokens'

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
  expect(target).toHaveStyle({ minWidth: 48, minHeight: 40, borderRadius: radius.pill, flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth, borderColor: palette[mode].choiceBorder, backgroundColor: palette[mode].choiceBackground })
  expect(view.getByText('Wi-Fi')).toHaveStyle({ color: palette[mode].choiceForeground, fontWeight: '500' })
  expect(target.props.hitSlop).toEqual({ top: 4, bottom: 4 })
  const initialStyle = StyleSheet.flatten(target.props.style)
  expect(initialStyle.minHeight + target.props.hitSlop.top + target.props.hitSlop.bottom).toBe(48)
  const initialInset = initialStyle.paddingHorizontal + initialStyle.borderWidth
  expect(initialInset).toBe(8)
  const slot = target.children[0] as Exclude<typeof target.children[number], string>
  expect(slot).toHaveStyle({ width: 16 })
  const geometry = StyleSheet.flatten(slot.props.style)
  expect(view.queryByText('✓', { includeHiddenElements: true })).toBeNull()

  await fireEvent.press(target)
  expect(view.getByRole('button', { name: 'Wi-Fi', selected: true })).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Wi-Fi' })).toHaveStyle({
    borderWidth: 2, borderColor: palette[mode].choiceSelectedBorder, backgroundColor: palette[mode].choiceSelected,
  })
  const selectedStyle = StyleSheet.flatten(view.getByRole('button', { name: 'Wi-Fi' }).props.style)
  expect(selectedStyle.paddingHorizontal + selectedStyle.borderWidth).toBe(initialInset)
  expect(view.getByText('Wi-Fi')).toHaveStyle({ color: palette[mode].choiceSelectedForeground, fontWeight: '700' })
  const indicator = view.getByText('✓', { includeHiddenElements: true }).parent!
  expect(StyleSheet.flatten(indicator.props.style)).toEqual(geometry)
  expect(indicator.props.accessibilityElementsHidden).toBe(true)
  expect(indicator.props.importantForAccessibility).toBe('no-hide-descendants')
  expect(changed).toHaveBeenCalledTimes(1)

  await fireEvent.press(view.getByRole('button', { name: 'Wi-Fi' }))
  expect(view.getByRole('button', { name: 'Wi-Fi', selected: false })).toBeOnTheScreen()
  expect(view.queryByText('✓', { includeHiddenElements: true })).toBeNull()
})


it('keeps standalone purchase choices at 48 units without overlapping hit slop', async () => {
  jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette.light)
  const view = await render(<ChoiceControl label="Condições" shape="segment" onPress={() => {}} />)
  const target = view.getByRole('button', { name: 'Condições' })
  expect(target).toHaveStyle({ minHeight: 48 })
  expect(target.props.hitSlop).toBeUndefined()
})

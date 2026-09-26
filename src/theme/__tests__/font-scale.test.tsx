import { act, render } from '@testing-library/react-native'
import { Dimensions, Text } from 'react-native'

import { useLineCap } from '@/theme/font-scale'

/** The system text size; React Native's Jest setup reports 2 (200%). */
const setFontScale = (fontScale: number) =>
  act(() =>
    Dimensions.set({
      window: { ...Dimensions.get('window'), fontScale },
      screen: { ...Dimensions.get('screen'), fontScale },
    })
  )
afterEach(() => setFontScale(2))

function Name({ lines }: { lines: number }) {
  return (
    <Text testID="name" numberOfLines={useLineCap(lines)}>
      Café da Praça
    </Text>
  )
}

it.each([
  [0.85, 2],
  [1, 2],
  [1.15, undefined],
  [2, undefined],
  [3.1, undefined],
])(
  'caps at the drawn size and lifts the cap once text is larger (scale %s)',
  async (scale, cap) => {
    await setFontScale(scale)
    const view = await render(<Name lines={2} />)
    expect(view.getByTestId('name').props.numberOfLines).toBe(cap)
  }
)

it('follows a change of the system text size while the screen is open', async () => {
  await setFontScale(1)
  const view = await render(<Name lines={1} />)
  expect(view.getByTestId('name').props.numberOfLines).toBe(1)
  await setFontScale(1.3)
  expect(view.getByTestId('name').props.numberOfLines).toBeUndefined()
})

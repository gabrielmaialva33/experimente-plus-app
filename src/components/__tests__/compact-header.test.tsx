import { fireEvent, render } from '@testing-library/react-native'
import { View } from 'react-native'
import Animated from 'react-native-reanimated'

import { hiddenFromAccessibility, useCompactHeader } from '@/components/compact-header'

function Page({
  from,
  to,
  onRender,
}: {
  from: number
  to: number
  onRender: (compact: boolean) => void
}) {
  const header = useCompactHeader(from, to)
  onRender(header.compact)
  return (
    <Animated.ScrollView testID="page" onScroll={header.onScroll} scrollEventThrottle={16}>
      <View style={{ height: 2000 }} />
    </Animated.ScrollView>
  )
}

const scrollThrough = async (view: Awaited<ReturnType<typeof render>>, offsets: number[]) => {
  for (const y of offsets) {
    await fireEvent.scroll(view.getByTestId('page'), {
      nativeEvent: { contentOffset: { x: 0, y } },
    })
  }
}

// The drawing follows every frame on the UI thread; React hears about the scroll
// only when it crosses the middle of the range, once each way.
it('re-renders the screen only when the offset crosses the middle of the range', async () => {
  const renders: boolean[] = []
  const view = await render(
    <Page from={100} to={200} onRender={(compact) => renders.push(compact)} />
  )

  await scrollThrough(view, [10, 60, 120, 149])
  expect(renders).toEqual([false])
  await scrollThrough(view, [150, 170, 260, 900])
  expect(renders).toEqual([false, true])
  await scrollThrough(view, [149, 40, 0])
  expect(renders).toEqual([false, true, false])
})

it('follows a range that moves with layout', async () => {
  const renders: boolean[] = []
  const onRender = (compact: boolean) => renders.push(compact)
  const view = await render(<Page from={100} to={200} onRender={onRender} />)
  await view.rerender(<Page from={300} to={400} onRender={onRender} />)
  renders.length = 0

  await scrollThrough(view, [200, 349])
  expect(renders).toEqual([])
  await scrollThrough(view, [350])
  expect(renders).toEqual([true])
})

it('hides a set from screen readers on both platforms, or exposes it plainly', () => {
  expect(hiddenFromAccessibility(true)).toEqual({
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants',
  })
  expect(hiddenFromAccessibility(false)).toEqual({
    accessibilityElementsHidden: false,
    importantForAccessibility: 'auto',
  })
})

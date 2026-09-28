import { act, render, renderHook } from '@testing-library/react-native'
import { Dimensions, Text } from 'react-native'

import {
  ContentFrameProvider,
  MEASURE,
  cardGrid,
  contentFrame,
  feedLayout,
  gridColumns,
  useCardGrid,
  useContentFrame,
  useFeedLayout,
  useScreenFrame,
} from '@/components/content-frame'
import { spacing } from '@/theme/tokens'

/** The windows of the device matrix, in dp: width at the system's text size. */
const PHONE_SMALL = 360
const PHONE = 411
const FOLDABLE = 673
const TABLET = 800
const TABLET_LANDSCAPE = 1280

describe('contentFrame', () => {
  it('leaves a phone its gutters, as direction A was drawn', () => {
    expect(contentFrame(PHONE, MEASURE.readable)).toEqual({
      left: spacing.gutter,
      right: spacing.gutter,
      width: PHONE - 2 * spacing.gutter,
      padding: { paddingLeft: spacing.gutter, paddingRight: spacing.gutter },
    })
  })

  it.each([
    [FOLDABLE, 36, 37],
    [TABLET, 100, 100],
    [TABLET_LANDSCAPE, 340, 340],
  ])('centres a readable column in a %s dp window', (width, left, right) => {
    const frame = contentFrame(width, MEASURE.readable)
    expect(frame.width).toBe(MEASURE.readable)
    expect([frame.left, frame.right]).toEqual([left, right])
  })

  it('keeps the column clear of a cutout at the side, gutter included', () => {
    // A foldable held on its side: the camera cuts 72 dp into the left edge.
    const frame = contentFrame(700, MEASURE.readable, { left: 72, right: 0 })
    expect(frame.left).toBe(72 + spacing.gutter)
    expect(frame.right).toBe(50)
    expect(frame.left + frame.width + frame.right).toBe(700)
  })

  it('takes a gutter of its own, such as none for a sheet', () => {
    expect(contentFrame(PHONE, 640, undefined, 0)).toMatchObject({
      left: 0,
      width: PHONE,
    })
  })
})

describe('the grid of place cards', () => {
  it('counts the columns that fit at their minimum width', () => {
    expect(gridColumns(371, 300, 16)).toBe(1)
    expect(gridColumns(616, 300, 16)).toBe(2)
    expect(gridColumns(615, 300, 16)).toBe(1)
    expect(gridColumns(0, 300, 16)).toBe(1)
  })

  it.each([
    [PHONE_SMALL, 1, 1],
    [PHONE, 1, 1],
    [FOLDABLE, 1, 2],
    [TABLET, 1, 2],
    [TABLET_LANDSCAPE, 1, 3],
    [FOLDABLE, 1.3, 1],
    [TABLET, 2, 1],
    [TABLET_LANDSCAPE, 2, 2],
  ])('lays a %s dp window at %sx text in %s column(s)', (width, fontScale, columns) => {
    const layout = feedLayout(width, fontScale)
    expect(layout.columns).toBe(columns)
    // The columns and their gaps never run past the frame.
    expect(
      layout.columns * layout.columnWidth + (layout.columns - 1) * spacing.lg
    ).toBeLessThanOrEqual(layout.frame.width)
  })

  it('keeps a card of the grid about as wide as the card on a phone', () => {
    const phoneCard = feedLayout(PHONE, 1).columnWidth
    for (const width of [TABLET, TABLET_LANDSCAPE]) {
      const { columnWidth } = feedLayout(width, 1)
      expect(Math.abs(columnWidth - phoneCard)).toBeLessThan(40)
    }
  })

  it('falls back to the readable column when only one card fits', () => {
    // At 200% a tablet in portrait shows one column: a line, not a 760 dp banner.
    expect(feedLayout(TABLET, 2).frame).toEqual(contentFrame(TABLET, MEASURE.readable))
    expect(feedLayout(TABLET_LANDSCAPE, 1).frame).toEqual(
      contentFrame(TABLET_LANDSCAPE, MEASURE.feed)
    )
  })

  it('lays the same grid for any column it is given', () => {
    expect(cardGrid(760, 1)).toEqual({ columns: 2, columnWidth: 372 })
    expect(cardGrid(371, 1)).toEqual({ columns: 1, columnWidth: 371 })
  })
})

describe('useScreenFrame', () => {
  function Probe() {
    const { left, width } = useScreenFrame()
    return <Text testID="frame">{`${left}/${width}`}</Text>
  }

  it('gives a piece the column its screen provides', async () => {
    const frame = contentFrame(TABLET_LANDSCAPE, MEASURE.feed)
    const view = await render(
      <ContentFrameProvider frame={frame}>
        <Probe />
      </ContentFrameProvider>
    )
    expect(view.getByTestId('frame')).toHaveTextContent(`${frame.left}/${frame.width}`)
  })

  it('gives the readable column where the screen provides none', async () => {
    const { width } = Dimensions.get('window')
    const frame = contentFrame(width, MEASURE.readable)
    const view = await render(<Probe />)
    expect(view.getByTestId('frame')).toHaveTextContent(`${frame.left}/${frame.width}`)
  })
})

// The frames go into styles, a context value and effect dependencies: a new
// object on every render undid the memoization of everything downstream.
describe('frame hooks', () => {
  const initial = { window: Dimensions.get('window'), screen: Dimensions.get('screen') }
  afterEach(() => act(() => Dimensions.set(initial)))

  const resize = (width: number) =>
    act(() =>
      Dimensions.set({ window: { ...initial.window, width }, screen: { ...initial.screen, width } })
    )

  it.each([
    ['useContentFrame', useContentFrame],
    ['useFeedLayout', useFeedLayout],
    ['useCardGrid', useCardGrid],
  ])('%s keeps the same value while the window stays the same', async (_, useFrame) => {
    const { result, rerender } = await renderHook(() => useFrame())
    const first = result.current
    await rerender({})
    await rerender({})
    expect(result.current).toBe(first)
  })

  it('makes a new content frame, and only then, when the window changes', async () => {
    const { result, rerender } = await renderHook(() => useContentFrame())
    const phone = result.current
    await resize(TABLET_LANDSCAPE)
    expect(result.current).not.toBe(phone)
    expect(result.current).toEqual(contentFrame(TABLET_LANDSCAPE, MEASURE.readable))
    const tablet = result.current
    await rerender({})
    expect(result.current).toBe(tablet)
  })

  it('lays the feed again, frame included, when the window changes', async () => {
    const { result } = await renderHook(() => useFeedLayout())
    const phone = result.current
    await resize(TABLET_LANDSCAPE)
    const { fontScale } = Dimensions.get('window')
    expect(result.current).toEqual(feedLayout(TABLET_LANDSCAPE, fontScale))
    expect(result.current.frame).not.toBe(phone.frame)
  })
})

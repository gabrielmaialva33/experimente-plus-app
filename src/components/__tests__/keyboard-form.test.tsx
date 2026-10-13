import { act, fireEvent, render } from '@testing-library/react-native'
import { useEffect, useState } from 'react'
import { Keyboard, Platform, Pressable, Text, TextInput, View } from 'react-native'

import {
  KeyboardForm,
  RevealScrollFrame,
  hiddenUnderKeyboard,
  keyboardOverlap,
  revealOffset,
  useKeyboardForm,
  useKeyboardList,
  useRevealOnOpen,
  useScrollReveal,
  type KeyboardFormController,
  type KeyboardListController,
  type ScrollRevealController,
} from '@/components/keyboard-form'

/** Lets the frame that `requestAnimationFrame` waits for go by. */
const nextFrame = () => act(async () => new Promise((resolve) => setTimeout(resolve, 50)))

describe('keyboardOverlap', () => {
  it('measures only the part of the view under the keyboard', () => {
    expect(keyboardOverlap(100, 700, 500)).toBe(300)
    expect(keyboardOverlap(100, 300, 500)).toBe(0)
  })
})

describe('revealOffset', () => {
  const frame = { fieldHeight: 48, viewportHeight: 700, covered: 300 }

  it('scrolls a field hidden under the keyboard up into the visible part', () => {
    expect(revealOffset({ ...frame, fieldY: 900, scrollY: 0 })).toBe(900 + 48 + 24 - 400)
  })

  it('scrolls back down to a field above the visible part', () => {
    expect(revealOffset({ ...frame, fieldY: 100, scrollY: 400 })).toBe(76)
  })

  it('leaves a field that is already in sight', () => {
    expect(revealOffset({ ...frame, fieldY: 200, scrollY: 0 })).toBeNull()
  })
})

it('makes room for the keyboard and brings the focused field into view', async () => {
  const listeners: Record<string, (event: { endCoordinates: { screenY: number } }) => void> = {}
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, handler) => {
    listeners[event] = handler as (event: { endCoordinates: { screenY: number } }) => void
    return { remove: jest.fn() } as unknown as ReturnType<typeof Keyboard.addListener>
  })
  jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue({
    measureLayout: (
      _host: unknown,
      onSuccess: (x: number, y: number, w: number, h: number) => void
    ) => onSuccess(0, 900, 320, 48),
  } as unknown as ReturnType<typeof TextInput.State.currentlyFocusedInput>)

  let controller: KeyboardFormController | undefined
  function Probe() {
    const keyboard = useKeyboardForm()
    useEffect(() => {
      controller = keyboard
    })
    return null
  }

  await render(<Probe />)
  // The test renderer takes no measurements: hand the hook a window that has them.
  const scrollTo = jest.fn()
  controller!.scroll({ scrollTo } as never)
  controller!.content({} as never)
  controller!.container({
    measureInWindow: (callback: (x: number, y: number, w: number, h: number) => void) =>
      callback(0, 100, 390, 700),
  } as never)
  controller!.onLayout({
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 700 } },
  } as never)

  const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
  await act(async () => {
    listeners[show]({ endCoordinates: { screenY: 500 } })
    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  expect(controller!.inset).toBe(300)
  expect(scrollTo).toHaveBeenCalledWith({ y: 900 + 48 + 24 - 400, animated: true })
})

it('wraps its fields in one scroll that the keyboard can move', async () => {
  const view = await render(
    <KeyboardForm>
      <Text>Campo</Text>
    </KeyboardForm>
  )
  expect(view.getByTestId('keyboard-form')).toBeOnTheScreen()
})

describe('hiddenUnderKeyboard', () => {
  it('measures how far a field and its margin reach under the keyboard', () => {
    expect(hiddenUnderKeyboard(1900, 120, 1300)).toBe(1900 + 120 + 24 - 1300)
    expect(hiddenUnderKeyboard(400, 120, 1300)).toBe(0)
  })
})

// Explorar's feed holds the Concierge's field at its foot, under a keyboard that covered it.
it('lifts a field at the foot of a list above the keyboard, from where the list stands', async () => {
  const listeners: Record<string, (event: { endCoordinates: { screenY: number } }) => void> = {}
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, handler) => {
    listeners[event] = handler as (event: { endCoordinates: { screenY: number } }) => void
    return { remove: jest.fn() } as unknown as ReturnType<typeof Keyboard.addListener>
  })
  jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue({
    measureInWindow: (onSuccess: (x: number, y: number, w: number, h: number) => void) =>
      onSuccess(20, 1900, 350, 120),
  } as unknown as ReturnType<typeof TextInput.State.currentlyFocusedInput>)

  const scrollToOffset = jest.fn()
  let controller: KeyboardListController | undefined
  function Probe() {
    // The field's send button, 60 under it, rises with it.
    const keyboard = useKeyboardList(scrollToOffset, 60)
    useEffect(() => {
      controller = keyboard
    })
    return null
  }

  await render(<Probe />)
  controller!.container({
    measureInWindow: (callback: (x: number, y: number, w: number, h: number) => void) =>
      callback(0, 0, 390, 2100),
  } as never)
  controller!.onScroll({ nativeEvent: { contentOffset: { x: 0, y: 3000 } } } as never)

  const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
  const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
  await act(async () => {
    listeners[show]({ endCoordinates: { screenY: 1300 } })
    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  // Room for the rows under the keyboard, then the list moves by what the field hid.
  expect(controller!.inset).toBe(2100 - 1300)
  expect(scrollToOffset).toHaveBeenCalledWith(3000 + 1900 + 120 + 60 + 24 - 1300)

  await act(async () => listeners[hide]({ endCoordinates: { screenY: 2340 } }))
  expect(controller!.inset).toBe(0)
})

// The itinerary's delete question opened at the foot of the page, its buttons under the fold.
it('brings a block of the form whole into view, with no keyboard up', async () => {
  let controller: KeyboardFormController | undefined
  function Probe() {
    const keyboard = useKeyboardForm()
    useEffect(() => {
      controller = keyboard
    })
    return null
  }

  await render(<Probe />)
  const scrollTo = jest.fn()
  controller!.scroll({ scrollTo } as never)
  controller!.content({} as never)
  controller!.onLayout({
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 700 } },
  } as never)

  const block = (y: number) => ({
    measureLayout: (
      _host: unknown,
      onSuccess: (x: number, y: number, w: number, h: number) => void
    ) => onSuccess(0, y, 358, 180),
  })

  controller!.revealView(block(1500) as never)
  await nextFrame()
  expect(scrollTo).toHaveBeenCalledWith({ y: 1500 + 180 + 24 - 700, animated: true })

  // Already in sight: the page stays where the person left it.
  scrollTo.mockClear()
  controller!.revealView(block(200) as never)
  await nextFrame()
  expect(scrollTo).not.toHaveBeenCalled()
})

describe('useScrollReveal', () => {
  async function probe(scrollToOffset: jest.Mock) {
    let controller: ScrollRevealController | undefined
    function Probe() {
      const reveal = useScrollReveal(scrollToOffset)
      useEffect(() => {
        controller = reveal
      })
      return null
    }
    await render(<Probe />)
    // The list's frame: 700 tall, 80 from the top of the window, scrolled by 300.
    controller!.container({
      measureInWindow: (callback: (x: number, y: number, w: number, h: number) => void) =>
        callback(0, 80, 390, 700),
    } as never)
    controller!.onScroll({ nativeEvent: { contentOffset: { x: 0, y: 300 } } } as never)
    return controller!
  }

  const block = (top: number, height: number) =>
    ({
      measureInWindow: (callback: (x: number, y: number, w: number, h: number) => void) =>
        callback(16, top, 358, height),
    }) as never

  // A card's confirmation at the foot of a list of cards grew under the fold.
  it('scrolls a list by what of the block is below its frame', async () => {
    const scrollToOffset = jest.fn()
    const controller = await probe(scrollToOffset)

    controller.revealView(block(700, 200))
    await nextFrame()

    // 620 into the frame and 200 tall: 144 of it, margin included, is out of sight.
    expect(scrollToOffset).toHaveBeenCalledWith(300 + 700 - 80 + 200 + 24 - 700)
  })

  it('leaves a list alone when the block is already in sight', async () => {
    const scrollToOffset = jest.fn()
    const controller = await probe(scrollToOffset)

    controller.revealView(block(200, 200))
    await nextFrame()

    expect(scrollToOffset).not.toHaveBeenCalled()
  })
})

describe('useRevealOnOpen', () => {
  function Block({ testID }: { testID: string }) {
    const { block, onLayout } = useRevealOnOpen()
    return <View ref={block} onLayout={onLayout} testID={testID} />
  }

  function Page() {
    const [open, setOpen] = useState(true)
    return (
      <>
        <Pressable accessibilityRole="button" onPress={() => setOpen(!open)}>
          <Text>Alternar</Text>
        </Pressable>
        {open ? <Block testID="question" /> : null}
      </>
    )
  }

  const layout = (height: number) => ({
    nativeEvent: { layout: { x: 0, y: 900, width: 358, height } },
  })

  it('reveals the block when it opens and when it grows, not when it is only pushed', async () => {
    const revealView = jest.fn()
    const controller = { container: jest.fn(), onScroll: jest.fn(), revealView }
    const view = await render(
      <RevealScrollFrame controller={controller}>
        <Page />
      </RevealScrollFrame>
    )

    await fireEvent(view.getByTestId('question'), 'layout', layout(180))
    expect(revealView).toHaveBeenCalledTimes(1)
    expect(revealView.mock.calls[0][0]).not.toBeNull()

    // Something above moved it: same height, nothing to bring back.
    await fireEvent(view.getByTestId('question'), 'layout', layout(180))
    expect(revealView).toHaveBeenCalledTimes(1)

    // A failure appeared inside it: taller, so it comes back whole.
    await fireEvent(view.getByTestId('question'), 'layout', layout(240))
    expect(revealView).toHaveBeenCalledTimes(2)

    // Closed and opened again at the same height: a new opening, revealed again.
    await fireEvent.press(view.getByRole('button', { name: 'Alternar' }))
    await fireEvent.press(view.getByRole('button', { name: 'Alternar' }))
    await fireEvent(view.getByTestId('question'), 'layout', layout(240))
    expect(revealView).toHaveBeenCalledTimes(3)
  })
})

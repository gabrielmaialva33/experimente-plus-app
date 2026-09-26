import { act, render } from '@testing-library/react-native'
import { useEffect } from 'react'
import { Keyboard, Platform, Text, TextInput } from 'react-native'

import {
  KeyboardForm,
  keyboardOverlap,
  revealOffset,
  useKeyboardForm,
  type KeyboardFormController,
} from '@/components/keyboard-form'

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
    measureLayout: (_host: unknown, onSuccess: (x: number, y: number, w: number, h: number) => void) =>
      onSuccess(0, 900, 320, 48),
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
    measureInWindow: (callback: (x: number, y: number, w: number, h: number) => void) => callback(0, 100, 390, 700),
  } as never)
  controller!.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 700 } } } as never)

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

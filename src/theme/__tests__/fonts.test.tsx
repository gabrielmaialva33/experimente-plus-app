import { act, renderHook } from '@testing-library/react-native'

import { FONT_TIMEOUT_MS, fontSources, useFontsReady } from '@/theme/fonts'
import { fontFamilies } from '@/theme/tokens'

const mockUseFonts = jest.fn()
jest.mock('expo-font', () => ({ useFonts: (...args: unknown[]) => mockUseFonts(...args) }))

beforeEach(() => {
  jest.useFakeTimers()
  mockUseFonts.mockReset()
})
afterEach(() => jest.useRealTimers())

it('bundles exactly the faces the scale uses, one family name per weight', () => {
  expect(Object.keys(fontSources).sort()).toEqual(
    [...Object.values(fontFamilies.text), ...Object.values(fontFamilies.display)].sort()
  )
})

it('is ready once the faces load', async () => {
  mockUseFonts.mockReturnValue([true, null])
  const { result } = await renderHook(() => useFontsReady())
  expect(result.current).toBe(true)
})

it('does not keep the app behind the splash when the faces fail', async () => {
  mockUseFonts.mockReturnValue([false, new Error('font')])
  const { result } = await renderHook(() => useFontsReady())
  expect(result.current).toBe(true)
})

it('waits for the faces, then gives up after the timeout instead of blocking forever', async () => {
  mockUseFonts.mockReturnValue([false, null])
  const { result } = await renderHook(() => useFontsReady())
  expect(result.current).toBe(false)
  await act(async () => { jest.advanceTimersByTime(FONT_TIMEOUT_MS - 1) })
  expect(result.current).toBe(false)
  await act(async () => { jest.advanceTimersByTime(1) })
  expect(result.current).toBe(true)
})

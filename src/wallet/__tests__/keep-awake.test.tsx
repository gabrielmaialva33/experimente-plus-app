import { act, render } from '@testing-library/react-native'

import { PRESENTATION_AWAKE_TAG, useKeepAwakeWhileShown } from '../keep-awake'

const mockFocus = { current: true }
jest.mock('expo-router', () => ({ useIsFocused: () => mockFocus.current }))
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}))

const keepAwake = jest.requireMock('expo-keep-awake') as {
  activateKeepAwakeAsync: jest.Mock
  deactivateKeepAwake: jest.Mock
}

function Probe({ shown }: { shown: boolean }) {
  useKeepAwakeWhileShown(shown)
  return null
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFocus.current = true
})

it('holds the screen under its own tag while a code is shown, and lets go when it goes', async () => {
  const view = await render(<Probe shown />)
  expect(keepAwake.activateKeepAwakeAsync).toHaveBeenCalledTimes(1)
  expect(keepAwake.activateKeepAwakeAsync).toHaveBeenCalledWith(PRESENTATION_AWAKE_TAG)
  expect(keepAwake.deactivateKeepAwake).not.toHaveBeenCalled()

  await view.rerender(<Probe shown={false} />)
  expect(keepAwake.deactivateKeepAwake).toHaveBeenCalledTimes(1)
  expect(keepAwake.deactivateKeepAwake).toHaveBeenCalledWith(PRESENTATION_AWAKE_TAG)
  expect(keepAwake.activateKeepAwakeAsync).toHaveBeenCalledTimes(1)
})

it('never holds the screen while nothing is shown', async () => {
  const view = await render(<Probe shown={false} />)
  await view.unmount()
  expect(keepAwake.activateKeepAwakeAsync).not.toHaveBeenCalled()
  expect(keepAwake.deactivateKeepAwake).not.toHaveBeenCalled()
})

it('lets go when the screen loses focus and holds again when it is back in front', async () => {
  const view = await render(<Probe shown />)
  mockFocus.current = false
  await view.rerender(<Probe shown />)
  expect(keepAwake.deactivateKeepAwake).toHaveBeenCalledTimes(1)

  mockFocus.current = true
  await view.rerender(<Probe shown />)
  expect(keepAwake.activateKeepAwakeAsync).toHaveBeenCalledTimes(2)
  expect(keepAwake.deactivateKeepAwake).toHaveBeenCalledTimes(1)
})

it('lets go on unmount', async () => {
  const view = await render(<Probe shown />)
  await view.unmount()
  expect(keepAwake.deactivateKeepAwake).toHaveBeenCalledTimes(1)
  expect(keepAwake.deactivateKeepAwake).toHaveBeenCalledWith(PRESENTATION_AWAKE_TAG)
})

it('leaves the usual timeout, without an error, where the hold cannot be taken', async () => {
  keepAwake.activateKeepAwakeAsync.mockRejectedValueOnce(new Error('no activity'))
  keepAwake.deactivateKeepAwake.mockRejectedValueOnce(new Error('no activity'))
  const view = await render(<Probe shown />)
  // Both rejections are settled here; an unhandled one would fail the test run.
  await act(async () => {})
  await view.unmount()
  await act(async () => {})
  expect(keepAwake.deactivateKeepAwake).toHaveBeenCalledTimes(1)
})

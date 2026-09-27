import { act, render } from '@testing-library/react-native'

import {
  useBandStatusBar,
  useNavigationBarStyle,
  useStatusBarFollowsTheme,
} from '@/theme/system-bars'

const mockBar = { setStyle: jest.fn() }
const mockScheme = { current: 'light' as 'light' | 'dark' }
jest.mock('expo', () => ({ requireOptionalNativeModule: () => mockBar }))
jest.mock('expo-status-bar', () => ({ setStatusBarStyle: jest.fn() }))
// Each registered focus effect, so a test can focus and blur a screen by hand.
const mockFocus: (() => void | (() => void))[] = []
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    mockFocus.push(effect)
  },
}))
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockScheme.current,
}))

function Probe() {
  useNavigationBarStyle()
  return null
}

beforeEach(() => mockBar.setStyle.mockReset())

it('gives the Android navigation bar buttons that contrast with the theme', async () => {
  mockBar.setStyle.mockResolvedValue(undefined)
  const view = await render(<Probe />)
  expect(mockBar.setStyle).toHaveBeenLastCalledWith('dark')

  mockScheme.current = 'dark'
  await view.rerender(<Probe />)
  expect(mockBar.setStyle).toHaveBeenLastCalledWith('light')
  expect(mockBar.setStyle).toHaveBeenCalledTimes(2)
})

it('drops a call the activity can no longer take, instead of an uncaught error', async () => {
  const rejected = Promise.reject(new Error('The current activity is no longer available'))
  const caught = jest.spyOn(rejected, 'catch')
  mockBar.setStyle.mockReturnValue(rejected)
  mockScheme.current = 'light'
  await render(<Probe />)
  expect(caught).toHaveBeenCalled()
  await expect(rejected.catch(() => 'handled')).resolves.toBe('handled')
})

describe('status bar icons', () => {
  const statusBar = jest.requireMock('expo-status-bar') as { setStatusBarStyle: jest.Mock }
  function Band({ active = true }: { active?: boolean }) {
    useBandStatusBar(active)
    return null
  }
  function Root() {
    useStatusBarFollowsTheme()
    return null
  }
  beforeEach(() => {
    statusBar.setStatusBarStyle.mockReset()
    mockFocus.length = 0
  })

  it('keeps light icons while any band is in front, and follows the theme once none is', async () => {
    await render(
      <>
        <Band />
        <Band />
      </>
    )
    const [explorar, conta] = mockFocus
    let leaveExplorar: void | (() => void)
    let leaveConta: void | (() => void)
    await act(async () => {
      leaveExplorar = explorar()
    })
    expect(statusBar.setStatusBarStyle).toHaveBeenLastCalledWith('light')
    // The next tab gains focus before the previous one lets go: still light.
    await act(async () => {
      leaveConta = conta()
      if (leaveExplorar) leaveExplorar()
    })
    expect(statusBar.setStatusBarStyle).not.toHaveBeenCalledWith('auto')
    await act(async () => {
      if (leaveConta) leaveConta()
    })
    expect(statusBar.setStatusBarStyle).toHaveBeenLastCalledWith('auto')
  })

  it('asks nothing of a screen that draws no band (sign-in inside a purchase)', async () => {
    await render(<Band active={false} />)
    await act(async () => {
      mockFocus[0]()
    })
    expect(statusBar.setStatusBarStyle).not.toHaveBeenCalled()
  })

  it('re-reads the theme when it changes, unless a band is in front', async () => {
    mockScheme.current = 'dark'
    const view = await render(<Root />)
    statusBar.setStatusBarStyle.mockReset()
    mockScheme.current = 'light'
    await view.rerender(<Root />)
    expect(statusBar.setStatusBarStyle).toHaveBeenCalledWith('auto')

    await render(<Band />)
    let leave: void | (() => void)
    await act(async () => {
      leave = mockFocus[0]()
    })
    statusBar.setStatusBarStyle.mockReset()
    mockScheme.current = 'dark'
    await view.rerender(<Root />)
    expect(statusBar.setStatusBarStyle).not.toHaveBeenCalled()
    await act(async () => {
      if (leave) leave()
    })
  })
})

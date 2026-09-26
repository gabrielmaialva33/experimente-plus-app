import { render } from '@testing-library/react-native'

import { useNavigationBarStyle } from '@/theme/system-bars'

const mockBar = { setStyle: jest.fn() }
const mockScheme = { current: 'light' as 'light' | 'dark' }
jest.mock('expo', () => ({ requireOptionalNativeModule: () => mockBar }))
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

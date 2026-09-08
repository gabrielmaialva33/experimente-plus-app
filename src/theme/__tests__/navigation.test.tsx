import { render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'

import TabsLayout from '@/app/(tabs)/_layout'
import { palette } from '../tokens'

jest.mock('@/theme/use-colors', () => ({ useColors: jest.fn() }))
jest.mock('@/session/context', () => ({
  useSession: () => ({ status: 'authenticated' }),
  usePartnerAreas: () => ({ canValidate: false }),
}))
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('expo-router', () => {
  const { View } = jest.requireActual('react-native')
  const Tabs = Object.assign(jest.fn(({ screenOptions }: { screenOptions: { tabBarStyle: object } }) => (
    <View testID="tabs" style={screenOptions.tabBarStyle} />
  )), { Screen: () => null, Protected: () => null })
  return { Tabs }
})

it.each(['light', 'dark'] as const)('renders fixed mobile navigation on continuous E0 with a light separator in %s', async (mode) => {
  jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette[mode])
  const view = await render(<TabsLayout />)
  expect(view.getByTestId('tabs')).toHaveStyle({
    backgroundColor: palette[mode].surfaceBase,
    borderTopColor: palette[mode].border,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
  })
})

it.each(['light', 'dark'] as const)('keeps selection on the tab plane instead of painting a leaking highlight in %s', async (mode) => {
  jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette[mode])
  await render(<TabsLayout />)
  const calls = jest.requireMock('expo-router').Tabs.mock.calls
  const { screenOptions, children } = calls[calls.length - 1][0]
  expect(screenOptions.tabBarActiveBackgroundColor).toBe(palette[mode].surfaceBase)
  expect(screenOptions.tabBarInactiveBackgroundColor).toBe(palette[mode].surfaceBase)
  expect(screenOptions.tabBarActiveTintColor).toBe(palette[mode].primaryAccent)
  expect(screenOptions.tabBarInactiveTintColor).toBe(palette[mode].mutedForeground)
  const icon = children[0].props.options.tabBarIcon
  expect(icon({ color: palette[mode].primaryAccent, size: 24, focused: true }).props.name).toBe('compass')
  expect(icon({ color: palette[mode].mutedForeground, size: 24, focused: false }).props.name).toBe('compass-outline')
})

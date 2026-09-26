import { render } from '@testing-library/react-native'
import { Children, isValidElement, type ReactNode } from 'react'

import RootLayout from '@/app/_layout'

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 48, left: 0 }),
}))
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }))
jest.mock('@/theme/use-colors', () => ({ useColors: () => jest.requireActual('@/theme/tokens').palette.dark }))
jest.mock('@/api/query-client', () => ({
  createQueryClient: () => new (jest.requireActual('@tanstack/react-query').QueryClient)(),
  installQueryEnvironment: () => () => {},
}))
jest.mock('@/session/context', () => ({
  SessionProvider: ({ children }: { children: ReactNode }) => children,
  useSession: () => ({ status: 'anonymous' }),
}))
jest.mock('expo-router', () => {
  const Stack = Object.assign(jest.fn(() => null), { Screen: () => null })
  return {
    Stack,
    ThemeProvider: ({ children }: { children: ReactNode }) => children,
    DarkTheme: { colors: {} },
    DefaultTheme: { colors: {} },
  }
})

it('keeps pushed screens clear of the system navigation bar, and leaves the tab bar to the tabs', async () => {
  await render(<RootLayout />)
  const { Stack } = jest.requireMock('expo-router') as { Stack: jest.Mock }
  const { screenOptions, children } = Stack.mock.calls[Stack.mock.calls.length - 1][0]

  expect(screenOptions.contentStyle.paddingBottom).toBe(48)
  const tabs = Children.toArray(children).find(
    (child) => isValidElement<{ name: string }>(child) && child.props.name === '(tabs)'
  ) as { props: { options: { contentStyle: { paddingBottom: number } } } }
  expect(tabs.props.options.contentStyle.paddingBottom).toBe(0)
})

import { render } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Text } from 'react-native'

import RootLayout from '@/app/_layout'

const mockSession = { current: { status: 'loading' } }
const mockFontsReady = { current: false }
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }))
jest.mock('@/theme/fonts', () => ({ useFontsReady: () => mockFontsReady.current }))
jest.mock('@/theme/use-colors', () => ({ useColors: () => jest.requireActual('@/theme/tokens').palette.light }))
jest.mock('@/api/query-client', () => ({
  createQueryClient: () => new (jest.requireActual('@tanstack/react-query').QueryClient)(),
  installQueryEnvironment: () => () => {},
}))
jest.mock('@/session/cache-guard', () => ({ SessionCacheGuard: () => null }))
jest.mock('@/session/context', () => ({
  SessionProvider: ({ children }: { children: ReactNode }) => children,
  useSession: () => mockSession.current,
}))
jest.mock('expo-router', () => ({
  Stack: Object.assign(jest.fn(() => null), { Screen: () => null }),
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
  DarkTheme: { colors: {} },
  DefaultTheme: { colors: {} },
}))

const hideAsync = jest.requireMock('expo-splash-screen').hideAsync as jest.Mock

beforeEach(() => hideAsync.mockClear())

it.each([
  ['the session is still loading', 'loading', true],
  ['the faces are not ready', 'anonymous', false],
])('keeps the splash while %s', async (_, status, fontsReady) => {
  mockSession.current = { status }
  mockFontsReady.current = fontsReady
  await render(<RootLayout />)
  expect(hideAsync).not.toHaveBeenCalled()
})

it('lifts the splash once the session resolved and the faces are ready', async () => {
  mockSession.current = { status: 'anonymous' }
  mockFontsReady.current = true
  await render(<RootLayout />)
  expect(hideAsync).toHaveBeenCalled()
})

it('mounts each screen only once the faces are usable, inside a navigator that is already there', async () => {
  const { Stack } = jest.requireMock('expo-router') as { Stack: jest.Mock }
  const screen = <Text>Explorar</Text>
  mockSession.current = { status: 'anonymous' }

  mockFontsReady.current = false
  await render(<RootLayout />)
  const waiting = Stack.mock.calls[Stack.mock.calls.length - 1][0].screenLayout({ children: screen })
  expect(waiting).not.toBe(screen)
  expect((await render(waiting)).queryByText('Explorar')).toBeNull()

  mockFontsReady.current = true
  await render(<RootLayout />)
  expect(Stack.mock.calls[Stack.mock.calls.length - 1][0].screenLayout({ children: screen })).toBe(screen)
})

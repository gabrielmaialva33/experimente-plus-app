import { render } from '@testing-library/react-native'
import { Children, type ReactElement } from 'react'

import RootLayout from '@/app/_layout'
import TabsLayout from '@/app/(tabs)/_layout'
import WalletLayout from '@/app/(tabs)/wallet/_layout'
import { palette } from '../tokens'

jest.mock('@/theme/use-colors', () => ({ useColors: jest.fn() }))
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }))
jest.mock('@/api/query-client', () => ({ createQueryClient: jest.fn(), installQueryEnvironment: jest.fn() }))
jest.mock('@tanstack/react-query', () => ({ QueryClientProvider: ({ children }: { children: React.ReactNode }) => children }))
jest.mock('@/session/context', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSession: () => ({ status: 'authenticated' }),
  usePartnerAreas: () => ({ canValidate: false }),
}))
jest.mock('expo-router', () => {
  const navigator = () => Object.assign(jest.fn(() => null), { Screen: () => null, Protected: () => null })
  return {
    Stack: navigator(), Tabs: navigator(), DarkTheme: {}, DefaultTheme: {},
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  }
})

const screens = (children: React.ReactNode) => Children.toArray(children) as ReactElement<{
  name: string; options: Record<string, unknown>; children?: React.ReactNode
}>[]

it.each(['light', 'dark'] as const)('gives tabs and pushed routes one titled, opaque native bar in %s', async (mode) => {
  jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette[mode])
  const { Stack, Tabs } = jest.requireMock('expo-router')
  await render(<RootLayout />)
  const root = Stack.mock.calls.at(-1)[0]
  expect(root.screenOptions).toMatchObject({
    headerShown: true, headerTransparent: false, headerShadowVisible: false, headerTitleAlign: 'left',
    headerStyle: { backgroundColor: palette[mode].surfaceBase },
  })
  const rootScreens = screens(root.children)
  expect(rootScreens.find((screen) => screen.props.name === '(tabs)')?.props.options.headerShown).toBe(false)
  for (const screen of rootScreens.filter((screen) => screen.props.name !== '(tabs)')) {
    const effective = { ...root.screenOptions, ...screen.props.options }
    expect(effective.headerShown).toBe(true)
    expect(effective.title.trim().length).toBeGreaterThan(0)
    // Keep native back/gesture handling; no custom back overlay or replacement header.
    expect(effective.header).toBeUndefined()
    expect(effective.headerLeft).toBeUndefined()
    expect(effective.gestureEnabled).not.toBe(false)
  }
  expect(rootScreens.find((screen) => screen.props.name === 'estabelecimento/[city]/[slug]')?.props.options.title).toBe('Estabelecimento')

  await render(<TabsLayout />)
  const tabs = Tabs.mock.calls.at(-1)[0]
  for (const key of ['headerShown', 'headerTransparent', 'headerShadowVisible', 'headerStyle', 'headerTitleStyle', 'headerTitleAlign']) {
    expect(tabs.screenOptions[key]).toEqual(root.screenOptions[key])
  }
  const tabScreens = screens(tabs.children).flatMap((screen) => screen.props.name ? [screen] : screens(screen.props.children))
  expect(tabScreens.map((screen) => screen.props.options.title)).toEqual(['Explorar', 'Carteira', 'Validar', 'Conta', 'Entrar'])
  expect(tabScreens.find((screen) => screen.props.name === 'wallet')?.props.options.headerShown).toBe(false)

  await render(<WalletLayout />)
  const wallet = Stack.mock.calls.at(-1)[0]
  expect(wallet.screenOptions).toEqual(root.screenOptions)
  for (const screen of screens(wallet.children)) {
    const effective = { ...wallet.screenOptions, ...screen.props.options }
    expect(effective.headerShown).toBe(true)
    expect(effective.title.trim().length).toBeGreaterThan(0)
  }
  expect(screens(wallet.children)[0].props.options.title).toBe('Carteira')
})

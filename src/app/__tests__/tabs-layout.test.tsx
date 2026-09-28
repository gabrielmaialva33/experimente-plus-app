import { render } from '@testing-library/react-native'
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'

import TabsLayout from '@/app/(tabs)/_layout'

const mockSession = { status: 'loading', canValidate: false }

jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('@/session/context', () => ({
  useSession: () => ({ status: mockSession.status }),
  usePartnerAreas: () => ({ canValidate: mockSession.canValidate, canReadHistory: false }),
}))
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('expo-router', () => {
  const Tabs = Object.assign(
    jest.fn(() => null),
    {
      Screen: jest.fn(() => null),
      Protected: jest.fn(() => null),
    }
  )
  return { Tabs }
})

/** Which tabs the navigator would mount: every screen with the guard it sits under. */
async function tabsFor(status: string, canValidate = false) {
  mockSession.status = status
  mockSession.canValidate = canValidate
  await render(<TabsLayout />)
  const { Tabs } = jest.requireMock('expo-router') as { Tabs: jest.Mock & { Protected: unknown } }
  const { children } = Tabs.mock.calls[Tabs.mock.calls.length - 1][0] as { children: ReactNode }
  const mounted: string[] = []
  Children.forEach(children, (child) => {
    if (!isValidElement<{ name?: string; guard?: boolean; children?: ReactNode }>(child)) return
    if (child.type === Tabs.Protected) {
      if (!child.props.guard) return
      Children.forEach(child.props.children, (screen) => {
        mounted.push((screen as ReactElement<{ name: string }>).props.name)
      })
    } else {
      mounted.push(child.props.name as string)
    }
  })
  return mounted
}

beforeEach(() => jest.clearAllMocks())

/**
 * The tab set comes from the session and from server-granted capabilities
 * (ADR-0023 §2): a privileged area is never mounted before the context has
 * resolved, and never from `partner.enabled` alone.
 */
it.each(['loading', 'anonymous', 'unavailable'])(
  'offers a visitor’s tabs while the session is %s',
  async (status) => {
    expect(await tabsFor(status)).toEqual(['index', 'sign-in'])
  }
)

it('offers the consumer tabs once the context resolves', async () => {
  expect(await tabsFor('authenticated')).toEqual(['index', 'wallet', 'account'])
})

it('adds Validar only with the validate capability', async () => {
  expect(await tabsFor('authenticated', true)).toEqual(['index', 'wallet', 'validate', 'account'])
})

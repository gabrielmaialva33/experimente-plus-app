import { act, render } from '@testing-library/react-native'
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'

import TabsLayout from '@/app/(tabs)/_layout'
import { notifySessionEvent } from '@/api/session-events'
import { SessionProvider } from '@/session/context'

/**
 * The navigation composed from the real session provider, with the server
 * behind it mocked: what the person sees as the session answers, revalidates
 * and changes.
 */

jest.mock('@/api/session', () => ({
  readCredentials: jest.fn(),
  clearCredentials: jest.fn(),
  SessionExpiredError: class SessionExpiredError extends Error {},
}))
jest.mock('@/api/me', () => ({ getContext: jest.fn() }))
jest.mock('@/api/auth', () => ({ revokeSession: jest.fn() }))
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('expo-router', () => {
  const Tabs = Object.assign(
    jest.fn(() => null),
    { Screen: jest.fn(() => null), Protected: jest.fn(() => null) }
  )
  return { Tabs }
})

const session = jest.requireMock('@/api/session') as {
  readCredentials: jest.Mock
  clearCredentials: jest.Mock
}
const me = jest.requireMock('@/api/me') as { getContext: jest.Mock }

const partner = (validate: boolean) => ({
  user: { id: 1 },
  active_operation: { id: 7 },
  capabilities: { partner: { redemptions: { validate, read: true } } },
})

/** A context read that answers only when the test says so. */
function pendingContext() {
  let answer!: (context: unknown) => void
  let fail!: (error: unknown) => void
  me.getContext.mockImplementationOnce(
    () =>
      new Promise((resolve, reject) => {
        answer = resolve
        fail = reject
      })
  )
  return { answer: (context: unknown) => answer(context), fail: (error: unknown) => fail(error) }
}

/** The tabs the navigator would mount now: every screen whose guard lets it through. */
function mountedTabs() {
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

beforeEach(() => {
  jest.clearAllMocks()
  session.readCredentials.mockResolvedValue({
    accessToken: 'a',
    refreshToken: 'r',
    accessExpiresAt: Date.now() + 900_000,
  })
})

describe('tabs', () => {
  const renderTabs = () =>
    render(
      <SessionProvider>
        <TabsLayout />
      </SessionProvider>
    )

  // A refused request used to send the session back to `loading`: Carteira and
  // Conta disappeared, Entrar appeared and the person landed on Explorar.
  it('keeps the partner’s tabs while a 403 revalidates, then applies the new capabilities', async () => {
    me.getContext.mockResolvedValueOnce(partner(true))
    await renderTabs()
    expect(mountedTabs()).toEqual(['index', 'wallet', 'validate', 'account'])

    const reload = pendingContext()
    await act(async () => notifySessionEvent('context-invalidated'))
    expect(mountedTabs()).toEqual(['index', 'wallet', 'validate', 'account'])

    await act(async () => reload.answer(partner(false)))
    expect(mountedTabs()).toEqual(['index', 'wallet', 'account'])
    expect(session.clearCredentials).not.toHaveBeenCalled()
  })

  it('still ends the session when the revalidation finds the credential rejected', async () => {
    const { SessionExpiredError } = jest.requireMock('@/api/session') as {
      SessionExpiredError: new () => Error
    }
    me.getContext.mockResolvedValueOnce(partner(true))
    await renderTabs()

    const reload = pendingContext()
    await act(async () => notifySessionEvent('context-invalidated'))
    await act(async () => reload.fail(new SessionExpiredError()))
    expect(mountedTabs()).toEqual(['index', 'sign-in'])
  })
})

import { act, render } from '@testing-library/react-native'
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'

import TabsLayout from '@/app/(tabs)/_layout'
import RootLayout from '@/app/_layout'
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
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }))
jest.mock('@/theme/fonts', () => ({ useFontsReady: () => true }))
jest.mock('@/api/query-client', () => ({
  createQueryClient: () => new (jest.requireActual('@tanstack/react-query').QueryClient)(),
  installQueryEnvironment: () => () => {},
}))
jest.mock('expo-router', () => {
  const navigator = () =>
    Object.assign(
      jest.fn(() => null),
      { Screen: jest.fn(() => null), Protected: jest.fn(() => null) }
    )
  return {
    Tabs: navigator(),
    Stack: navigator(),
    ThemeProvider: ({ children }: { children: unknown }) => children,
    DarkTheme: { colors: {} },
    DefaultTheme: { colors: {} },
  }
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

type Navigator = jest.Mock & { Protected: unknown }

/** Every screen a navigator was last given, with whether its guard lets it through. */
function guards(navigator: 'Tabs' | 'Stack') {
  const mock = (jest.requireMock('expo-router') as Record<string, Navigator>)[navigator]
  const { children } = mock.mock.calls[mock.mock.calls.length - 1][0] as { children: ReactNode }
  const declared: [string, boolean][] = []
  Children.forEach(children, (child) => {
    if (!isValidElement<{ name?: string; guard?: boolean; children?: ReactNode }>(child)) return
    if (child.type === mock.Protected) {
      Children.forEach(child.props.children, (screen) => {
        const name = (screen as ReactElement<{ name: string }>).props.name
        declared.push([name, child.props.guard === true])
      })
    } else {
      declared.push([child.props.name as string, true])
    }
  })
  return declared
}

/** The tabs the navigator would mount now: every screen whose guard lets it through. */
const mountedTabs = () =>
  guards('Tabs')
    .filter(([, open]) => open)
    .map(([name]) => name)

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
    expect(mountedTabs()).toEqual(['index', 'news', 'wallet', 'validate', 'account'])

    const reload = pendingContext()
    await act(async () => notifySessionEvent('context-invalidated'))
    expect(mountedTabs()).toEqual(['index', 'news', 'wallet', 'validate', 'account'])

    await act(async () => reload.answer(partner(false)))
    expect(mountedTabs()).toEqual(['index', 'news', 'wallet', 'account'])
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
    expect(mountedTabs()).toEqual(['index', 'news', 'sign-in'])
  })
})

describe('private routes stacked above the tabs', () => {
  const ACCOUNT = [
    'carteira/apresentar',
    'carteira/historico',
    'carteira/comprovante/[code]',
    'conta/perfil',
    'conta/excluir',
    'conta/avaliacoes',
    'avaliar/[establishmentId]',
    'avaliar/editar/[id]',
  ]
  const VALIDATE = ['validar/confirmar']
  const HISTORY = ['validar/historico', 'validar/comprovante/[code]']

  /** Whether each group of private routes is open now, as `[account, validate, history]`. */
  function privateRoutes() {
    const declared = new Map(guards('Stack'))
    const group = (routes: string[]) => {
      const open = routes.map((route) => declared.get(route))
      // A route left out of its group is auto-registered, unprotected: fail on it.
      expect(open).not.toContain(undefined)
      return open.every(Boolean) ? true : open.some(Boolean) ? 'mixed' : false
    }
    return [group(ACCOUNT), group(VALIDATE), group(HISTORY)]
  }

  it('keeps every private route out until the context resolves, under the splash', async () => {
    session.readCredentials.mockReturnValue(new Promise(() => {}))
    await render(<RootLayout />)
    expect(privateRoutes()).toEqual([false, false, false])
    expect(new Map(guards('Stack')).get('estabelecimento/[city]/[slug]')).toBe(true)
    expect(jest.requireMock('expo-splash-screen').hideAsync).not.toHaveBeenCalled()
  })

  it('keeps a visitor out of every private route', async () => {
    session.readCredentials.mockResolvedValue(null)
    await render(<RootLayout />)
    expect(privateRoutes()).toEqual([false, false, false])
  })

  it.each([
    ['a consumer', {}, [true, false, false]],
    [
      'a partner who validates',
      { partner: { redemptions: { validate: true } } },
      [true, true, false],
    ],
    [
      'an analyst who reads the uses',
      { partner: { redemptions: { read: true } } },
      [true, false, true],
    ],
    [
      'a moderator with `partner.enabled` alone',
      { partner: { enabled: true, redemptions: { validate: false, read: false } } },
      [true, false, false],
    ],
  ])('opens to %s only what the context grants', async (_, capabilities, expected) => {
    me.getContext.mockResolvedValueOnce({ user: { id: 1 }, capabilities })
    await render(<RootLayout />)
    expect(privateRoutes()).toEqual(expected)
  })

  // A route whose guard turns false is dropped from the history, which takes the
  // person off the screen they were on.
  it('leaves open routes open through a revalidation and a failed reload; a decision closes them', async () => {
    me.getContext.mockResolvedValueOnce(partner(true))
    await render(<RootLayout />)
    expect(privateRoutes()).toEqual([true, true, true])

    const reload = pendingContext()
    await act(async () => notifySessionEvent('context-invalidated'))
    expect(privateRoutes()).toEqual([true, true, true])
    // The answer applies: the capability that went takes its route with it.
    await act(async () => reload.answer(partner(false)))
    expect(privateRoutes()).toEqual([true, false, true])

    // A reload that fails for want of a connection is not a change of person.
    const offline = pendingContext()
    await act(async () => notifySessionEvent('context-invalidated'))
    await act(async () => offline.fail(new TypeError('offline')))
    expect(privateRoutes()).toEqual([true, false, true])

    await act(async () => notifySessionEvent('expired'))
    expect(privateRoutes()).toEqual([false, false, false])
  })
})

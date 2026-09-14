import { act, render } from '@testing-library/react-native'
import { Text } from 'react-native'

import { notifySessionEvent } from '@/api/session-events'

import { SessionProvider, usePartnerAreas, useSession } from '../context'

jest.mock('@/api/session', () => ({
  readCredentials: jest.fn(),
  clearCredentials: jest.fn(),
  SessionExpiredError: class SessionExpiredError extends Error {},
}))
jest.mock('@/api/me', () => ({ getContext: jest.fn() }))
jest.mock('@/api/auth', () => ({ revokeSession: jest.fn() }))

const session = jest.requireMock('@/api/session') as {
  readCredentials: jest.Mock
  clearCredentials: jest.Mock
}
const me = jest.requireMock('@/api/me') as { getContext: jest.Mock }

function Probe() {
  const { status } = useSession()
  const { canValidate, canReadHistory } = usePartnerAreas()

  return (
    <>
      <Text>{`status:${status}`}</Text>
      <Text>{`validate:${canValidate}`}</Text>
      <Text>{`history:${canReadHistory}`}</Text>
    </>
  )
}

// RNTL 14 made `render` asynchronous; awaiting it is what returns the queries.
const renderProbe = () =>
  render(
    <SessionProvider>
      <Probe />
    </SessionProvider>
  )

const withContext = (capabilities: unknown) => {
  session.readCredentials.mockResolvedValue({
    accessToken: 'a',
    refreshToken: 'r',
    accessExpiresAt: Date.now() + 900_000,
  })
  me.getContext.mockResolvedValue({ user: { id: 1 }, capabilities })
}

beforeEach(() => jest.clearAllMocks())

/**
 * ADR-0023 §2: partner areas are composed from the specific redemption
 * capabilities, never from `partner.enabled`, and never before the server has
 * answered.
 */
describe('partner area composition', () => {
  it('shows nothing partner-shaped while the context is still loading', async () => {
    session.readCredentials.mockReturnValue(new Promise(() => {}))
    const view = await renderProbe()

    expect(view.getByText('status:loading')).toBeTruthy()
    expect(view.getByText('validate:false')).toBeTruthy()
    expect(view.getByText('history:false')).toBeTruthy()
  })

  it('grants each area from its own capability', async () => {
    withContext({ partner: { enabled: true, redemptions: { read: true, validate: true } } })
    const view = await renderProbe()

    expect(await view.findByText('status:authenticated')).toBeTruthy()
    expect(view.getByText('validate:true')).toBeTruthy()
    expect(view.getByText('history:true')).toBeTruthy()
  })

  it('separates reading history from validating', async () => {
    // An analyst reads the history and cannot confirm a use.
    withContext({ partner: { enabled: true, redemptions: { read: true, validate: false } } })
    const view = await renderProbe()

    expect(await view.findByText('status:authenticated')).toBeTruthy()
    expect(view.getByText('validate:false')).toBeTruthy()
    expect(view.getByText('history:true')).toBeTruthy()
  })

  it('refuses to derive partner areas from `enabled` alone', async () => {
    // A moderator without organization membership must not become a partner.
    withContext({ partner: { enabled: true, redemptions: { read: false, validate: false } } })
    const view = await renderProbe()

    expect(await view.findByText('status:authenticated')).toBeTruthy()
    expect(view.getByText('validate:false')).toBeTruthy()
    expect(view.getByText('history:false')).toBeTruthy()
  })

  it('keeps the credential when the context fails for a reason other than rejection', async () => {
    session.readCredentials.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      accessExpiresAt: Date.now() + 900_000,
    })
    me.getContext.mockRejectedValue(new Error('offline'))
    const view = await renderProbe()

    expect(await view.findByText('status:unavailable')).toBeTruthy()
    expect(session.clearCredentials).not.toHaveBeenCalled()
  })

  it('signs out only when the credential itself was rejected', async () => {
    const { SessionExpiredError } = jest.requireMock('@/api/session') as {
      SessionExpiredError: new () => Error
    }
    session.readCredentials.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      accessExpiresAt: Date.now() + 900_000,
    })
    me.getContext.mockRejectedValue(new SessionExpiredError())
    const view = await renderProbe()

    expect(await view.findByText('status:anonymous')).toBeTruthy()
    expect(session.clearCredentials).not.toHaveBeenCalled()
  })
})


describe('session events', () => {
  it('removes capabilities immediately on 403, coalesces reloads and applies fresh context', async () => {
    withContext({ partner: { redemptions: { validate: true, read: true } } })
    const view = await renderProbe()
    let finish!: (context: unknown) => void
    me.getContext.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    await act(async () => {
      notifySessionEvent('context-invalidated')
      notifySessionEvent('context-invalidated')
    })
    expect(view.getByText('validate:false')).toBeTruthy()
    expect(view.getByText('status:loading')).toBeTruthy()
    expect(me.getContext).toHaveBeenCalledTimes(2)
    await act(async () => finish({ user: { id: 1 }, capabilities: { partner: { redemptions: { validate: false, read: true } } } }))
    expect(view.getByText('status:authenticated')).toBeTruthy()
    expect(view.getByText('validate:false')).toBeTruthy()
    expect(view.getByText('history:true')).toBeTruthy()
    expect(session.clearCredentials).not.toHaveBeenCalled()
  })

  it('cannot restore stale context after a session expires while loading', async () => {
    withContext({})
    let finish!: (context: unknown) => void
    me.getContext.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    const view = await renderProbe()
    await act(async () => notifySessionEvent('expired'))
    await act(async () => finish({ user: { id: 1 }, capabilities: { partner: { redemptions: { validate: true } } } }))
    expect(view.getByText('status:anonymous')).toBeTruthy()
    expect(view.getByText('validate:false')).toBeTruthy()
  })

  it('invalidates an old context read during operation changes and reloads after completion', async () => {
    withContext({ partner: { redemptions: { validate: true } } })
    const view = await renderProbe()
    await act(async () => notifySessionEvent('operation-changing'))
    expect(view.getByText('status:loading')).toBeTruthy()
    expect(view.getByText('validate:false')).toBeTruthy()
    me.getContext.mockResolvedValue({ user: { id: 1 }, capabilities: {} })
    await act(async () => notifySessionEvent('operation-settled'))
    expect(view.getByText('status:authenticated')).toBeTruthy()
    expect(view.getByText('validate:false')).toBeTruthy()
  })

  it('keeps credentials but clears permissions if revalidation fails', async () => {
    withContext({ partner: { redemptions: { validate: true } } })
    const view = await renderProbe()
    me.getContext.mockRejectedValue(new TypeError('offline'))
    await act(async () => notifySessionEvent('context-invalidated'))
    expect(view.getByText('status:unavailable')).toBeTruthy()
    expect(view.getByText('validate:false')).toBeTruthy()
    expect(session.clearCredentials).not.toHaveBeenCalled()
  })

  it('unsubscribes on unmount', async () => {
    withContext({})
    const view = await renderProbe()
    await view.unmount()
    notifySessionEvent('context-invalidated')
    expect(me.getContext).toHaveBeenCalledTimes(1)
  })
})

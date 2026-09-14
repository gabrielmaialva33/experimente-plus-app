const mockStore = new Map<string, string>()
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: async (key: string) => mockStore.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { mockStore.set(key, value) },
  deleteItemAsync: async (key: string) => { mockStore.delete(key) },
}))
jest.mock('react-native-mmkv', () => ({ createMMKV: () => ({ getBoolean: () => true }) }))

import { act, fireEvent, render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { request } from '@/api/client'
import { clearCredentials, readCredentials, SessionExpiredError, writeCredentials } from '@/api/session'
import { SessionProvider, usePartnerAreas, useSession } from '../context'

const json = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status })
const context = (validate: boolean) => ({ user: { id: 1 }, capabilities: { partner: { redemptions: { validate } } } })
function Probe() {
  const { status, signOut, refresh } = useSession()
  const { canValidate } = usePartnerAreas()
  return <><Text>{`${status}:${canValidate}`}</Text><Text onPress={() => { void signOut() }}>Logout</Text><Text onPress={() => { void refresh() }}>Refresh</Text></>
}
const mount = () => render(<SessionProvider><Probe /></SessionProvider>)

beforeEach(async () => {
  await clearCredentials()
  await writeCredentials({ accessToken: 'access-0', refreshToken: 'refresh-0', accessExpiresAt: 900_000 })
})
afterEach(() => jest.restoreAllMocks())

it('propagates a real API 403 to capabilities without using the refresh token or replaying the action', async () => {
  let finish!: (value: Response) => void
  const fetchMock = jest.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(json(200, context(true)))
    .mockResolvedValueOnce(json(403))
    .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
  const view = await mount()
  expect(view.getByText('authenticated:true')).toBeTruthy()
  await act(async () => {
    await expect(request('/api/v1/benefit-redemptions', { method: 'POST', body: { token: 'private' }, authenticated: true }))
      .rejects.toMatchObject({ status: 403 })
  })
  expect(view.getByText('loading:false')).toBeTruthy()
  await act(async () => finish(json(200, context(false))))
  expect(view.getByText('authenticated:false')).toBeTruthy()
  expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
    '/api/v1/me/context', '/api/v1/benefit-redemptions', '/api/v1/me/context',
  ])
  await expect(readCredentials()).resolves.toMatchObject({ refreshToken: 'refresh-0' })
})

it('does not loop or erase credentials when the reloaded context also returns 403', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(json(200, context(true)))
    .mockImplementation(async () => json(403))
  const view = await mount()
  await act(async () => {
    await expect(request('/private', { authenticated: true })).rejects.toMatchObject({ status: 403 })
  })
  expect(view.getByText('unavailable:false')).toBeTruthy()
  expect(fetchMock).toHaveBeenCalledTimes(3)
  await expect(readCredentials()).resolves.toMatchObject({ refreshToken: 'refresh-0' })
})

it('moves an already mounted provider to anonymous after the only replay fails with 401', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(json(200, context(true)))
    .mockResolvedValueOnce(json(401))
    .mockResolvedValueOnce(json(200, { auth: {
      access_token: 'access-1', refresh_token: 'refresh-1', token_type: 'Bearer', expires_in: 900, refresh_expires_in: 259200,
    } }))
    .mockResolvedValueOnce(json(401))
  const view = await mount()
  await act(async () => {
    await expect(request('/private', { authenticated: true })).rejects.toBeInstanceOf(SessionExpiredError)
  })
  expect(view.getByText('anonymous:false')).toBeTruthy()
  expect(fetchMock).toHaveBeenCalledTimes(4)
  await expect(readCredentials()).resolves.toBeNull()
})

it('cannot restore capabilities from the previous operation during a concurrent forbidden response', async () => {
  const { switchTenant } = require('@/api/tenants') as typeof import('@/api/tenants')
  let finishSwitch!: (value: Response) => void
  let switchStarted!: () => void
  const started = new Promise<void>((resolve) => { switchStarted = resolve })
  let active = false
  let contextReads = 0
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    if (String(url).endsWith('/tenants/switch')) {
      switchStarted()
      return new Promise((resolve) => { finishSwitch = resolve })
    }
    if (String(url).endsWith('/me/context')) {
      contextReads += 1
      return json(200, context(!active))
    }
    return json(403)
  })
  const view = await mount()
  let switching!: Promise<unknown>
  await act(async () => {
    switching = switchTenant({ tenant_id: 7 })
    await started
    await expect(request('/private', { authenticated: true })).rejects.toMatchObject({ status: 403 })
  })
  const loadingDuringSwitch = view.queryByText('loading:false')
  const readsDuringSwitch = contextReads
  await act(async () => {
    active = true
    finishSwitch(json(200, { tenant: { id: 7 }, auth: {
      access_token: 'access-1', refresh_token: 'refresh-1', token_type: 'Bearer', expires_in: 900, refresh_expires_in: 259200,
    } }))
    await switching
  })
  expect(view.getByText('authenticated:false')).toBeTruthy()
  expect(loadingDuringSwitch).toBeTruthy()
  expect(readsDuringSwitch).toBe(1)
  expect(contextReads).toBe(2)
})

it('preserves a newer credential when a delayed context replay rejects the previous access token', async () => {
  const { refreshSession } = require('@/api/session') as typeof import('@/api/session')
  let finishReplay!: (value: Response) => void
  let replayStarted!: () => void
  const started = new Promise<void>((resolve) => { replayStarted = resolve })
  const pair = (suffix: string) => ({ auth: {
    access_token: `access-${suffix}`, refresh_token: `refresh-${suffix}`, token_type: 'Bearer', expires_in: 900, refresh_expires_in: 259200,
  } })
  jest.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(json(401))
    .mockResolvedValueOnce(json(200, pair('1')))
    .mockImplementationOnce(() => { replayStarted(); return new Promise((resolve) => { finishReplay = resolve }) })
    .mockResolvedValueOnce(json(200, pair('2')))
  const view = await mount()
  await started
  await refreshSession()
  await act(async () => finishReplay(json(401)))
  await expect(readCredentials()).resolves.toMatchObject({ refreshToken: 'refresh-2' })
  expect(view.getByText('unavailable:false')).toBeTruthy()
})


it.each(['403', 'refresh'])('does not restore capabilities after %s during logout', async (trigger) => {
  let finishLogout!: (value: Response) => void
  let logoutStarted!: () => void
  const started = new Promise<void>((resolve) => { logoutStarted = resolve })
  let reads = 0
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    if (String(url).endsWith('/logout')) {
      logoutStarted()
      return new Promise((resolve) => { finishLogout = resolve })
    }
    if (String(url).endsWith('/me/context')) { reads += 1; return json(200, context(true)) }
    return json(403)
  })
  const view = await mount()
  await fireEvent.press(view.getByText('Logout'))
  await started
  if (trigger === 'refresh') {
    await fireEvent.press(view.getByText('Refresh'))
  } else {
    await act(async () => {
      await expect(request('/private', { authenticated: true })).rejects.toMatchObject({ status: 403 })
    })
  }
  const loadingDuringLogout = view.queryByText('loading:false')
  const readsDuringLogout = reads
  await act(async () => finishLogout(new Response(null, { status: 204 })))
  expect(view.getByText('anonymous:false')).toBeTruthy()
  expect(loadingDuringLogout).toBeTruthy()
  expect(readsDuringLogout).toBe(1)
})

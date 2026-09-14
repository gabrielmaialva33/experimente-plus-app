const mockStore = new Map<string, string>()
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: async (key: string) => mockStore.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { mockStore.set(key, value) },
  deleteItemAsync: async (key: string) => { mockStore.delete(key) },
}))
jest.mock('react-native-mmkv', () => ({ createMMKV: () => ({ getBoolean: () => true }) }))

const auth = (suffix: string) => ({
  access_token: `access-${suffix}`, refresh_token: `refresh-${suffix}`,
  expires_in: 900, refresh_expires_in: 259200, token_type: 'Bearer',
})
const response = (status: number, body: unknown = {}, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers })
const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

beforeEach(() => {
  jest.resetModules()
  mockStore.clear()
  mockStore.set('ep.access_token', 'access-0')
  mockStore.set('ep.refresh_token', 'refresh-0')
})
afterEach(() => jest.restoreAllMocks())

it('does not rotate again for a late 401 sent with the already replaced access token', async () => {
  const { request } = require('../client') as typeof import('../client')
  const late = deferred<Response>()
  const started = deferred<void>()
  const refreshBodies: unknown[] = []
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    if (String(url).endsWith('/sessions/refresh')) {
      refreshBodies.push(JSON.parse(init!.body as string))
      return response(200, { auth: auth('1') })
    }
    if ((init?.headers as Record<string, string>).authorization === 'Bearer access-0') {
      if (String(url).endsWith('/late')) { started.resolve(); return late.promise }
      return response(401)
    }
    return response(200, { ok: true })
  })
  const pending = request('/late', { authenticated: true })
  await started.promise
  await request('/first', { authenticated: true })
  late.resolve(response(401))
  await expect(pending).resolves.toEqual({ ok: true })
  expect(refreshBodies).toEqual([{ refresh_token: 'refresh-0' }])
})

it('expires the session after the replay also returns 401', async () => {
  const { request } = require('../client') as typeof import('../client')
  const { readCredentials, SessionExpiredError } = require('../session') as typeof import('../session')
  const fetchMock = jest.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(response(401))
    .mockResolvedValueOnce(response(200, { auth: auth('1') }))
    .mockResolvedValueOnce(response(401))
  await expect(request('/private', { authenticated: true })).rejects.toBeInstanceOf(SessionExpiredError)
  expect(fetchMock).toHaveBeenCalledTimes(3)
  await expect(readCredentials()).resolves.toBeNull()
})

it('hides private 404 details and never logs server bodies or paths containing tokens', async () => {
  const { request } = require('../client') as typeof import('../client')
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(response(404, { owner: 'another-holder', tenant: 99 }))
  const error = await request('/private?token=secret', { authenticated: true }).catch((e) => e)
  expect(error).toBeInstanceOf(Error)
  expect((error as import('../client').ApiError).status).toBe(404)
  expect((error as import('../client').ApiError).body).toBeNull()
  expect(JSON.stringify(error)).not.toMatch(/another-holder|tenant|secret/)
  expect((error as Error).message).not.toContain('secret')
  expect(warn).not.toHaveBeenCalled()
})

it('retains 422 field/rule information without logging echoed private input', async () => {
  const { request } = require('../client') as typeof import('../client')
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  const body = { errors: [{ field: 'name', rule: 'required', message: 'private-input' }] }
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(response(422, body))
  await expect(request('/private', { authenticated: true })).rejects.toMatchObject({ status: 422, body })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(warn).not.toHaveBeenCalled()
})

it.each(['30', 'Mon, 14 Sep 2026 17:00:30 GMT'])('enforces Retry-After %s across new requests until the deadline', async (header) => {
  const { request } = require('../client') as typeof import('../client')
  const now = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-14T17:00:00Z'))
  const fetchMock = jest.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(response(429, {}, { 'Retry-After': header }))
    .mockResolvedValue(response(200, { ok: true }))
  await expect(request('/limited')).rejects.toMatchObject({ status: 429, retryAfterSeconds: 30 })
  now.mockReturnValue(Date.parse('2026-09-14T17:00:29Z'))
  await expect(request('/limited')).rejects.toMatchObject({ status: 429, retryAfterSeconds: 1 })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  now.mockReturnValue(Date.parse('2026-09-14T17:00:30Z'))
  await expect(request('/limited')).resolves.toEqual({ ok: true })
})

it.each([403, 422, 429])('preserves refresh HTTP %s as a nonretryable API error', async (status) => {
  const { request } = require('../client') as typeof import('../client')
  const fetchMock = jest.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(response(401))
    .mockResolvedValueOnce(response(status, {}, { 'Retry-After': '40' }))
  await expect(request('/private', { authenticated: true })).rejects.toMatchObject({
    status, retryAfterSeconds: status === 429 ? 40 : undefined,
  })
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(mockStore.get('ep.refresh_token')).toBe('refresh-0')
})

it('uses no-store for private presentation and validation requests, keeping the same token on manual retry', async () => {
  const { confirmRedemption } = require('../redemptions') as typeof import('../redemptions')
  const fetchMock = jest.spyOn(globalThis, 'fetch')
    .mockRejectedValueOnce(new TypeError('timeout'))
    .mockResolvedValueOnce(response(200, { receipt_code: 'original' }))
  await expect(confirmRedemption('same-nonce')).rejects.toThrow('timeout')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  await expect(confirmRedemption('same-nonce')).resolves.toEqual({ receipt_code: 'original' })
  for (const [, init] of fetchMock.mock.calls) {
    expect(init).toMatchObject({ cache: 'no-store', body: '{"token":"same-nonce"}' })
  }
})

it('coalesces concurrent refresh calls but executes creation and switch in the same serial queue', async () => {
  const { refreshSession, readCredentials } = require('../session') as typeof import('../session')
  const { createTenant, switchTenant } = require('../tenants') as typeof import('../tenants')
  const calls: { path: string; body: unknown; bearer: string; contentType: string }[] = []
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const headers = init?.headers as Record<string, string>
    calls.push({ path: new URL(String(url)).pathname, body: JSON.parse(init!.body as string),
      bearer: headers.authorization, contentType: headers['content-type'] })
    return response(200, { auth: auth(String(calls.length)), tenant: { id: calls.length } })
  })
  const results = await Promise.all([refreshSession(), refreshSession(), createTenant({ name: 'New' }), switchTenant({ tenant_id: 7 })])
  expect(calls).toEqual([
    { path: '/api/v1/sessions/refresh', body: { refresh_token: 'refresh-0' }, bearer: undefined, contentType: 'application/json' },
    { path: '/api/v1/tenants', body: { name: 'New', refresh_token: 'refresh-1' }, bearer: 'Bearer access-1', contentType: 'application/json' },
    { path: '/api/v1/tenants/switch', body: { tenant_id: 7, refresh_token: 'refresh-2' }, bearer: 'Bearer access-2', contentType: 'application/json' },
  ])
  expect(results[2]).toEqual({ id: 2 })
  expect(results[3]).toEqual({ id: 3 })
  await expect(readCredentials()).resolves.toMatchObject({ refreshToken: 'refresh-3' })
})

it.each([403, 422, 429])('keeps the current refresh on operation error %s and allows the next queued operation', async (status) => {
  const { createTenant, switchTenant } = require('../tenants') as typeof import('../tenants')
  const fetchMock = jest.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(response(status, {}, { 'Retry-After': '30' }))
    .mockResolvedValueOnce(response(200, { auth: auth('1'), tenant: { id: 7 } }))
  const failed = expect(createTenant({ name: 'Forbidden' })).rejects.toMatchObject({ status })
  const success = switchTenant({ tenant_id: 7 })
  await failed
  await success
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(JSON.parse(fetchMock.mock.calls[1][1]!.body as string)).toEqual({ tenant_id: 7, refresh_token: 'refresh-0' })
})

it('logout waits for refresh and revokes the child, leaving no resurrected session', async () => {
  const { refreshSession, readCredentials } = require('../session') as typeof import('../session')
  const { revokeSession } = require('../auth') as typeof import('../auth')
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
    String(url).endsWith('/refresh') ? response(200, { auth: auth('1') }) : new Response(null, { status: 204 }))
  await Promise.all([refreshSession(), revokeSession()])
  expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(init!.body as string))).toEqual([
    { refresh_token: 'refresh-0' }, { refresh_token: 'refresh-1' },
  ])
  await expect(readCredentials()).resolves.toBeNull()
})

it('logout rebuilds its JSON body after a 401 refresh instead of replaying the consumed token', async () => {
  const { revokeSession } = require('../auth') as typeof import('../auth')
  const fetchMock = jest.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(response(401))
    .mockResolvedValueOnce(response(200, { auth: auth('1') }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
  await revokeSession()
  const [, init] = fetchMock.mock.calls[2]
  expect(init).toMatchObject({ headers: { 'content-type': 'application/json', authorization: 'Bearer access-1' },
    body: '{"refresh_token":"refresh-1"}' })
})

it('signals a forbidden private action once without rotating, and never loops on context 403', async () => {
  const { request } = require('../client') as typeof import('../client')
  const { subscribeSessionEvents } = require('../session-events') as typeof import('../session-events')
  const events: string[] = []
  const unsubscribe = subscribeSessionEvents((event) => events.push(event))
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => response(403))
  try {
    await expect(request('/private-action', { authenticated: true })).rejects.toMatchObject({ status: 403 })
    expect(events).toEqual(['context-invalidated'])
    await expect(request('/api/v1/me/context', { authenticated: true })).rejects.toMatchObject({ status: 403 })
    expect(events).toEqual(['context-invalidated'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(mockStore.get('ep.refresh_token')).toBe('refresh-0')
  } finally { unsubscribe() }
})

it('refuses to contact a rate-limited refresh endpoint again before its Retry-After', async () => {
  const { refreshSession } = require('../session') as typeof import('../session')
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => response(429, {}, { 'Retry-After': '60' }))
  await expect(refreshSession()).rejects.toMatchObject({ status: 429 })
  await expect(refreshSession()).rejects.toMatchObject({ status: 429 })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(mockStore.get('ep.refresh_token')).toBe('refresh-0')
})

it('rebuilds an operation body after its one allowed refresh and persists only the final pair', async () => {
  const { switchTenant } = require('../tenants') as typeof import('../tenants')
  const fetchMock = jest.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(response(401))
    .mockResolvedValueOnce(response(200, { auth: auth('1') }))
    .mockResolvedValueOnce(response(200, { auth: auth('2'), tenant: { id: 7 } }))
  await expect(switchTenant({ tenant_id: 7 })).resolves.toEqual({ id: 7 })
  expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(init!.body as string))).toEqual([
    { tenant_id: 7, refresh_token: 'refresh-0' }, { refresh_token: 'refresh-0' },
    { tenant_id: 7, refresh_token: 'refresh-1' },
  ])
  expect(mockStore.get('ep.refresh_token')).toBe('refresh-2')
})

it.each([403, 422, 429])('keeps HTTP %s nonretryable even if reading its error body fails', async (status) => {
  const { request } = require('../client') as typeof import('../client')
  const result = response(status, {}, { 'Retry-After': '30' })
  jest.spyOn(result, 'text').mockRejectedValue(new TypeError('connection lost'))
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(result)
  await expect(request('/failed-body', { authenticated: true })).rejects.toMatchObject({
    status, body: null, retryAfterSeconds: status === 429 ? 30 : undefined,
  })
})

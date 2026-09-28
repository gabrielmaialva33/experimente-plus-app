import type { SignUpRequest, SignUpResponse } from '../auth'
import { apiUrl } from '../config'

const mockStore = new Map<string, string>()
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value)
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStore.delete(key)
  }),
}))
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({ getBoolean: () => true, set: jest.fn() }),
}))

let signUp: typeof import('../auth').signUp
let signIn: typeof import('../auth').signIn

const body: SignUpRequest = {
  full_name: 'Ana Silva',
  email: 'ana@example.com',
  username: null,
  password: 'test-password',
  password_confirmation: 'test-password',
  terms_accepted: true,
}
const response: SignUpResponse = {
  id: 1,
  full_name: 'Ana Silva',
  email: 'ana@example.com',
  username: null,
  email_verified: false,
  email_verified_at: null,
  email_verification_sent: false,
  created_at: '2026-09-11T00:00:00Z',
  updated_at: null,
  roles: [],
  auth: {
    access_token: 'test-access',
    refresh_token: 'test-refresh',
    token_type: 'Bearer',
    expires_in: 900,
    refresh_expires_in: 259200,
  },
}

beforeEach(() => {
  jest.resetModules()
  mockStore.clear()
  jest.clearAllMocks()
  signUp = require('../auth').signUp
  signIn = require('../auth').signIn
})
afterEach(() => jest.restoreAllMocks())

it('POSTs the generated request publicly and stores the issued credential pair on 201', async () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(1000)
  const fetchMock = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(response), { status: 201 }))
  expect(await signUp(body)).toEqual(response)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    apiUrl('/api/v1/sessions/sign-up'),
    expect.objectContaining({ method: 'POST', body: JSON.stringify(body) })
  )
  expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty('authorization')
  expect(mockStore.get('ep.access_token')).toBe('test-access')
  expect(mockStore.get('ep.refresh_token')).toBe('test-refresh')
  expect(mockStore.get('ep.access_expires_at')).toBe('901000')
  expect(mockStore.size).toBe(3)
  now.mockRestore()
})

it.each([400, 422, 429])(
  'surfaces %s without replaying, persisting credentials or logging response details',
  async (status) => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [{ field: 'password', rule: 'minLength', message: 'test-private-response' }],
        }),
        {
          status,
          headers: { 'Retry-After': '30', 'X-RateLimit-Limit': '5', 'X-RateLimit-Remaining': '0' },
        }
      )
    )
    await expect(signUp(body)).rejects.toMatchObject({
      status,
      retryAfterSeconds: status === 429 ? 30 : undefined,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(mockStore.size).toBe(0)
    expect(warn).not.toHaveBeenCalled()
  }
)

it('does not retry or store credentials after a network failure', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
  await expect(signUp(body)).rejects.toThrow('offline')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(mockStore.size).toBe(0)
})

describe('a pair the device still held', () => {
  const signedIn = {
    id: 1,
    full_name: 'Ana Silva',
    email: 'ana@example.com',
    username: null,
    auth: response.auth,
  }
  const holdPreviousPair = () => {
    mockStore.set('ep.access_token', 'old-access')
    mockStore.set('ep.refresh_token', 'old-refresh')
    mockStore.set('ep.access_expires_at', '1')
  }
  const call = (fetchMock: jest.SpyInstance, index: number) => {
    const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit]
    return { url, init, headers: init.headers as Record<string, string> }
  }

  // Signing in from the notice of a session that could not load overwrote the
  // stored pair and left its refresh token valid for its whole lifetime.
  it('is revoked once a sign-in replaces it, with nothing of the new pair and without waiting', async () => {
    holdPreviousPair()
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(signedIn), { status: 200 }))
      // The revocation never answers: the new session does not wait for it.
      .mockImplementationOnce(() => new Promise(() => {}))

    await expect(signIn('ana', 'test-password')).resolves.toMatchObject({ id: 1 })

    expect(mockStore.get('ep.access_token')).toBe('test-access')
    expect(mockStore.get('ep.refresh_token')).toBe('test-refresh')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const revoke = call(fetchMock, 1)
    expect(revoke.url).toBe(apiUrl('/api/v1/sessions/logout'))
    expect(revoke.init.method).toBe('POST')
    expect(revoke.init.body).toBe(JSON.stringify({ refresh_token: 'old-refresh' }))
    expect(revoke.headers).not.toHaveProperty('authorization')
    expect(JSON.stringify(revoke.init)).not.toMatch(/test-access|test-refresh/)
  })

  it('does not hold up or fail the sign-in when the revocation fails', async () => {
    holdPreviousPair()
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(signedIn), { status: 200 }))
      .mockRejectedValueOnce(new TypeError('offline'))

    await expect(signIn('ana', 'test-password')).resolves.toMatchObject({ id: 1 })
    expect(mockStore.get('ep.refresh_token')).toBe('test-refresh')
  })

  it('is kept, and nothing is revoked, when the sign-in is refused', async () => {
    holdPreviousPair()
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ errors: [] }), { status: 400 }))

    await expect(signIn('ana', 'wrong-password')).rejects.toMatchObject({ status: 400 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(mockStore.get('ep.refresh_token')).toBe('old-refresh')
  })

  it('is revoked when a registration replaces it too', async () => {
    holdPreviousPair()
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(response), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await signUp(body)

    expect(mockStore.get('ep.refresh_token')).toBe('test-refresh')
    expect(call(fetchMock, 1).url).toBe(apiUrl('/api/v1/sessions/logout'))
    expect(call(fetchMock, 1).init.body).toBe(JSON.stringify({ refresh_token: 'old-refresh' }))
  })

  it('does not fail the sign-in when the stored pair cannot be read to revoke it', async () => {
    const SecureStore = jest.requireMock('expo-secure-store') as { getItemAsync: jest.Mock }
    SecureStore.getItemAsync.mockRejectedValueOnce(new Error('keychain locked'))
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(signedIn), { status: 200 }))

    await expect(signIn('ana', 'test-password')).resolves.toMatchObject({ id: 1 })
    expect(mockStore.get('ep.refresh_token')).toBe('test-refresh')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('leaves nothing to revoke when the device held no pair', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(signedIn), { status: 200 }))

    await signIn('ana', 'test-password')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

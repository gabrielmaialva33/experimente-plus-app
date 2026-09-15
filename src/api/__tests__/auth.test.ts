import type { SignUpRequest, SignUpResponse } from '../auth'
import { apiUrl } from '../config'

const mockStore = new Map<string, string>()
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => { mockStore.set(key, value) }),
  deleteItemAsync: jest.fn(async (key: string) => { mockStore.delete(key) }),
}))
jest.mock('react-native-mmkv', () => ({ createMMKV: () => ({ getBoolean: () => true, set: jest.fn() }) }))

let signUp: typeof import('../auth').signUp

const body: SignUpRequest = {
  full_name: 'Ana Silva', email: 'ana@example.com', username: null,
  password: 'test-password', password_confirmation: 'test-password', terms_accepted: true,
}
const response: SignUpResponse = {
  id: 1, full_name: 'Ana Silva', email: 'ana@example.com', username: null,
  email_verified: false, email_verified_at: null, email_verification_sent: false,
  created_at: '2026-09-11T00:00:00Z', updated_at: null, roles: [],
  auth: { access_token: 'test-access', refresh_token: 'test-refresh', token_type: 'Bearer', expires_in: 900, refresh_expires_in: 259200 },
}

beforeEach(() => {
  jest.resetModules()
  mockStore.clear()
  jest.clearAllMocks()
  signUp = require('../auth').signUp
})
afterEach(() => jest.restoreAllMocks())

it('POSTs the generated request publicly and stores the issued credential pair on 201', async () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(1000)
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(response), { status: 201 }))
  expect(await signUp(body)).toEqual(response)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(apiUrl('/api/v1/sessions/sign-up'), expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }))
  expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty('authorization')
  expect(mockStore.get('ep.access_token')).toBe('test-access')
  expect(mockStore.get('ep.refresh_token')).toBe('test-refresh')
  expect(mockStore.get('ep.access_expires_at')).toBe('901000')
  expect(mockStore.size).toBe(3)
  now.mockRestore()
})

it.each([400, 422, 429])('surfaces %s without replaying, persisting credentials or logging response details', async (status) => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
    errors: [{ field: 'password', rule: 'minLength', message: 'test-private-response' }],
  }), { status, headers: { 'Retry-After': '30', 'X-RateLimit-Limit': '5', 'X-RateLimit-Remaining': '0' } }))
  await expect(signUp(body)).rejects.toMatchObject({ status, retryAfterSeconds: status === 429 ? 30 : undefined })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(mockStore.size).toBe(0)
  expect(warn).not.toHaveBeenCalled()
})

it('does not retry or store credentials after a network failure', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
  await expect(signUp(body)).rejects.toThrow('offline')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(mockStore.size).toBe(0)
})

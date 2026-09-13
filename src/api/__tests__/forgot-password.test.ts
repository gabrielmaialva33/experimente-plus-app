import { forgotPassword, type ForgotPasswordRequest, type ForgotPasswordResponse } from '../auth'
import { apiUrl } from '../config'

jest.mock('../session', () => ({
  readCredentials: jest.fn(), writeCredentials: jest.fn(), clearCredentials: jest.fn(),
  credentialsFromPayload: jest.fn(), refreshSession: jest.fn(),
}))

beforeEach(() => jest.clearAllMocks())
afterEach(() => jest.restoreAllMocks())

it('makes only the public request and returns the neutral 202 receipt without touching credentials', async () => {
  const body: ForgotPasswordRequest = { email: 'person@example.com' }
  const response: ForgotPasswordResponse = { message: 'If an account exists for that email, a password reset link has been sent.' }
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(response), { status: 202 }))
  expect(await forgotPassword(body)).toEqual(response)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(apiUrl('/api/v1/sessions/forgot-password'), expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }))
  expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty('authorization')
  for (const method of Object.values(jest.requireMock('../session'))) expect(method).not.toHaveBeenCalled()
})

it.each([400, 422, 429])('surfaces %s without logging sensitive details, replaying or changing credentials', async (status) => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
    errors: [{ field: 'email', message: 'test-private-detail' }],
  }), { status, headers: { 'Retry-After': '25', 'X-RateLimit-Limit': '5', 'X-RateLimit-Remaining': '0' } }))
  await expect(forgotPassword({ email: 'person@example.com' })).rejects.toMatchObject({ status, retryAfterSeconds: status === 429 ? 25 : undefined })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(warn).not.toHaveBeenCalled()
  for (const method of Object.values(jest.requireMock('../session'))) expect(method).not.toHaveBeenCalled()
})

it('does not retry a network failure', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
  await expect(forgotPassword({ email: 'person@example.com' })).rejects.toThrow('offline')
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

import { askAssistant } from '@/api/concierge'

jest.mock('@/api/session', () => ({
  readCredentials: jest.fn(),
  SessionExpiredError: class SessionExpiredError extends Error {},
}))
jest.mock('@/api/client', () => ({ request: jest.fn() }))
jest.mock('@/api/public', () => ({ publicRequest: jest.fn() }))

const session = jest.requireMock('@/api/session') as {
  readCredentials: jest.Mock
  SessionExpiredError: new () => Error
}
const client = jest.requireMock('@/api/client') as { request: jest.Mock }
const publicApi = jest.requireMock('@/api/public') as { publicRequest: jest.Mock }

const question = { question: 'Onde passar a tarde?', city: 'londrina' }

beforeEach(() => {
  jest.clearAllMocks()
  client.request.mockResolvedValue({ personalized: true })
  publicApi.publicRequest.mockResolvedValue({ personalized: false })
})

it('takes the public route without credentials, never the personal one', async () => {
  session.readCredentials.mockResolvedValue(null)

  await askAssistant(question)

  expect(publicApi.publicRequest).toHaveBeenCalledWith(
    '/api/v1/catalog/concierge',
    expect.objectContaining({ method: 'POST', body: question })
  )
  expect(client.request).not.toHaveBeenCalled()
})

it('takes the personal route with credentials', async () => {
  session.readCredentials.mockResolvedValue({ accessToken: 'token' })

  const result = await askAssistant(question)

  expect(client.request).toHaveBeenCalledWith(
    '/api/v1/me/concierge',
    expect.objectContaining({ method: 'POST', authenticated: true, body: question })
  )
  expect(result).toEqual({ personalized: true })
})

it('falls back to the public route when the session has expired', async () => {
  session.readCredentials.mockResolvedValue({ accessToken: 'stale' })
  client.request.mockRejectedValue(new session.SessionExpiredError())

  const result = await askAssistant(question)

  expect(publicApi.publicRequest).toHaveBeenCalled()
  expect(result).toEqual({ personalized: false })
})

import type { CreatePurchaseRequest } from '@/api/purchases'
import { createPurchase, listPurchaseEditions } from '../purchases'

jest.mock('../session', () => ({
  readCredentials: jest.fn(async () => ({ accessToken: 'initial' })),
  refreshSession: jest.fn(async () => ({ accessToken: 'renewed' })),
}))

afterEach(() => jest.restoreAllMocks())

it('replays the exact same purchase body and idempotency key after one 401 refresh', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response('{}', { status: 401 }))
    .mockResolvedValueOnce(new Response('{"id":"98b8ff53-9cd5-4a48-9f32-731a11cbe7f1"}', { status: 202 }))
  const body: CreatePurchaseRequest = { edition_id: 1, offer_id: 3, amount_cents: 1490, terms_version: 'b'.repeat(64), method: 'pix' }
  expect(await createPurchase(body, 'stable-intention-123')).toEqual({ id: '98b8ff53-9cd5-4a48-9f32-731a11cbe7f1' })
  expect(fetchMock).toHaveBeenCalledTimes(2)
  for (const [, options] of fetchMock.mock.calls) {
    expect(options?.headers).toMatchObject({ 'Idempotency-Key': 'stable-intention-123' })
    expect(options?.body).toBe(JSON.stringify(body))
  }
  expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ authorization: 'Bearer renewed' })
})

it('does not retry a purchase rule failure or log the financial response', async () => {
  const log = jest.spyOn(console, 'warn').mockImplementation(() => {})
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"private":"financial detail"}', { status: 422 }))
  await expect(createPurchase({ edition_id: 1, amount_cents: 1, terms_version: 'a'.repeat(64), method: 'pix' }, 'stable-intention-123')).rejects.toMatchObject({ status: 422 })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(log).not.toHaveBeenCalled()
})

it('reads the public empty catalog without credentials, authorization or a tenant parameter', async () => {
  const session = jest.requireMock('../session') as { readCredentials: jest.Mock; refreshSession: jest.Mock }
  session.readCredentials.mockClear()
  session.refreshSession.mockClear()
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"products":[],"editions":[],"offers":[]}', { status: 200 }))
  expect(await listPurchaseEditions()).toEqual({ products: [], editions: [], offers: [] })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [url, options] = fetchMock.mock.calls[0]
  expect(String(url)).toMatch(/\/api\/v1\/catalog\/benefit-editions$/)
  expect(options?.headers).not.toHaveProperty('authorization')
  expect(options?.headers).not.toHaveProperty('X-Tenant-Id')
  expect(session.readCredentials).not.toHaveBeenCalled()
  expect(session.refreshSession).not.toHaveBeenCalled()
})

import { cancelPurchase } from '@/purchases/cancel'

jest.mock('@/api/client', () => ({ request: jest.fn(async () => ({ id: 'order-1' })) }))

const client = jest.requireMock('@/api/client') as { request: jest.Mock }

it('cancels through the existing endpoint with one idempotency key per order', async () => {
  const id = '98b8ff53-9cd5-4a48-9f32-731a11cbe7f1'
  await cancelPurchase(id)
  await cancelPurchase(id)
  expect(client.request).toHaveBeenCalledTimes(2)
  for (const [path, options] of client.request.mock.calls) {
    expect(path).toBe(`/api/v1/me/purchases/${id}/cancel`)
    expect(options).toEqual({ method: 'POST', authenticated: true, sensitive: true, body: {}, idempotencyKey: `cancel_${id}` })
    // The server accepts 16 to 128 characters of [A-Za-z0-9_-].
    expect(options.idempotencyKey).toMatch(/^[A-Za-z0-9_-]{16,128}$/)
  }
})

import { request } from '@/api/client'
import type { CreatePurchaseResponse } from '@/api/purchases'

/**
 * Asks the server to cancel an order that was not paid. Cancelling one order is
 * one intention, so its key derives from the order: a repeated tap or a replay
 * returns the original answer instead of a second request. The server refuses
 * a paid order (that needs a refund) and the state is always read back by GET.
 */
export const cancelPurchase = (id: string) =>
  request<CreatePurchaseResponse>(`/api/v1/me/purchases/${encodeURIComponent(id)}/cancel`, {
    method: 'POST', authenticated: true, sensitive: true, body: {}, idempotencyKey: `cancel_${id}`,
  })

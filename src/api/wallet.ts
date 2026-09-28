import { request } from './client'
import type { History, Presentation, Receipt, Wallet } from '@/wallet/types'

/** Private surface: every response carries `private, no-store` upstream. */
export const getWallet = (signal?: AbortSignal) =>
  request<Wallet>('/api/v1/me/wallet', { authenticated: true, sensitive: true, signal })

export const createPresentation = (accessId: number, offerId: number, signal?: AbortSignal) =>
  request<Presentation>('/api/v1/me/benefits/presentations', {
    method: 'POST',
    signal,
    authenticated: true,
    sensitive: true,
    body: { access_id: accessId, offer_id: offerId },
  })

export const listMyRedemptions = () =>
  request<History>('/api/v1/me/benefits/redemptions', { authenticated: true })

/** The code comes from the route, so from a link: it stays one path segment. */
export const getMyReceipt = (receiptCode: string) =>
  request<Receipt>(`/api/v1/me/benefits/redemptions/${encodeURIComponent(receiptCode)}`, {
    authenticated: true,
  })

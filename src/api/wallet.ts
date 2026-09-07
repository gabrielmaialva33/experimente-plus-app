import { request } from './client'
import type { History, Presentation, Receipt, Wallet } from '@/wallet/types'

/** Private surface: every response carries `private, no-store` upstream. */
export const getWallet = () => request<Wallet>('/api/v1/me/wallet', { authenticated: true, sensitive: true })

export const createPresentation = (accessId: number, offerId: number) =>
  request<Presentation>('/api/v1/me/benefits/presentations', {
    method: 'POST',
    authenticated: true,
    sensitive: true,
    body: { access_id: accessId, offer_id: offerId },
  })

export const listMyRedemptions = () =>
  request<History>('/api/v1/me/benefits/redemptions', { authenticated: true })

export const getMyReceipt = (receiptCode: string) =>
  request<Receipt>(`/api/v1/me/benefits/redemptions/${receiptCode}`, { authenticated: true })

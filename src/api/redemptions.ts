import { request } from './client'
import type { History, Preview, Receipt } from '@/wallet/types'

/**
 * Partner validation.
 *
 * Preview and confirmation are separate calls on purpose: the server
 * re-evaluates tenant, ownership, state, schedule, limit and organization
 * capability on both, and confirmation requires explicit human intent
 * (ADR-0021). A preview never redeems.
 */
export const previewRedemption = (token: string) =>
  request<Preview>('/api/v1/benefit-redemptions/preview', {
    method: 'POST',
    authenticated: true,
    body: { token },
  })

/**
 * Confirms the use. Repeating this with the same token after an ambiguous
 * network response returns the original receipt instead of creating a second
 * redemption, so a retry is safe.
 */
export const confirmRedemption = (token: string) =>
  request<Receipt>('/api/v1/benefit-redemptions', {
    method: 'POST',
    authenticated: true,
    body: { token },
  })

export const getPartnerReceipt = (receiptCode: string) =>
  request<Receipt>(`/api/v1/benefit-redemptions/${receiptCode}`, { authenticated: true })

export const listPartnerRedemptions = () =>
  request<History>('/api/v1/benefit-redemptions', { authenticated: true })

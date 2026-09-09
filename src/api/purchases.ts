import { request } from './client'
import type { components } from './schema'

export type PurchaseSnapshot = components['schemas']['PurchaseSnapshot']
export type PaymentMethod = components['schemas']['PaymentMethod']
export type PurchaseEdition = components['schemas']['PurchasableEdition']
export type Purchase = components['schemas']['Purchase']
export type CreatePurchaseRequest = components['schemas']['PurchaseRequest']
export type PurchaseCatalogResponse = components['schemas']['PurchaseCatalog']
export type PurchaseProduct = PurchaseCatalogResponse['products'][number]
export type PurchaseListResponse = components['schemas']['PurchaseList']
export type CreatePurchaseResponse = components['schemas']['PurchaseAccepted']
export type PurchaseStatus = Purchase['status']
export type PaymentInstructions = NonNullable<Purchase['instructions']>

export const listPurchaseEditions = () =>
  request<PurchaseCatalogResponse>('/api/v1/catalog/benefit-editions', { sensitive: true })

export const listPurchases = () =>
  request<PurchaseListResponse>('/api/v1/me/purchases', { authenticated: true, sensitive: true })

export const getPurchase = (id: string) =>
  request<Purchase>(`/api/v1/me/purchases/${encodeURIComponent(id)}`, { authenticated: true, sensitive: true })

export const createPurchase = (body: CreatePurchaseRequest, idempotencyKey: string) =>
  request<CreatePurchaseResponse>('/api/v1/me/purchases', {
    method: 'POST', authenticated: true, sensitive: true, body, idempotencyKey,
  })

/** Provider-specific names stay here; the UI uses neutral copy and server data. */
export const paymentInstructions = (order: Purchase) => ({
  url: order.instructions?.pix_url ?? null,
  code: order.instructions?.pix_code ?? null,
})

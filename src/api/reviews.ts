import { request } from './client'
import type { components } from './schema'

/**
 * Reviews (ADR-0027).
 *
 * The public listing needs no session and resolves the operation from the base
 * URL's hostname, like the rest of discovery. Writing needs one, and the tenant
 * comes from the credential — the app never chooses an operation.
 */

type Schemas = components['schemas']

export type Review = Schemas['EstablishmentReview']
export type ReviewAuthor = Schemas['ReviewAuthor']
export type ReviewReply = Schemas['EstablishmentReviewReply']
export type PaginatedReviews = Schemas['PaginatedReviewsResponse']
export type CreateReview = Schemas['CreateReviewRequest']
export type UpdateReview = Schemas['UpdateReviewRequest']
export type ReportReason = Schemas['CreateReportRequest']['reason']
export type ReportTargetType = Schemas['CreateReportRequest']['target_type']

export interface ReviewPage {
  page?: number
  perPage?: number
  /** Narrows to a single star count; the listing is always newest first. */
  rating?: number
}

const query = (params: ReviewPage): string => {
  const search = new URLSearchParams()
  if (params.page && params.page !== 1) search.set('page', String(params.page))
  if (params.perPage) search.set('per_page', String(params.perPage))
  if (params.rating) search.set('rating', String(params.rating))
  const serialized = search.toString()
  return serialized ? `?${serialized}` : ''
}

export const listEstablishmentReviews = (establishmentId: number, params: ReviewPage = {}) =>
  request<PaginatedReviews>(
    `/api/v1/catalog/establishments/${establishmentId}/reviews${query(params)}`
  )

export const listMyReviews = (params: ReviewPage = {}) =>
  request<PaginatedReviews>(`/api/v1/me/reviews${query(params)}`, { authenticated: true })

export const createReview = (body: CreateReview) =>
  request<Review>('/api/v1/me/reviews', { method: 'POST', authenticated: true, body })

export const updateReview = (id: number, body: UpdateReview) =>
  request<Review>(`/api/v1/me/reviews/${id}`, { method: 'PUT', authenticated: true, body })

export const deleteReview = (id: number) =>
  request<void>(`/api/v1/me/reviews/${id}`, { method: 'DELETE', authenticated: true })

/**
 * A report is a private act. It is sent authenticated and its response carries
 * the protocol the person quotes to follow the case up.
 */
export const reportContent = (body: {
  target_type: ReportTargetType
  target_id: number
  reason: ReportReason
  details?: string
}) =>
  request<Schemas['ContentReport']>('/api/v1/content-reports', {
    method: 'POST',
    authenticated: true,
    sensitive: true,
    body,
  })
